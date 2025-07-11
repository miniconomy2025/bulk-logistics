import { Router } from "express";
import {
    getTransactions,
    getTransactionById,
    createTransaction,
    getTransactionTotals,
    getMonthlyTransactions,
    getTopRevenueSources,
    getCostsBreakdown,
    getRecentTransactions,
} from "../controllers/transactionsController";

import { rateLimiter } from "../utils";

const router = Router();

router.get("/", rateLimiter(), getTransactions);
router.post("/", createTransaction);
router.get("/totals", getTransactionTotals);
router.get("/monthly", getMonthlyTransactions);
router.get("/top-sources", getTopRevenueSources);
router.get("/breakdown", getCostsBreakdown);
router.get("/recent", getRecentTransactions);
router.get("/:id", getTransactionById);

export default router;
