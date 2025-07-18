import { Request, Response } from "express";
import {
    findTransactionById,
    getMonthlyRevenueExpenses,
    getRecentTransactionRepo,
    getTopRevenueSourcesRepo,
    getTotals,
    getTotalTransactionsCountRepo,
    getTransactionBreakdown,
    insertIntoTransactionLedger,
} from "../models/transactionsRepository";

export async function getTransactionById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const result = await findTransactionById(id);

    if (!result.ok) {
        console.error(result.error);
        res.status(500).json({ message: "Internal server error." });
        return;
    }

    if (result.value.rowCount === 0) {
        res.status(404).json({ error: "Transaction not found." });
        return;
    }

    res.status(200).json({ transaction: result.value.rows[0] });
}

export async function createTransaction(req: Request, res: Response): Promise<void> {
    const {
        commercial_bank_transaction_id,
        payment_reference_id,
        transaction_category_id,
        amount,
        transaction_date,
        transaction_status_id,
        related_pickup_request_id,
        loan_id,
        related_thoh_order_id,
    } = req.body;

    const result = await insertIntoTransactionLedger({
        commercial_bank_transaction_id,
        payment_reference_id,
        transaction_category_id,
        amount,
        transaction_date,
        transaction_status_id,
        related_pickup_request_id,
        loan_id,
        related_thoh_order_id,
    });

    if (result.ok) {
        res.status(201).json({ transaction: result.value.rows[0] });
    } else {
        console.error(result.error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getTransactionTotals(_: Request, res: Response): Promise<void> {
    const result = await getTotals();
    if (result.ok) {
        res.status(200).json({ transaction: result.value.rows });
    } else {
        console.error(result.error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getMonthlyTransactions(_: Request, res: Response): Promise<void> {
    const result = await getMonthlyRevenueExpenses();

    if (result.ok) {
        res.status(200).json({ transaction: result.value.rows });
    } else {
        console.error(result.error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getTopRevenueSources(_: Request, res: Response): Promise<void> {
    const result = await getTopRevenueSourcesRepo();

    if (result.ok) {
        res.status(200).json({ transaction: result.value.rows });
    } else {
        console.error(result.error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getCostsBreakdown(_: Request, res: Response): Promise<void> {
    const result = await getTransactionBreakdown();
    if (result.ok) {
        res.status(200).json({ transaction: result.value.rows });
    } else {
        console.error(result.error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getRecentTransactions(request: Request, res: Response): Promise<void> {
    const page = parseInt(request.query.page as string) || 1;
    const limit = parseInt(request.query.limit as string) || 20;

    if (isNaN(page) || page < 1) {
        res.status(400).json({ error: "Invalid page number. Page must be a positive integer." });
        return;
    }

    if (isNaN(limit) || limit < 1) {
        res.status(400).json({ error: "Invalid limit number. Limit must be a positive integer." });
        return;
    }

    const transactionsResult = await getRecentTransactionRepo(page, limit);
    const totalCountResult = await getTotalTransactionsCountRepo();

    if (transactionsResult.ok && totalCountResult.ok) {
        const totalTransactions = totalCountResult.value;
        const totalPages = Math.ceil(totalTransactions / limit);

        res.status(200).json({
            page,
            limit,
            totalPages,
            totalTransactions,
            transactions: transactionsResult.value.rows,
        });
    } else {
        res.status(500).json({ error: "Internal Server Error" });
    }
}
