import { Request, Response } from "express";
import { BankNotificationPayload } from "../types";
import { createLedgerEntry, updatePaymentStatusForPickupRequest } from "../models/transactionsRepository";
import { findAccountNumberByCompanyName } from "../models/companyRepository";
import AppError from "../utils/errorHandlingMiddleware/appError";
import catchAsync from "../utils/errorHandlingMiddleware/catchAsync";

export const bankNotification = catchAsync(async (req: Request, res: Response): Promise<void> => {
    console.log('-------BANK NOTIFICATION RECEIVED------------------')
    const transaction = req.body as BankNotificationPayload;
    console.log(transaction)
    const bankAccount = await findAccountNumberByCompanyName("bulk-logistics");

    if (!validateTransaction(transaction)) {
        res.status(400).json({ error: "Invalid transaction data" });
        return;
    }

    if (transaction.from !== bankAccount && transaction.to !== bankAccount) {
        res.status(400).json({ error: "Transaction does not involve our account" });
        return;
    }

    const statusName = transaction.status;
    const categoryId = transaction.status;
    try {
        const confirmPaymentForPickupRequestResult = await updatePaymentStatusForPickupRequest(transaction);
        if (confirmPaymentForPickupRequestResult && confirmPaymentForPickupRequestResult > 0) {
            res.status(201).json({ message: "Transaction recorded" });
            return;
        }
    } catch (error) {
        throw new AppError("Something went wrong!", 500);
    }

    const response = await createLedgerEntry({ ...transaction, statusName });

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
});

function validateTransaction(t: BankNotificationPayload): boolean {
    return !!(t.transaction_number && t.status && t.amount !== undefined && t.timestamp !== undefined && t.from && t.to);
}
