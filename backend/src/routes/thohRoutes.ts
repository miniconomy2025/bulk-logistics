import express from "express";
import { startSimulation, truckDelivery, truckFailure } from "../controllers/thohController";
import { rateLimiter } from "../utils";

const router = express.Router();

router.post("/trucks/failure", rateLimiter(), truckFailure);
router.post("/trucks/delivery", rateLimiter(), truckDelivery);
router.post("/simulation", rateLimiter(), startSimulation);

export default router;
