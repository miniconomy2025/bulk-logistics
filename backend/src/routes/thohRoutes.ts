import express from "express";
import { startSimulation, truckDelivery, truckFailure, stopSimulation } from "../controllers/thohController";
import { rateLimiter } from "../utils";

const router = express.Router();

router.post("/trucks/failure", rateLimiter(), truckFailure);
router.post("/truck/delivery", rateLimiter(), truckDelivery);
router.post("/simulation", rateLimiter(), startSimulation);
router.delete("/simulation", rateLimiter(), stopSimulation);

export default router;
