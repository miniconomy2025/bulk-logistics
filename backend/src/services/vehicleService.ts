import { SimulatedClock } from "../utils";
import { getVehicleDeliveriesByDateRange, getAllVehiclesWithType, updateVehicleStatus } from "../models/vehicle";
import { GetVehicleResult, VehicleWithDeliveryCount, VehicleWithType } from "../types";
import { PickupRequestRequest } from "../types/PickupRequest";
import { MeasurementType, VehicleType } from "../enums";

export const getTodaysVehicleDeliveries = async (): Promise<VehicleWithDeliveryCount[]> => {
    const { start, end } = SimulatedClock.getSimulatedStartAndEndOfToday();
    return await getVehicleDeliveriesByDateRange(start, end);
};

export const getVehicleForPickupRequest = async (pickUpRequest: PickupRequestRequest): Promise<GetVehicleResult> => {
    let totalQuantity = 0;
    let measurementType: string | undefined = "";
    const selectedVehicles: VehicleWithType[] = [];

    const allVehicles = await getAllVehiclesWithType();

    for (const item of pickUpRequest.items) {
        if (!measurementType) {
            measurementType = item.measurementType;
        }
        totalQuantity += item.quantity;
    }

    const repeatVehicle = (vehicle: VehicleWithType[], count: number) => {
        for (let i = 0; i < count; i++) {
            selectedVehicles.push(vehicle[i % vehicle.length]);
        }
    };

    if (measurementType === MeasurementType.Weight) {
        const largeTrucks = allVehicles.filter((v) => v.vehicle_type.name === VehicleType.Large);
        const required = Math.ceil(totalQuantity / 5000);

        if (largeTrucks.length === 0) throw new Error("No large trucks available.");

        // Use as many unique trucks as possible
        const useUnique = Math.min(required, largeTrucks.length);
        for (let i = 0; i < useUnique; i++) {
            selectedVehicles.push(largeTrucks[i]);
        }

        // Reuse a truck if needed
        const remaining = required - useUnique;
        if (remaining > 0) {
            repeatVehicle(largeTrucks, remaining);
        }
        return { success: true, vehicles: selectedVehicles };
    }

    if (measurementType === MeasurementType.Unit) {
        let remainingItems = totalQuantity;

        const mediumTrucks = allVehicles.filter((v) => v.vehicle_type.name === VehicleType.Medium);
        const smallTrucks = allVehicles.filter((v) => v.vehicle_type.name === VehicleType.Small);

        let mediumIndex = 0;
        let smallIndex = 0;

        while (remainingItems > 0) {
            if ((remainingItems > 2000 || remainingItems > 500) && mediumTrucks.length > 0) {
                const vehicle = mediumTrucks[mediumIndex % mediumTrucks.length];
                selectedVehicles.push(vehicle);
                mediumIndex++;
                remainingItems -= 2000;
            } else if (smallTrucks.length > 0) {
                const vehicle = smallTrucks[smallIndex % smallTrucks.length];
                selectedVehicles.push(vehicle);
                smallIndex++;
                remainingItems -= 500;
            } else {
                return { success: false, reason: "No vehicles available to complete the request" };
            }
        }

        return { success: true, vehicles: selectedVehicles };
    }

    return { success: false, reason: "Unsupported measurement type." };
};

export const reactivateVehicle = async () => {
    const allVehicles = await getAllVehiclesWithType();

    const simulatedNow = SimulatedClock.getSimulatedTime();

    const twoDaysAgo = new Date(simulatedNow);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const vehiclesToActivate = [];

    for (const vehicle of allVehicles) {
        if (vehicle.disabled_date && !vehicle.is_active && new Date(vehicle.disabled_date) <= twoDaysAgo) {
            vehiclesToActivate.push(vehicle);
        }
    }

    if (!vehiclesToActivate.length) {
        return {
            success: false,
            message: "No Vehicles to activate",
        };
    }

    const activatedVehicles = [];
    for (const vehicle of vehiclesToActivate) {
        const response = await updateVehicleStatus(vehicle.vehicle_id, true, null);

        activatedVehicles.push(response);
        console.log("----Vehicle Reactivate-----");
        console.log({ response });
    }

    return {
        success: true,
        message: "Found Vehicles to Reactivate",
        data: activatedVehicles,
    };
};
