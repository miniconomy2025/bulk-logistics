import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/errorHandlingMiddleware/catchAsync";
import { TruckFailureRequest } from "../types/thoh";
import { beginSimulation, handleTruckDelivery, processTruckFailure } from "../services/thohService";
import { TruckDelivery } from "../types";

export const startSimulation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const {unixEpochStart} = req.body;
    res.status(200).send();
    beginSimulation(unixEpochStart);
});

export const handleTruckFailure = catchAsync(async (req: Request, res: Response, next: NextFunction) =>{
    const truckFailure : TruckFailureRequest = req.body;
    await processTruckFailure(truckFailure);
    res.status(200).send();
});

export const truckDelivery = catchAsync(async (req: Request, res: Response, next: NextFunction) =>{
    const truckDeliveryInfo : TruckDelivery = req.body;
    await handleTruckDelivery(truckDeliveryInfo);
    res.status(200).send();
});


