import express from "express";
import TransactionsController from "../controllers/transactionsController";
import { rateLimiter } from "../utils";

const router = express.Router();

const rateLimit = rateLimiter({ message: "Too many requests" });

router.get("/dashboard/", function (_, response) {
    response.status(404).json({ error: "Not found" });
});
router.get("/dashboard/totals", TransactionsController.getTransactionTotals);
router.get("/dashboard/active-shipments", TransactionsController.getActiveShipments);
router.get("/dashboard/monthly", TransactionsController.getMonthlyTransactions);
router.get("/dashboard/breakdown", TransactionsController.getDashboard);
router.get("/dashboard/top-sources", TransactionsController.getTopRevenueSources);

router.get("/", rateLimit, TransactionsController.getTransactions);
router.get("/:id/", rateLimit, TransactionsController.getTransactionById);
router.post("/", rateLimit, TransactionsController.createTransaction);

export default router;
