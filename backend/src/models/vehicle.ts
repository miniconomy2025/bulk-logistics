import db from "../config/database";
import type { VehicleCreate } from "../types";

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
