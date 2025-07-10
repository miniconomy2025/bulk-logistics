/*
================================================================================
| FILE: /src/services/thohService.ts (CORRECTED)
| DESC: This file has been corrected to call the proper method names on the
|       autonomyService singleton instance.
================================================================================
*/
import { ThohEvents } from "../enums";
import { TruckDelivery } from "../types";
import { TruckDeliveryRequest, TruckFailureRequest } from "../types/thoh";
import AppError from "../utils/errorHandlingMiddleware/appError";
import AutonomyService, { autonomyService } from "./AutonomyService";

export const beginSimulation = (startTime: string) => {
    autonomyService.start(startTime);
}

export const processTruckFailure = async (failureRequest: TruckFailureRequest) => {
    autonomyService.handleVehicleFailure(failureRequest);
}

export const handleTruckDelivery = async (truckDeliveryInfo : TruckDelivery) => {
    await autonomyService.handleTruckDelivery(truckDeliveryInfo)
}
