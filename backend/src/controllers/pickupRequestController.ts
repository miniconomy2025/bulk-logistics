import { Request, Response, NextFunction } from "express";
import { validatePickupRequest } from "../validation/pickupRequestValidator";
import { PickupRequestCreationResult, PickupRequestRequest, PickupRequestResponse } from "../models/PickupRequest";
import { calculateDeliveryCost } from "../services/DeliveryCostCalculatorService";
import { findPickupRequestById, savePickupRequest } from "../repositories/pickupRequestRepository";
import catchAsync from '../utils/catchAsync'; 
import AppError from '../utils/appError';   
import { SimulatedClock } from "../utils";

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
        requestDate: SimulatedClock.getSimulatedTime(new Date("2025-07-02"))
    });

    res.status(201).json({
        pickupRequestId: result.pickupRequestId,
        cost: result.cost,
        paymentReferenceId: result.paymentReferenceId,
        bulkLogisticsBankAccountNumber: result.bulkLogisticsBankAccountNumber,
        status: "PENDING_PAYMENT",
        statusCheckUrl: `/pickup-requests/${result.pickupRequestId}`
    } as PickupRequestResponse
    );
});

export const getPickupRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const pickupRequest = await findPickupRequestById(id);

    if (!pickupRequest) {
        return next(new AppError('No pickup request found with that ID', 404));
    }

    let status: string;
    if (pickupRequest.completionDate) {
        status = 'DELIVERED';
    } else if (pickupRequest.payment_status === 'CONFIRMED') {
        status = 'PENDING_DELIVERY';
    } else {
        status = 'PENDING_PAYMENT';
    }

    res.status(200).json({
        pickupRequestId: pickupRequest.pickupRequestId,
        cost: pickupRequest.cost,
        status: status,
        requestDate: pickupRequest.requestDate,
        completionDate: pickupRequest.completionDate,
        items: pickupRequest.items,
    });
});
