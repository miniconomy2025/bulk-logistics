import express from "express";
import { rateLimiter } from "../utils";
import { createPickupRequest, getAllPickupRequests, getPickupRequest, getPickupRequestsByCompany } from "../controllers/pickupRequestController";

const router = express.Router();

router.post("", rateLimiter(), createPickupRequest);
router.get("", getAllPickupRequests);
router.get("/:id", rateLimiter(), getPickupRequest);
router.get("/company/:companyName", rateLimiter(), getPickupRequestsByCompany);

export default router;
