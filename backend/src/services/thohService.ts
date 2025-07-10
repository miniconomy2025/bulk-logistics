/*
================================================================================
| FILE: /src/services/thohService.ts (CORRECTED)
| DESC: This file has been corrected to call the proper method names on the
|       autonomyService singleton instance.
================================================================================
*/
import db from "../config/database";
import { ThohEvents } from "../enums";
import { getAllVehiclesWithType, updateVehicleStatus } from "../models/vehicle";
import { TruckDelivery } from "../types";
import { TruckDeliveryRequest, TruckFailureRequest, TruckFailureInfo } from "../types/thoh";
import { SimulatedClock } from "../utils";
import AppError from "../utils/errorHandlingMiddleware/appError";
import AutonomyService, { autonomyService } from "./AutonomyService";

export const beginSimulation = (startTime: string) => {
    autonomyService.start(startTime);
};

export const processTruckFailure = async (failureRequest: TruckFailureRequest) => {
    autonomyService.handleVehicleFailure(failureRequest);
};

export const handleTruckDelivery = async (truckDeliveryInfo: TruckDelivery) => {
    await autonomyService.handleTruckDelivery(truckDeliveryInfo);
};

export const handleTruckFailure = async (failureInfo: TruckFailureInfo) => {
    const allVehicles = await getAllVehiclesWithType();

    if (!allVehicles.length || !failureInfo.failureQuantity) {
        return {
            success: false,
            message: "No vehicles to fail",
        };
    }

    const vehiclesToFail = [];

    for (const vehicle of allVehicles) {
        if (vehicle.vehicle_type.name === failureInfo.truckName) {
            vehiclesToFail.push(vehicle);
        }

        if (vehiclesToFail.length === failureInfo.failureQuantity) {
            break;
        }
    }

    const disableVehicles = [];

    for (const vehicle of vehiclesToFail) {
        const response = await updateVehicleStatus(vehicle.vehicle_id, false, SimulatedClock.getSimulatedTime().toISOString());

        disableVehicles.push(response);
        console.log("----Vehicle Disabled-----");
        console.log({ response });
    }

    return {
        success: true,
        message: "Successfully Disabled Trucks",
        data: disableVehicles,
    };
};
