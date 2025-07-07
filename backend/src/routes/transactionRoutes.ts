import { Router } from "express";
import {
    getTransactions,
    getTransactionById,
    createTransaction,
    getTransactionTotals,
    getActiveShipments,
    getMonthlyTransactions,
    getDashboard,
    getTopRevenueSources,
} from "../controllers/transactionsController";

import { rateLimiter } from "../utils";

const router = Router();

router.get("/", rateLimiter(), getTransactions);
router.get("/:id", getTransactionById);
router.post("/", createTransaction);
router.get("/totals", getTransactionTotals);
router.get("/active-shipments", getActiveShipments);
router.get("/monthly", getMonthlyTransactions);
router.get("/dashboard", getDashboard);
router.get("/top-sources", getTopRevenueSources);

export default router;
