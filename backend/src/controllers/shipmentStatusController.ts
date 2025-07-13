import type { NextFunction, Request, Response } from "express";
import shipmentStatus from "../models/shipmentStatus";
import catchAsync from "../utils/errorHandlingMiddleware/catchAsync";
import AppError from "../utils/errorHandlingMiddleware/appError";

export const getShipmentStatuses = catchAsync(async (_: Request, res: Response, next: NextFunction) => {
    try {
        const result = await shipmentStatus.findAllStatuses();

        return res.status(200).json(result);
    } catch (error: any) {
        return next(new AppError(`Failed to fetch shipment statuses, ${error}`, 500));
    }
});
