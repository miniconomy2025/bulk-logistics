import express from "express";
import { getShipmentStatuses } from "../controllers/shipmentStatusController";

const router = express.Router();

router.get("", getShipmentStatuses);

export default router;
