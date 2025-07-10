import express from "express";
import { startSimulation, truckDelivery, truckFailure } from "../controllers/thohController";

const router = express.Router();

router.post("/truck/failure", truckFailure);
router.post("/truck/delivery", truckDelivery);
router.post("/simulation", startSimulation);

export default router;
