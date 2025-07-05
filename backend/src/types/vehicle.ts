export interface BasicVehicle {
  vehicle_id: number;
  vehicle_type: string;
}

export interface VehicleWithDeliveryCount extends BasicVehicle {
  deliveries_completed: number;
}

