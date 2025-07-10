import express from "express";
import { handleTruckFailure, startSimulation, truckDelivery } from "../controllers/thohController";

const router = express.Router();

router.post("/truck/failure", handleTruckFailure);
router.post("/truck/delivery", truckDelivery);
router.post("/simulation", startSimulation);

export default router;
