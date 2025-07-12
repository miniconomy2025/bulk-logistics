import express from "express";
import rateLimit from "express-rate-limit";

const router = express.Router();

router.get("", (_, response) => {
    response.status(200).json({ message: "API is up" });
});

export default router;
