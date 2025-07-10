import db from "../config/database";
import type { VehicleCreate, VehicleWithDeliveryCount, VehicleWithType } from "../types";

export const findAvailableVehicles = async (dispatchDate: string) => {
    const sql = "SELECT * FROM get_available_vehicles(p_dispatch_date => $1)";

    const res = await db.query(sql, [dispatchDate]);
    return res.rows;
};

export const addVehicle = async (vehicleInfo: VehicleCreate) => {
    const sql = "CALL insert_vehicle_info(p_name => $1, p_purchase_date => $2, p_daily_operational_cost => $3, p_maximum_capacity => $4)";

    const values = [vehicleInfo.type, vehicleInfo.purchase_date, vehicleInfo.operational_cost, vehicleInfo.load_capacity];

    const res = await db.query(sql, values);

    if (res.rowCount === 0) {
        throw new Error("Failed to add vehicle");
    }

    return { success: true, message: "Vehicle added successfully" };
};

export const getTotalVehicleDeliveryCounts = async (): Promise<VehicleWithDeliveryCount[]> => {
    const query = `
    SELECT 
      v.vehicle_id,
      vt.name AS vehicle_type,
      COUNT(DISTINCT pr.pickup_request_id) AS deliveries_completed
    FROM vehicle v
    JOIN vehicle_type vt ON vt.vehicle_type_id = v.vehicle_type_id
    JOIN shipments s ON s.vehicle_id = v.vehicle_id
    JOIN pickup_request_item pri ON pri.shipment_id = s.shipment_id
    JOIN pickup_requests pr ON pr.pickup_request_id = pri.pickup_request_id
    WHERE pr.completion_date IS NOT NULL
    GROUP BY v.vehicle_id, vt.name
    ORDER BY deliveries_completed DESC;
  `;

    const result = await db.query(query);
    return result.rows;
};

export const getAllVehiclesWithType = async (): Promise<VehicleWithType[]> => {
    const query = `
    SELECT 
      v.vehicle_id,
      v.is_active,
      v.vehicle_type_id,
      v.purchase_date,
      v.disabled_date,
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

    const result = await db.query(query);
    return result.rows.map((row) => ({
        vehicle_id: row.vehicle_id,
        is_active: row.is_active,
        vehicle_type_id: row.vehicle_type_id,
        purchase_date: row.purchase_date,
        disabled_date: row.disabled_date,
        daily_operational_cost: parseFloat(row.daily_operational_cost),
        is_in_active_shipment: row.is_in_active_shipment,
        max_pickups_per_day: row.vt_max_pickups,
        vehicle_type: {
            vehicle_type_id: row.vt_id,
            name: row.vt_name,
            capacity_type_id: row.vt_capacity_type_id,
            maximum_capacity: row.vt_max_capacity,
            max_pickups_per_day: row.vt_max_pickups,
            max_dropoffs_per_day: row.vt_max_dropoffs,
        },
    }));
};

export const getVehicleDeliveriesByDateRange = async (startDate: Date, endDate: Date): Promise<VehicleWithDeliveryCount[]> => {
    // This query calculates the number of completed deliveries for each vehicle within a specific date range.
    const query = `
    SELECT 
      v.vehicle_id,
      vt.name AS vehicle_type,
      COUNT(DISTINCT pr.pickup_request_id) AS deliveries_completed
    FROM vehicle v
    JOIN vehicle_type vt ON vt.vehicle_type_id = v.vehicle_type_id
    JOIN shipments s ON s.vehicle_id = v.vehicle_id
    JOIN pickup_request_item pri ON pri.shipment_id = s.shipment_id
    JOIN pickup_requests pr ON pr.pickup_request_id = pri.pickup_request_id
    WHERE pr.completion_date BETWEEN $1 AND $2
    GROUP BY v.vehicle_id, vt.name
    ORDER BY deliveries_completed DESC;
  `;
    const values = [startDate.toISOString(), endDate.toISOString()];
    const result = await db.query(query, values);
    return result.rows;
};

export const getVehicleForShipmentId = async (shipmentId: number): Promise<VehicleWithType | null> => {
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

    const result = await db.query(query, [shipmentId]);

    if (!result.rows[0]) return null;

    const row = result.rows[0];

    const vehicle: VehicleWithType = {
        vehicle_id: row.vehicle_id,
        is_active: row.is_active,
        vehicle_type_id: row.vehicle_type_id,
        purchase_date: row.purchase_date,
        daily_operational_cost: row.vt_cost,
        max_pickups_per_day: row.vt_max_pickups,
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
      v.disabled_date,
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

    const result = await db.query(query);

    return result.rows.map((row) => ({
        vehicle_id: row.vehicle_id,
        is_active: row.is_active,
        vehicle_type_id: row.vehicle_type_id,
        daily_operational_cost: row.daily_operational_cost,
        purchase_date: row.purchase_date,
        disabled_date: row.disabled_date,
        max_pickups_per_day: row.vt_max_pickups,
        vehicle_type: {
            vehicle_type_id: row.vt_id,
            name: row.vt_name,
            capacity_type_id: row.vt_capacity_type_id,
            maximum_capacity: row.vt_max_capacity,
            max_pickups_per_day: row.vt_max_pickups,
            max_dropoffs_per_day: row.vt_max_dropoffs,
        },
    }));
};

export const updateVehicleStatus = async (
  vehicleId: number,
  isActive: boolean,
  disabledDate: string | null // use ISO date string format (e.g. "2025-07-08")
) => {
    const query = `
        UPDATE vehicle 
        SET 
            is_active = $1,
            disabled_date = $2
        WHERE vehicle_id = $3
        RETURNING vehicle_id, is_active, disabled_date
    `;

    const result = await db.query(query, [isActive, disabledDate, vehicleId]);

    if (result.rowCount === 0) {
        throw new Error(`Vehicle with ID ${vehicleId} not found or update failed.`);
    }

    return {
        vehicle_id: result.rows[0].vehicle_id,
        is_active: result.rows[0].is_active,
        disabled_date: result.rows[0].disabled_date,
        message: `Vehicle status successfully updated.`,
    };
};