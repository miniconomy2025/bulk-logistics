import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/errorHandlingMiddleware/catchAsync";
import { ThohEvent, TruckFailureInfo } from "../types/thoh";
import { handleTruckFailure, processThohEvent } from "../services/thohService";

export const postThohEvent = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const thohEvent: ThohEvent = req.body;
    res.status(200).send();
    processThohEvent(thohEvent);
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
