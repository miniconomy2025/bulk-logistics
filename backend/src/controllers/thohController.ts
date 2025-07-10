import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/errorHandlingMiddleware/catchAsync";
import { beginSimulation, handleTruckDelivery, processTruckFailure } from "../services/thohService";
import { TruckDelivery } from "../types";
import { TruckFailureInfo } from "../types/thoh";
import { handleTruckFailure } from "../services/thohService";


export const startSimulation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const {unixEpochStart} = req.body;
    res.status(200).send();
    beginSimulation(unixEpochStart);
});

export const truckFailure = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const failureInfo: TruckFailureInfo = req.body;

    const result = await handleTruckFailure(failureInfo);

    if (result.success) {
        res.status(204).send();
    }

    if (!result.success) {
        res.status(418).json(result).send();
    }
});

export const truckDelivery = catchAsync(async (req: Request, res: Response, next: NextFunction) =>{
    const truckDeliveryInfo : TruckDelivery = req.body;
    await handleTruckDelivery(truckDeliveryInfo);
    res.status(200).send();
});
