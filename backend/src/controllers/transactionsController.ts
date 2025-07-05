import { Router, Request, Response } from "express";
import { RateLimitRequestHandler } from "express-rate-limit";

import { rateLimiter } from "../utils";
import {
    findTransactionById,
    findTransactions,
    getActiveShipmentsCount,
    getTotals,
    getTransactionBreakdown,
    insertIntoTransactionLedger,
} from "../models/transactionsRepository";

class TransactionsController {
    public static async getTransactions(_: Request, response: Response): Promise<void> {
        const result = await findTransactions();

        if (result.ok) {
            response.status(200).json({ transactions: result.value });
        } else {
            console.error(result.error);
            response.status(500).json({ message: "Internal server error." });
        }
    }

    public static async getTransactionById(request: Request, response: Response): Promise<void> {
        const { id } = request.params;
        const result = await findTransactionById(id);

        if (!result.ok) {
            console.error(result.error);
            response.status(500).json({ message: "Internal server error." });
            return;
        }

        if (result.value.rowCount === 0) {
            response.status(404).json({ error: "Transaction not found." });
            return;
        }

        response.status(200).json({ transaction: result.value.rows[0] });
    }

    public static async createTransaction(request: Request, response: Response): Promise<void> {
        const {
            commercial_bank_transaction_id,
            payment_reference_id,
            transaction_category_id,
            amount,
            transaction_date,
            transaction_status_id,
            related_pickup_request_id,
            related_loan_id,
            related_thoh_order_id,
        } = request.body;

        const result = await insertIntoTransactionLedger({
            commercial_bank_transaction_id,
            payment_reference_id,
            transaction_category_id,
            amount,
            transaction_date,
            transaction_status_id,
            related_pickup_request_id,
            related_loan_id,
            related_thoh_order_id,
        });

        if (result.ok) {
            response.status(201).json({ transaction: result.value.rows[0] });
        } else {
            console.error(result.error);
            response.status(500).json({ error: "Internal Server Error" });
        }
    }

    public static async getTransactionTotals(_: Request, response: Response): Promise<void> {
        const result = await getTotals();

        if (result.ok) {
            response.status(200).json({ transaction: result.value.rows });
        } else {
            console.error(result.error);
            response.status(500).json({ error: "Internal Server Error" });
        }
    }

    public static async getActiveShipments(_: Request, response: Response): Promise<void> {
        const result = await getActiveShipmentsCount();

        if (result.ok) {
            response.status(200).json({ transaction: result.value.rows });
        } else {
            console.error(result.error);
            response.status(500).json({ error: "Internal Server Error" });
        }
    }

    public static async getMonthlyTransactions(_: Request, response: Response): Promise<void> {
        const result = await getTransactionBreakdown();

        if (result.ok) {
            response.status(200).json({ transaction: result.value.rows });
        } else {
            console.error(result.error);
            response.status(500).json({ error: "Internal Server Error" });
        }
    }

    public static async getDashboard(_: Request, response: Response): Promise<void> {
        const result = await getTransactionBreakdown();

        if (result.ok) {
            response.status(200).json({ transaction: result.value.rows });
        } else {
            console.error(result.error);
            response.status(500).json({ error: "Internal Server Error" });
        }
    }

    public static async getTopRevenueSources(_: Request, response: Response): Promise<void> {
        const result = await getTransactionBreakdown();

        if (result.ok) {
            response.status(200).json({ transaction: result.value.rows });
        } else {
            console.error(result.error);
            response.status(500).json({ error: "Internal Server Error" });
        }
    }
}

export default TransactionsController;
