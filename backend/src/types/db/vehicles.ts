export interface VehicleType {
    vehicle_type_id: number;
    name: string;
    daily_operational_cost: number;
    capacity_type_id: number;
    maximum_capacity: number;
    max_pickups_per_day: number;
    max_dropoffs_per_day: number;
}

export interface Vehicle {
    vehicle_id: number;
    is_active: boolean;
    vehicle_type_id: number;
    purchase_date: string;
}
