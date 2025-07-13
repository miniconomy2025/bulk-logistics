import { Request, Response, NextFunction } from "express";
import { validatePickupRequest } from "../validation/pickupRequestValidator";
import { PickupRequestCreationResult, PickupRequestRequest, PickupRequestCreateResponse, PickupRequestGetEntity } from "../types/PickupRequest";
import { calculateDeliveryCost } from "../services/DeliveryCostCalculatorService";
import { findAllPickupRequests, findPickupRequestById, findPickupRequestsByCompanyName, savePickupRequest } from "../models/pickupRequestRepository";
import catchAsync from "../utils/errorHandlingMiddleware/catchAsync";
import AppError from "../utils/errorHandlingMiddleware/appError";
import { simulatedClock } from "../utils";
import { PickupRequestCompletionStatus } from "../enums";

export const createPickupRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const pickupRequestDetails: PickupRequestRequest = req.body;

    try {
        await validatePickupRequest(pickupRequestDetails);
    } catch (validationError: any) {
        return next(new AppError(`Invalid input data: ${validationError.message}`, 400));
    }

    const cost = await calculateDeliveryCost(pickupRequestDetails);

    const result: PickupRequestCreationResult = await savePickupRequest({
        ...pickupRequestDetails,
        requestingCompany: pickupRequestDetails.destinationCompany,
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
