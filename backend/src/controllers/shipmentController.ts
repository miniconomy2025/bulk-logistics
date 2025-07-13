import type { Request, Response } from "express";
import { shipmentModel } from "../models/shipmentRepository";

class ShipmentController {
    public static getShipments = async (req: Request, res: Response) => {
        const { dispatchDate, statusId } = req.query;

        if (dispatchDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dispatchDate as string)) {
                return res.status(400).json({ error: "Invalid dispatch date" });
            }
        }

        if (statusId) {
            const statusIdNum = parseInt(statusId as string, 10);
            if (isNaN(statusIdNum)) {
                return res.status(400).json({ error: "Invalid status ID." });
            }
        }

        try {
            const shipments = await shipmentModel.findAllShipments(dispatchDate as string, Number(statusId));
            return res.json(shipments);
        } catch (err: any) {
            return res.status(500).json({ error: "Failed to fetch shipments." });
        }
    };

    public static getActiveShipments = async (req: Request, res: Response) => {
        const result = await shipmentModel.findActiveShipments();

        if (result.ok) {
            res.status(200).json({ shipments: result.value.rows[0] });
        } else {
            console.error(result.error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    };
}

export default ShipmentController;
