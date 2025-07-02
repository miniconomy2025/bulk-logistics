import express from "express";
import rateLimit from "express-rate-limit";
import { createPickupRequest, getPickupRequest } from "../controllers/pickupRequestController";

const router = express.Router();

const pickupRequestsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: "Too many shipment request attempts. Please try again later.",
    },
});

router.post("", /*pickupRequestsLimiter,*/ createPickupRequest);
router.get("/:id", /*pickupRequestsLimiter*/ getPickupRequest);

export default router;
