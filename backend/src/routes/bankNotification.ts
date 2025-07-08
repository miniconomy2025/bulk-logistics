import { Router } from "express";

import { rateLimiter } from "../utils";
import { bankNofication } from "../controllers/bank-notification";

const router = Router();

router.post("/notification", rateLimiter, bankNofication);

export default router;
