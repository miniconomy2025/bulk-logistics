import db from "../config/database";

class ShipmentStatusModel {
    findAllStatuses = async () => {
        const sql = `SELECT shipment_status_id as "shipmentStatusId", name FROM shipment_status`;
        return db.query(sql).then((res) => res.rows);
    }

    findShipmentStatusByName = async (name: string ): Promise<number | null> => {
        const sql = `SELECT shipment_status_id as "shipmentStatusId", name FROM shipment_status WHERE name = $1`;
        
        const res =  await db.query(sql, [name]);
        if (res.rowCount === 0) {
            return null;
        }
        return res.rows[0];
    }
}

export default new ShipmentStatusModel();
