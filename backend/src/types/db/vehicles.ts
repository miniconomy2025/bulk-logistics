export interface VehicleType {
    vehicle_type_id: number;
    name: string;
    capacity_type_id: number;
    maximum_capacity: number;
    max_pickups_per_day: number;
    max_dropoffs_per_day: number;
}

export interface Vehicle {
    vehicle_id: number;
    is_active: boolean;
    daily_operational_cost: number;
    vehicle_type_id: number;
    purchase_date: string;
    is_in_active_shipment?: boolean;
}
export interface VehicleWithType extends Vehicle {
    vehicle_type: VehicleType;
}

export interface GetVehicleResult {
  success: boolean;
  vehicles?: VehicleWithType[];
  reason?: string;
}
