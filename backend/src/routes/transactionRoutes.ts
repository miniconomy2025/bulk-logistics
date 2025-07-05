import { Router } from "express";
import {
    getTransactions,
    getTransactionById,
    createTransaction,
    getTransactionTotals,
    getActiveShipments,
    getMonthlyTransactions,
    getTopRevenueSources,
} from "../controllers/transactionsController";

import { rateLimiter } from "../utils";

const router = Router();

router.get("/", rateLimiter(), getTransactions);
router.post("/", createTransaction);
router.get("/totals", getTransactionTotals);
router.get("/active-shipments", getActiveShipments);
router.get("/monthly", getMonthlyTransactions);
router.get("/top-sources", getTopRevenueSources);
router.get("/:id", getTransactionById);

export default router;
