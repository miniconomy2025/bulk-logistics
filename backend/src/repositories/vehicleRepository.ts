import database from '../config/database';
import { 
  VehicleWithDeliveryCount,
  VehicleWithType,
} from '../types';

export const getTotalVehicleDeliveryCounts = async () : Promise<VehicleWithDeliveryCount[]> => {
  const query = `
    SELECT 
      v.vehicle_id,
      vt.name AS vehicle_type,
      COUNT(DISTINCT pr.pickup_request_id) AS deliveries_completed
    FROM vehicle v
    JOIN vehicle_type vt ON vt.vehicle_type_id = v.vehicle_type_id
    JOIN shipments s ON s.vehicle_id = v.vehicle_id
    JOIN shipment_item_details sid ON sid.shipment_id = s.shipment_id
    JOIN pickup_request_item pri ON pri.pickup_request_item_id = sid.pickup_request_item_id
    JOIN pickup_requests pr ON pr.pickup_request_id = pri.pickup_request_id
    WHERE pr.completion_date IS NOT NULL
    GROUP BY v.vehicle_id, vt.name
    ORDER BY deliveries_completed DESC;
  `;

  const result = await database.query(query);
  return result.rows;
};

export const getAllVehiclesWithType = async (): Promise<VehicleWithType[]> => {
  const query = `
    SELECT 
      v.vehicle_id,
      v.is_active,
      v.vehicle_type_id,
      v.purchase_date,
      v.daily_operational_cost,
      vt.vehicle_type_id AS vt_id,
      vt.name AS vt_name,
      vt.capacity_type_id AS vt_capacity_type_id,
      vt.maximum_capacity AS vt_max_capacity,
      vt.max_pickups_per_day AS vt_max_pickups,
      vt.max_dropoffs_per_day AS vt_max_dropoffs,
      CASE 
        WHEN EXISTS (
          SELECT 1 
          FROM shipments s
          JOIN shipment_status ss ON ss.shipment_status_id = s.shipment_status_id
          WHERE s.vehicle_id = v.vehicle_id AND ss.name = 'PICKED_UP'
        ) THEN true
        ELSE false
      END AS is_in_active_shipment
    FROM vehicle v
    JOIN vehicle_type vt ON vt.vehicle_type_id = v.vehicle_type_id;
  `;
  
  const result = await database.query(query);

  return result.rows.map(row => ({
    vehicle_id: row.vehicle_id,
    is_active: row.is_active,
    vehicle_type_id: row.vehicle_type_id,
    purchase_date: row.purchase_date,
    daily_operational_cost: parseFloat(row.daily_operational_cost),
    is_in_active_shipment: row.is_in_active_shipment,
    vehicle_type: {
      vehicle_type_id: row.vt_id,
      name: row.vt_name,
      capacity_type_id: row.vt_capacity_type_id,
      maximum_capacity: row.vt_max_capacity,
      max_pickups_per_day: row.vt_max_pickups,
      max_dropoffs_per_day: row.vt_max_dropoffs,
    }
  }));
};

export const getVehicleDeliveriesByDateRange = async (
  startDate: Date, 
  endDate: Date
) : Promise<VehicleWithDeliveryCount[]> => {
  const query = `
    SELECT 
      v.vehicle_id,
      vt.name AS vehicle_type,
      COUNT(DISTINCT pr.pickup_request_id) AS deliveries_completed
    FROM vehicle v
    JOIN vehicle_type vt ON vt.vehicle_type_id = v.vehicle_type_id
    JOIN shipments s ON s.vehicle_id = v.vehicle_id
    JOIN shipment_item_details sid ON sid.shipment_id = s.shipment_id
    JOIN pickup_request_item pri ON pri.pickup_request_item_id = sid.pickup_request_item_id
    JOIN pickup_requests pr ON pr.pickup_request_id = pri.pickup_request_id
    WHERE pr.completion_date BETWEEN $1 AND $2
    GROUP BY v.vehicle_id, vt.name
    ORDER BY deliveries_completed DESC;
  `;
  const values = [startDate.toISOString(), endDate.toISOString()];
  const result = await database.query(query, values);
  return result.rows;
};

export const getVehicleForShipmentId = async (
  shipmentId: number
): Promise<VehicleWithType | null> => {
  const query = `
    SELECT 
      v.vehicle_id,
      v.is_active,
      v.vehicle_type_id,
      v.purchase_date,
      vt.vehicle_type_id AS vt_id,
      vt.name AS vt_name,
      vt.daily_operational_cost AS vt_cost,
      vt.capacity_type_id AS vt_capacity_type_id,
      vt.maximum_capacity AS vt_max_capacity,
      vt.max_pickups_per_day AS vt_max_pickups,
      vt.max_dropoffs_per_day AS vt_max_dropoffs
    FROM shipments s
    JOIN vehicle v ON s.vehicle_id = v.vehicle_id
    JOIN vehicle_type vt ON vt.vehicle_type_id = v.vehicle_type_id
    WHERE s.shipment_id = $1
  `;

  const result = await database.query(query, [shipmentId]);

  if (!result.rows[0]) return null;

  const row = result.rows[0];

  const vehicle: VehicleWithType = {
    vehicle_id: row.vehicle_id,
    is_active: row.is_active,
    vehicle_type_id: row.vehicle_type_id,
    purchase_date: row.purchase_date,
    daily_operational_cost: row.vt_cost,
    vehicle_type: {
      vehicle_type_id: row.vt_id,
      name: row.vt_name,
      capacity_type_id: row.vt_capacity_type_id,
      maximum_capacity: row.vt_max_capacity,
      max_pickups_per_day: row.vt_max_pickups,
      max_dropoffs_per_day: row.vt_max_dropoffs,
    },
  };

  return vehicle;
};

export const getAvailableVehiclesWithType = async (): Promise<VehicleWithType[]> => {
  const query = `
    SELECT 
      v.vehicle_id,
      v.is_active,
      v.vehicle_type_id,
      v.purchase_date,
      v.daily_operational_cost,
      vt.vehicle_type_id AS vt_id,
      vt.name AS vt_name,
      vt.capacity_type_id AS vt_capacity_type_id,
      vt.maximum_capacity AS vt_max_capacity,
      vt.max_pickups_per_day AS vt_max_pickups,
      vt.max_dropoffs_per_day AS vt_max_dropoffs
    FROM vehicle v
    JOIN vehicle_type vt ON vt.vehicle_type_id = v.vehicle_type_id
    LEFT JOIN shipments s ON v.vehicle_id = s.vehicle_id
    LEFT JOIN shipment_status ss ON ss.shipment_status_id = s.shipment_status_id
    WHERE s.shipment_id IS NULL OR ss.name = 'DELIVERED' OR ss.name = 'PENDING';
  `;

  const result = await database.query(query);

  return result.rows.map(row => ({
    vehicle_id: row.vehicle_id,
    is_active: row.is_active,
    vehicle_type_id: row.vehicle_type_id,
    daily_operational_cost: row.daily_operational_cost,
    purchase_date: row.purchase_date,
    vehicle_type: {
      vehicle_type_id: row.vt_id,
      name: row.vt_name,
      capacity_type_id: row.vt_capacity_type_id,
      maximum_capacity: row.vt_max_capacity,
      max_pickups_per_day: row.vt_max_pickups,
      max_dropoffs_per_day: row.vt_max_dropoffs,
    }
  }));
};

