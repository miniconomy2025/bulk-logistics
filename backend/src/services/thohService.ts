import { getAllVehiclesWithType, updateVehicleStatus } from "../models/vehicleRepository";
import { TruckDelivery } from "../types";
import { TruckFailureRequest, TruckFailureInfo } from "../types/thoh";
import { simulatedClock } from "../utils";
import { autonomyService } from "./AutonomyService";

export const beginSimulation = (startTime: number) => {
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

    if (!allVehicles.length || failureInfo.failureQuantity <= 0) {
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

    // Check if we found enough vehicles to fail
    if (vehiclesToFail.length < failureInfo.failureQuantity) {
        console.warn(
            `Requested to fail ${failureInfo.failureQuantity} ${failureInfo.truckName} trucks, but only found ${vehiclesToFail.length}`
        );

        return {
            success: false,
            message: `Insufficient vehicles of type ${failureInfo.truckName}. Requested: ${failureInfo.failureQuantity}, Available: ${vehiclesToFail.length}`,
            data: {
                requested: failureInfo.failureQuantity,
                available: vehiclesToFail.length,
            },
        };
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
