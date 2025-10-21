import { Request, Response, NextFunction } from "express";
import { validatePickupRequest } from "../validation/pickupRequestValidator";
import {
    PickupRequestCreationResult,
    PickupRequestRequest,
    PickupRequestCreateResponse,
    PickupRequestGetEntity,
    ItemRequest,
} from "../types/PickupRequest";
import { calculateDeliveryCost } from "../services/DeliveryCostCalculatorService";
import { findAllPickupRequests, findPickupRequestById, findPickupRequestsByCompanyName, savePickupRequest } from "../models/pickupRequestRepository";
import catchAsync from "../utils/errorHandlingMiddleware/catchAsync";
import AppError from "../utils/errorHandlingMiddleware/appError";
import { simulatedClock } from "../utils";
import { PickupRequestCompletionStatus } from "../enums";
import { ItemDefinitionWithName } from "../types";
import { getItemDefinitions } from "../models/pickupRequestItemRepository";
import { thohApiClient } from "../client/thohClient";
import { getMachines, updateMachineWeights } from "../models/itemDefinitionRepository";

export const createPickupRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const pickupRequestDetails: PickupRequestRequest = req.body;
    // Check if we already have the weights in the database.
    let machineWeightsInDb = await getMachines();
    // If we don't have the weights, we need to get them from the hand and update our DB.
    if (machineWeightsInDb[0].weight_per_unit === 0) {
        try {
            console.log("fetching the machines and updating the DB");
            const getMachineDetailsResponse = await thohApiClient.getMachinesInformation();
            await updateMachineWeights(getMachineDetailsResponse.machines);
            machineWeightsInDb = await getMachines();
            console.log("Machine weights have been updated and re-fetched.");
        } catch (error: any) {
            console.error("Issue getting the machine information from thoh OR the db select failed", error);
            return next(new AppError(
                `Failed to retrieve machine weight information from THOH. Cannot process pickup request. Error: ${error.message || error}`,
                503
            ));
        }
    }
    // Then we do a young validation here to make sure they're ordering legitimate things.
    try {
        await validatePickupRequest(pickupRequestDetails);
    } catch (validationError: any) {
        return next(new AppError(`Invalid input data: ${validationError.message}`, 400));
    }

    let newItems: ItemRequest[] = [];
    // Lets get all the items in the db.
    const itemDefinition: ItemDefinitionWithName[] = await getItemDefinitions();

    // These are the machines that we are expecting to get in counts/units. The requests will look like this:
    // {
    //  "itemName": "screen_machine",
    //  "quantity": "20"
    // }
    const machinesWithCount = ["screen_machine", "recyling_machine", "ephone_machine", "ephone_plus_machine", "ephone_pro_max_machine"];

    // These are the machines that we are expecting to get in KGs but the machines are not separate items. The requests will look like this:
    // {
    //  "itemName": "screen_machine",
    //  "quantity": "7500"     for a machine that weights 2500 for example, this is 3 machines.
    // }

    const machinesWithGroupedKg = ["case_machine"];

    console.log("~~~~~~~~~~~~~~~~~~~~~~~ Pickup Request ~~~~~~~~~~~~~~~~~~~~~~~");
    console.log(JSON.stringify(pickupRequestDetails.items, null, 2));
    pickupRequestDetails.items.forEach((item) => {
        //
        // For machines we expect units, convert them to their KG counterpart.
        //
        const itemMeasurementType: "KG" | "UNIT" = itemDefinition.find((i) => i.item_name == item.itemName)!.capacity_type_name as "KG" | "UNIT";
        if (machinesWithCount.includes(item.itemName)) {
            const currentMachinesWeight = machineWeightsInDb.find((machine) => machine.item_name === item.itemName).weight_per_unit;
            console.log(currentMachinesWeight);
            for (let i = 0; i < item.quantity; i++) {
                newItems.push({
                    itemName: item.itemName,
                    quantity: currentMachinesWeight,
                    measurementType: itemMeasurementType,
                });
            }
        }
        //
        // For the machines we are expecting GROUPED KG. IE A case machine is 250 kg, a PR for 3 machines with look like this:
        //
        // {
        // "itemName": "case_machine",
        // "quantity": "750kg"
        // }
        //
        else if (machinesWithGroupedKg.includes(item.itemName)) {
            const currentMachinesWeight = machineWeightsInDb.find((machine) => machine.item_name === item.itemName).weight_per_unit;
            const numberOfIndividualMachines = Math.floor(item.quantity / currentMachinesWeight);
            for (let i = 0; i < numberOfIndividualMachines; i++) {
                newItems.push({
                    itemName: item.itemName,
                    quantity: currentMachinesWeight,
                    measurementType: itemMeasurementType,
                });
            }
        }
        //
        // Otherwise, we will partition items regularly to cater for max vehicle sizes.
        //
        else {
            const itemMaxCapacity = itemMeasurementType === "KG" ? 5000 : 2000;
            if (item.quantity > itemMaxCapacity) {
                const fullTrucks = Math.floor(item.quantity / itemMaxCapacity);
                for (let i = 0; i < fullTrucks; i++) {
                    newItems.push({
                        itemName: item.itemName,
                        quantity: itemMaxCapacity,
                    });
                }
                const remainderQuantity = item.quantity - fullTrucks * itemMaxCapacity;
                newItems.push({
                    itemName: item.itemName,
                    quantity: remainderQuantity,
                });
            } else {
                newItems.push({ ...item, measurementType: itemMeasurementType });
            }
        }
    });
    const partitionedPickupRequestDetails = { ...pickupRequestDetails, items: newItems };
    const cost = await calculateDeliveryCost(partitionedPickupRequestDetails);

    console.log("~~~~~~~~~~~~~~~~~~~~~~~ Cost Calculation Done ~~~~~~~~~~~~~~~~~~~~~~~");
    console.log("Cost: ", cost);

    const result: PickupRequestCreationResult = await savePickupRequest({
        ...partitionedPickupRequestDetails,
        requestingCompany: partitionedPickupRequestDetails.destinationCompany,
        cost: cost,
        requestDate: simulatedClock.getCurrentDate(),
    });

    res.status(201).json({
        pickupRequestId: result.pickupRequestId,
        cost: result.cost,
        paymentReferenceId: result.paymentReferenceId,
        accountNumber: result.bulkLogisticsBankAccountNumber,
        status: PickupRequestCompletionStatus.PendingPayment,
        statusCheckUrl: `/pickup-requests/${result.pickupRequestId}`,
    } as PickupRequestCreateResponse);
});

