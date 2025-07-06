import { SimulatedClock } from "../utils";
import { getVehicleDeliveriesByDateRange, getAllVehiclesWithType } from "../repositories/vehicleRepository";
import { GetVehicleResult, VehicleWithDeliveryCount, VehicleWithType } from "../types";
import { PickupRequestRequest } from "../models/PickupRequest";
import { MeasurementType, VehicleType } from "../enums";

export const getTodaysVehicleDeliveries = async (): Promise<VehicleWithDeliveryCount[]> => {
    const { start, end } = SimulatedClock.getSimulatedStartAndEndOfToday();
    return await getVehicleDeliveriesByDateRange(start, end);
};

export const getVehicleForPickupRequest = async (pickUpRequest: PickupRequestRequest): Promise<GetVehicleResult> => {
    let totalQuantity = 0;
    let measurementType: string = "";
    const selectedVehicles: VehicleWithType[] = [];

    const allVehicles = await getAllVehiclesWithType();

    for (const item of pickUpRequest.items) {
        if (!measurementType) {
            measurementType = item.measurementType;
        }
        totalQuantity += item.quantity;
    }

    const repeatVehicle = (vehicle: VehicleWithType, count: number) => {
        for (let i = 0; i < count; i++) {
            selectedVehicles.push(vehicle);
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
            repeatVehicle(largeTrucks[0], remaining);
        }

        return { success: true, vehicles: selectedVehicles };
    }

    if (measurementType === MeasurementType.Unit) {
        let remaining = totalQuantity;

        const mediumTrucks = allVehicles.filter((v) => v.vehicle_type.name === "Medium");
        const smallTrucks = allVehicles.filter((v) => v.vehicle_type.name === "Small");

        let mediumIndex = 0;
        let smallIndex = 0;

        while (remaining > 0) {
            if ((remaining > 2000 || remaining > 500) && mediumTrucks.length > 0) {
                const vehicle = mediumTrucks[mediumIndex % mediumTrucks.length];
                selectedVehicles.push(vehicle);
                mediumIndex++;
                remaining -= 2000;
            } else if (smallTrucks.length > 0) {
                const vehicle = smallTrucks[smallIndex % smallTrucks.length];
                selectedVehicles.push(vehicle);
                smallIndex++;
                remaining -= 500;
            } else {
                return { success: false, reason: "No vehicles available to complete the request" };
            }
        }

        return { success: true, vehicles: selectedVehicles };
    }

    return { success: false, reason: "Unsupported measurement type." };
};
