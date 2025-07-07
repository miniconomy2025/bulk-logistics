import { Request, Response } from "express";
import {
    findTransactionById,
    findTransactions,
    getActiveShipmentsCount,
    getMonthlyRevenueExpenses,
    getTopRevenueSourcesRepo,
    getTotals,
    getTransactionBreakdown,
    insertIntoTransactionLedger,
} from "../models/transactionsRepository";

export async function getTransactions(_: Request, res: Response): Promise<void> {
    const result = await findTransactions();
    if (result.ok) {
        res.status(200).json({ transactions: result.value });
    } else {
        console.error(result.error);
        res.status(500).json({ message: "Internal server error." });
    }
}

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
        related_loan_id,
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
        related_loan_id,
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

export async function getActiveShipments(_: Request, res: Response): Promise<void> {
    const result = await getActiveShipmentsCount();
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
