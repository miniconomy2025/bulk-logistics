import { simulatedClock, SimulatedClock } from "../utils";
import { getVehicleDeliveriesByDateRange, getAllVehiclesWithType, updateVehicleStatus } from "../models/vehicleRepository";
import { GetVehicleResult, VehicleWithDeliveryCount, VehicleWithType } from "../types";
import { PickupRequestRequest } from "../types/PickupRequest";
import { MeasurementType, VehicleType } from "../enums";

export const getTodaysVehicleDeliveries = async (): Promise<VehicleWithDeliveryCount[]> => {
    const startOfDay = simulatedClock.getCurrentDate();
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    return await getVehicleDeliveriesByDateRange(startOfDay, endOfDay);
};

export const getVehicleForPickupRequest = async (pickUpRequest: PickupRequestRequest): Promise<GetVehicleResult> => {
    let totalQuantity = 0;
    let measurementType: string | undefined = "";
    const selectedVehicles: VehicleWithType[] = [];

    console.log("~~~~~~~~~~~~~~~~~~~~~~~ Checking Vehicles ~~~~~~~~~~~~~~~~~~~~~~~");

    const allVehicles = await getAllVehiclesWithType();
    console.log("Vehicles Found:\n ", JSON.stringify(allVehicles, null, 2));

    console.log("~~~~~~~~~~~~~~~~~~~~~~~ Shipment Items ~~~~~~~~~~~~~~~~~~~~~~~");
    console.log(JSON.stringify(pickUpRequest.items, null, 2));

    for (const item of pickUpRequest.items) {
        if (!measurementType) {
            measurementType = item.measurementType;
        }
        totalQuantity += item.quantity;
    }

    console.log("~~~~~~~~~~~~~~~~~~~~~~~ Items Total Quantity ~~~~~~~~~~~~~~~~~~~~~~~");
    console.log("Quantity: ", totalQuantity);
    console.log("Measurement Type: ", measurementType);

    const repeatVehicle = (vehicle: VehicleWithType[], count: number) => {
        for (let i = 0; i < count; i++) {
            selectedVehicles.push(vehicle[i % vehicle.length]);
        }
    };

    if (measurementType === MeasurementType.Weight) {
        const largeTrucks = allVehicles.filter((v) => v.vehicle_type?.name === VehicleType.Large);
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
        console.log("~~~~~~~~~~~~~~~~~~ Selected Large Vehicles ~~~~~~~~~~~~~~~~~~");
        console.log(selectedVehicles);

        return { success: true, vehicles: selectedVehicles };
    }

    if (measurementType === MeasurementType.Unit) {
        let remainingItems = totalQuantity;

        const mediumTrucks = allVehicles.filter((v) => v.vehicle_type?.name === VehicleType.Medium);
        const smallTrucks = allVehicles.filter((v) => v.vehicle_type?.name === VehicleType.Small);

        let mediumIndex = 0;
        let smallIndex = 0;

        while (remainingItems > 0) {
            console.log("~~~~~~~~~~~~~~~~~~ Selected M/S Vehicles ~~~~~~~~~~~~~~~~~~~~~~~");
            console.log(selectedVehicles);

            // Use medium truck if items > 500, otherwise use small truck
            if (remainingItems > 500 && mediumTrucks.length > 0) {
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

    const simulatedNow = simulatedClock.getCurrentDate();

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
        const response = await updateVehicleStatus(Number(vehicle.vehicle_id), true, null);

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
