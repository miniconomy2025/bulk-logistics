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
    operationalCost: number
}