import { Request, Response, NextFunction } from "express";
import { validatePickupRequest } from "../validation/pickupRequestValidator";
import { PickupRequestCreationResult, PickupRequestRequest, PickupRequestCreateResponse, PickupRequestGetEntity } from "../types/PickupRequest";
import { calculateDeliveryCost } from "../services/DeliveryCostCalculatorService";
import { findPickupRequestById, findPickupRequestsByCompanyId, savePickupRequest } from "../models/pickupRequestRepository";
import catchAsync from '../utils/errorHandlingMiddleware/catchAsync';
import AppError from '../utils/errorHandlingMiddleware/appError';
import { SimulatedClock } from "../utils";
import { PickupRequestCompletionStatus } from "../enums";

export const createPickupRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const pickupRequestDetails: PickupRequestRequest = req.body;

    try {
        validatePickupRequest(pickupRequestDetails);
    } catch (validationError: any) {
        return next(new AppError(`Invalid input data: ${validationError.message}`, 400));
    }

    const cost = calculateDeliveryCost(pickupRequestDetails);

    const result: PickupRequestCreationResult = await savePickupRequest({
        ...pickupRequestDetails,
        requestingCompanyId: pickupRequestDetails.destinationCompanyId,
        cost: cost,
        requestDate: SimulatedClock.getSimulatedTime(),
    });

    res.status(201).json({
        pickupRequestId: result.pickupRequestId,
        cost: result.cost,
        paymentReferenceId: result.paymentReferenceId,
        bulkLogisticsBankAccountNumber: result.bulkLogisticsBankAccountNumber,
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
    });
});

export const getPickupRequestsByCompany = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { companyId } = req.params;

    const pickupRequests: PickupRequestGetEntity[] | null = await findPickupRequestsByCompanyId(companyId);

    let pickupRequestsResponse: PickupRequestGetEntity[] = [];
    console.log(pickupRequests);
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
