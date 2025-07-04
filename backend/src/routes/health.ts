import express from "express";
import rateLimit from "express-rate-limit";

const router = express.Router();

const pickupRequestsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: "Too many shipment request attempts. Please try again later.",
    },
});

router.get("", pickupRequestsLimiter, (_, response) => {
    response.status(200).json({ message: "API is up" });
});

export default router;