export const getPickupRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const pickupRequest = await findPickupRequestById(id);

    if (!pickupRequest) {
        return next(new AppError("No pickup request found with that ID", 404));
    }

    let status: string;
    if (pickupRequest.completionDate) {
        status = PickupRequestCompletionStatus.Delivered;
    } else if (pickupRequest.paymentStatus === "CONFIRMED") {
        status = PickupRequestCompletionStatus.PendingDelivery;
    } else {
        status = PickupRequestCompletionStatus.PendingPayment;
    }

    res.status(200).json({
        pickupRequestId: pickupRequest.pickupRequestId,
        cost: pickupRequest.cost,
        status: status,
        originCompanyName: pickupRequest.originCompanyName,
        originalExternalOrderId: pickupRequest.originalExternalOrderId,
        requestDate: pickupRequest.requestDate,
        items: pickupRequest.items,
    } as PickupRequestGetEntity);
});

export const getPickupRequestsByCompany = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { companyName } = req.params;

    const pickupRequests: PickupRequestGetEntity[] | null = await findPickupRequestsByCompanyName(companyName);

    let pickupRequestsResponse: PickupRequestGetEntity[] = [];
    pickupRequests?.forEach((pickupRequest) => {
        let status: string;
        if (pickupRequest.completionDate) {
            status = PickupRequestCompletionStatus.Delivered;
        } else if (pickupRequest.paymentStatus === "CONFIRMED") {
            status = PickupRequestCompletionStatus.PendingDelivery;
        } else {
            status = PickupRequestCompletionStatus.PendingPayment;
        }
        pickupRequestsResponse.push({
            pickupRequestId: pickupRequest.pickupRequestId,
            cost: pickupRequest.cost,
            status: status,
            originCompanyName: pickupRequest.originCompanyName,
            originalExternalOrderId: pickupRequest.originalExternalOrderId,
            requestDate: pickupRequest.requestDate,
            items: pickupRequest.items,
        } as PickupRequestGetEntity);
    });

    res.status(200).json(pickupRequestsResponse);
});

export const getAllPickupRequests = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const pickupRequests = await findAllPickupRequests();

    if (!pickupRequests) {
        return next(new AppError("No pickup requests found", 404));
    }

    res.status(200).json(pickupRequests);
});
