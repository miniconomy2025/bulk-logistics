import { PickupToShipmentItemDetails, VehicleWithType } from "./db";

export interface PlannableVehicle extends VehicleWithType {
    capacityRemaining: number;
    pickupsAssignedToday: number;
    capacity_type_id: number;
}


export interface ShipmentPlan {
    vehicle: PlannableVehicle;
    itemsToAssign: PickupToShipmentItemDetails[];
    originCompanyName: string; 
    destinationCompanyName: string; 
}

export interface DailyPlanOutput {
    createdShipmentsPlan: ShipmentPlan[];
    plannedRequestIds: number[];
}
