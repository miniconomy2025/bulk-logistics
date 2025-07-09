import db from "../config/database";

export const findAvailableVehicles = async (dispatchDate: string) => {
    const sql = "SELECT * FROM get_available_vehicles(p_dispatch_date => $1)";
    
    const res = await db.query(sql, [dispatchDate]);
    return res.rows;
};
