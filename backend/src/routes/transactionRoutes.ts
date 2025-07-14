import { Router } from "express";
import {
    getTransactionById,
    createTransaction,
    getTransactionTotals,
    getMonthlyTransactions,
    getTopRevenueSources,
    getCostsBreakdown,
    getRecentTransactions,
} from "../controllers/transactionsController";

const router = Router();

router.post("/", createTransaction);
router.get("/", getRecentTransactions);
router.get("/totals", getTransactionTotals);
router.get("/monthly", getMonthlyTransactions);
router.get("/top-sources", getTopRevenueSources);
router.get("/breakdown", getCostsBreakdown);
router.get("/:id", getTransactionById);

export default router;
