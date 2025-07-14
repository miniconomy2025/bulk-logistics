import { PickupToShipmentItemDetails, VehicleWithType } from "./db";

export interface PlannableVehicle extends VehicleWithType {
    capacityRemaining: number;
    pickupsAssignedToday: number;
    dropoffsAssignedToday: number; 
    capacity_type_id: number;
    assignedOrigins: Set<string>;
    assignedDestinations: Set<string>;
}

export interface ShipmentPlan {
    vehicle: PlannableVehicle;
    itemsToAssign: PickupToShipmentItemDetails[];
    originCompanyNames: Set<string>;
    destinationCompanyNames: Set<string>;
}

export interface DailyPlanOutput {
    createdShipmentsPlan: ShipmentPlan[];
    plannedRequestIds: number[];
}
