import express from "express";
import { startSimulation, truckDelivery, truckFailure, stopSimulation } from "../controllers/thohController";
import { rateLimiter } from "../utils";

const router = express.Router();

router.post("/trucks/failure", rateLimiter(), truckFailure);
router.post("/trucks/delivery", rateLimiter(), truckDelivery);
router.post("/simulation", rateLimiter(), startSimulation);
router.post("/simulation/stop", rateLimiter(), stopSimulation);

export default router;
