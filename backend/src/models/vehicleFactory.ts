import type { Vehicle } from "../types";

export class VehicleFactory {
    static createVehicle(type: string, purchaseDate: string, operationalCost: number, loadCapacity: number) {
        switch (type) {
            case "large_truck":
                return VehicleFactory.createLargeTruck(purchaseDate, operationalCost, loadCapacity);
            case "medium_truck":
                return VehicleFactory.createMediumTruck(purchaseDate, operationalCost, loadCapacity);
            case "small_truck":
                return VehicleFactory.createSmallTruck(purchaseDate, operationalCost, loadCapacity);
            default:
                throw new Error("Unknown vehicle type");
        }
    }

    private static createLargeTruck(purchaseDate: string, operationalCost: number, loadCapacity: number) {
        return {
            type: "large_truck",
            purchase_date: purchaseDate,
            operational_cost: operationalCost,
            load_capacity: loadCapacity,
        };
    }

    private static createMediumTruck(purchaseDate: string, operationalCost: number, loadCapacity: number) {
        return {
            type: "medium_truck",
            purchase_date: purchaseDate,
            operational_cost: operationalCost,
            load_capacity: loadCapacity,
        };
    }

    private static createSmallTruck(purchaseDate: string, operationalCost: number, loadCapacity: number) {
        return {
            type: "small_truck",
            purchase_date: purchaseDate,
            operational_cost: operationalCost,
            load_capacity: loadCapacity,
        };
    }
}
