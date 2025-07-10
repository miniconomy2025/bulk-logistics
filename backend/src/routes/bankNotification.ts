import { Router } from "express";

import { rateLimiter } from "../utils";
import { bankNotification } from "../controllers/bank-notification";

const router = Router();

router.post("/notification", rateLimiter(), bankNotification);

export default router;
