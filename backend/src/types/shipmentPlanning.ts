import { PickupToShipmentItemDetails, VehicleWithType } from "./db";

// In-memory representation of a vehicle's state during planning
export interface PlannableVehicle extends VehicleWithType {
    capacityRemaining: number;
    pickupsAssignedToday: number;
    capacity_type_id: number;
}

// In-memory representation of the final plan for a single vehicle
export interface ShipmentPlan {
    vehicle: PlannableVehicle;
    itemsToAssign: PickupToShipmentItemDetails[];
    originCompanyName: string; // Added for logging
    destinationCompanyName: string; // Added for logging
}

export interface DailyPlanOutput {
    createdShipmentsPlan: ShipmentPlan[],
    plannedRequestIds: number[]
}