import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/errorHandlingMiddleware/catchAsync";
import { ThohEvent } from "../types/thoh";
import { processThohEvent } from "../services/thohService";

export const postThohEvent = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const thohEvent: ThohEvent = req.body;
    res.status(200).send();
    processThohEvent(thohEvent);
});

