import db from "../config/database";
import { Result } from "../types";

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
                sql = "UPDATE shipments SET shipment_status_id = $1, dispatch_date = $2 WHERE shipment_id = $3";
                values = [statusId, dispatchDate, shipmentId];
            } else {
                sql = "UPDATE shipments SET shipment_status_id = $1 WHERE shipment_id = $2";
                values = [statusId, shipmentId];
            }
            const res = await db.query(sql, values);

            if (res.rowCount === 1) {
                return await this.findShipmentById(shipmentId);
            } else {
                throw new Error("Failed to update shipment status");
            }
        } catch (error: any) {
            throw new Error(error.message);
        }
    };

    assignItemToShipmentWithPickupRequestItemId = async (pickupRequestItemId: number, shipmentId: number) => {
        const query = `
        UPDATE pickup_request_item
        SET shipment_id = $2
        WHERE pickup_request_item_id = $1;`;

        await db.query(query, [pickupRequestItemId, shipmentId]);
    };

    createShipment = async (vehicleId: number, dispatchDate: Date) => {
        const query = `
        INSERT INTO shipments (vehicle_id, dispatch_date, shipment_status_id)
        VALUES ($1, $2, (SELECT shipment_status_id FROM shipment_status WHERE name = 'PENDING'))
        RETURNING *;
    `;
        const result = await db.query(query, [vehicleId, dispatchDate]);
        return result.rows[0];
    };

    findActiveShipments = async (): Promise<Result<any>> => {
        const query = `
        SELECT 
            SUM(CASE WHEN ss.name IN ('PENDING', 'PICKED_UP') THEN 1 ELSE 0 END) AS active
        FROM shipments s 
        JOIN shipment_status ss ON s.shipment_status_id = ss.shipment_status_id;
`;
        try {
            const result = await db.query(query);
            return { ok: true, value: result };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    };
}

const shipmentModel = new ShipmentModel();

export { shipmentModel };
