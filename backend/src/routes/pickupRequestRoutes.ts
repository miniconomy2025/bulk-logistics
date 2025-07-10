import express from "express";
import rateLimit from "express-rate-limit";
import { createPickupRequest, getPickupRequest, getPickupRequestsByCompany } from "../controllers/pickupRequestController";

const router = express.Router();

const pickupRequestsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: "Too many shipment request attempts. Please try again later.",
    },
});

router.post("", createPickupRequest);
router.get("/:id", getPickupRequest);
router.get("/company/:companyName", getPickupRequestsByCompany);

export default router;
