export interface BasicVehicle {
    vehicle_id: number;
    vehicle_type: string;
}

export interface VehicleWithDeliveryCount extends BasicVehicle {
    deliveries_completed: number;
}

export interface VehicleCreate {
    type: string;
    purchase_date: string;
    operational_cost: number;
    load_capacity: number;
}

export interface VehicleOperationalCost {
    operationalCost: number;
}

export interface AvailableVehicle {
    vehicle_id: number,
    vehicle_type_id: number,
    is_active: boolean,
    vehicleType: string,
    maximum_capacity: number,
    capacity_type_id: number,
    max_pickups_per_day: number
    max_dropoffs_per_day: number
}