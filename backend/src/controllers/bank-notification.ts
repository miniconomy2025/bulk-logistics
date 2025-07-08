import { Request, Response } from "express";
import { BankNotificationPayload } from "../types";
import { createLedgerEntry, findAccountNumber } from "../models/transactionsRepository";

export const bankNofication = async (req: Request, res: Response): Promise<void> => {
    const transaction = req.body as BankNotificationPayload;

    const bankAccount = await findAccountNumber("bulk-logistics");

    if (!validateTransaction(transaction)) {
        res.status(400).json({ error: "Invalid transaction data" });
        return;
    }

    if (transaction.from !== bankAccount && transaction.to !== bankAccount) {
        res.status(400).json({ error: "Transaction does not involve our account" });
        return;
    }

    const response = await createLedgerEntry(transaction);

    switch (response) {
        case 409:
            res.status(409).json({ error: "Duplicate transaction" });
            break;
        case 201:
            res.status(201).json({ message: "Transaction recorded" });
            break;
        default:
            res.status(500).json({ error: "Internal server error" });
            break;
    }
};

function validateTransaction(t: BankNotificationPayload): boolean {
    return !!(t.transaction_number && t.status && t.amount !== undefined && t.timestamp !== undefined && t.from && t.to);
}
