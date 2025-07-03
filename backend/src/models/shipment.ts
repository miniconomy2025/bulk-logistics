import db from "../config/database";

class ShipmentModel {
    findAllShipments = async (dispatchDate?: string | null, statusId?: number | null) => {
        const sql = "SELECT * FROM get_shipment_details(p_dispatch_date => $1, p_status_id => $2)";

        const values = [dispatchDate, statusId];
        if (!dispatchDate) {
            values[0] = null;
        }
        if (!statusId) {
            values[1] = null;
        }

        const res = await db.query(sql, values);

        return res.rows;
    };

    findShipmentById = async (shipmentId: number) => {
        const sql = "SELECT * FROM get_shipment_details(p_shipment_id => $1)";
        const values = [shipmentId];

        const res = await db.query(sql, values);

        if (res.rowCount === 0) {
            return null;
        }

        return res.rows[0];
    };

    updateShipmentStatus = async (shipmentId: number, statusId: number, dispatchDate?: string) => {
        try {
            let sql: string;
            let values: any[];
            if (dispatchDate) {
                sql = "UPDATE shipments SET shipment_status_id = $1, dispatch_date = $2 WHERE shipment_id = $3 RETURNING *";
                values = [statusId, dispatchDate, shipmentId];
            } else {
                sql = "UPDATE shipments SET shipment_status_id = $1 WHERE shipment_id = $2 RETURNING *";
                values = [statusId, shipmentId];
            }
            const res = await db.query(sql, values);

            if (res.rowCount === 1) {
                return await this.findShipmentById(res.rows[0].shipment_id);
            } else {
                throw new Error("Failed to update shipment status");
            }
        } catch (error: any) {
            throw new Error(error.message);
        }
    };
}

const shipmentModel = new ShipmentModel();

export { shipmentModel };
