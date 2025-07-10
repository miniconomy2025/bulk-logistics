import { getAllVehiclesWithType, updateVehicleStatus } from "../models/vehicle";
import { TruckDelivery } from "../types";
import { TruckFailureRequest, TruckFailureInfo } from "../types/thoh";
import { simulatedClock } from "../utils";
import { autonomyService } from "./AutonomyService";

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
        const response = await updateVehicleStatus(vehicle.vehicle_id, false, simulatedClock.getCurrentDate().toISOString());

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
