import type { Request, Response } from "express";
import { shipmentModel } from "../models/shipment";

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

    public static getShipmentById = async (req: Request, res: Response) => {
        const shipmentId = parseInt(req.params.id, 10);

        if (isNaN(shipmentId)) {
            return res.status(400).json({ error: "Invalid shipment ID." });
        }

        try {
            const shipment = await shipmentModel.findShipmentById(shipmentId);
            return res.json(shipment);
        } catch (err: any) {
            return res.status(404).json({ error: `Shipment not found.` });
        }
    };

    public static dispatchShipment = async (req: Request, res: Response) => {
        const shipmentId = parseInt(req.params.id, 10);

        if (isNaN(shipmentId)) {
            return res.status(400).json({ error: "Invalid shipment ID." });
        }

        const shipment = await shipmentModel.findShipmentById(shipmentId);

        if (!shipment) {
            return res.status(404).json({ error: "Shipment not found." });
        }

        // ID to be stored as an enum
        if (shipment.status.statusId !== 1) {
            return res.json({ message: "Shipment already dispatched", data: shipment });
        }

        try {
            const updatedShipment = await shipmentModel.updateShipmentStatus(shipmentId, 2, "2025-07-30"); // store ID:2 as an enum and use the provided date from simulation config
            return res.json({ message: "Shipment dispatched", data: updatedShipment });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    public static deliverShipment = async (req: Request, res: Response) => {
        const shipmentId = parseInt(req.params.id, 10);

        if (isNaN(shipmentId)) {
            return res.status(400).json({ error: "Invalid shipment ID." });
        }

        const shipment = await shipmentModel.findShipmentById(shipmentId);

        if (!shipment) {
            return res.status(404).json({ error: "Shipment not found." });
        }

        // ID to be stored as an enum
        if (shipment.status.statusId === 3) {
            return res.json({ message: "Shipment already delivered", data: shipment });
        } else if (shipment.status.statusId === 1) {
            return res.status(400).json({ error: "Shipment must be dispatched before delivery." });
        }

        try {
            const updatedShipment = await shipmentModel.updateShipmentStatus(shipmentId, 3); // To store as an enum
            return res.json({ message: "Shipment delivered", data: updatedShipment });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };
}

export default ShipmentController;
