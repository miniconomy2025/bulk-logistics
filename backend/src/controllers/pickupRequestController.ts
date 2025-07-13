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

export const createPickupRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const pickupRequestDetails: PickupRequestRequest = req.body;

    try {
        await validatePickupRequest(pickupRequestDetails);
    } catch (validationError: any) {
        return next(new AppError(`Invalid input data: ${validationError.message}`, 400));
    }
    let newItems: ItemRequest[] = [];
    const itemDefinition: ItemDefinitionWithName[] = await getItemDefinitions();
    pickupRequestDetails.items.forEach((item) => {
        const itemMeasurementType: string = itemDefinition.find((i) => i.item_name == item.itemName)!.capacity_type_name;
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
            newItems.push(item);
        }
    });
    const partitionedPickupRequestDetails = { ...pickupRequestDetails, items: newItems };

    const cost = await calculateDeliveryCost(partitionedPickupRequestDetails);

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
