import express from "express";
import rateLimit from "express-rate-limit";
import ShipmentController from "../controllers/shipmentController";

const router = express.Router();

const shipmentRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: "Too many shipment request attempts. Please try again later.",
    },
});

router.get("/", shipmentRequestLimiter, ShipmentController.getShipments);
router.get("/:id", shipmentRequestLimiter, ShipmentController.getShipmentById);
router.patch("/:id/dispatch", shipmentRequestLimiter, ShipmentController.dispatchShipment);
router.patch("/:id/deliver", shipmentRequestLimiter, ShipmentController.deliverShipment);

export default router;
