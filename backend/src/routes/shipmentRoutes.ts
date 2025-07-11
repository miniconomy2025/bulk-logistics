import express from "express";
import { rateLimiter } from "../utils";
import ShipmentController from "../controllers/shipmentController";

const router = express.Router();

router.get("/", rateLimiter(), ShipmentController.getShipments);
router.get("/active", rateLimiter(), ShipmentController.getActiveShipments);

export default router;
