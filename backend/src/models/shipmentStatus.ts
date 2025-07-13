import db from "../config/database";

class ShipmentStatusModel {
    findAllStatuses() {
        const sql = `SELECT shipment_status_id as "shipmentStatusId", name FROM shipment_status`;
        return db.query(sql).then((res) => res.rows);
    }
}

export default new ShipmentStatusModel();
