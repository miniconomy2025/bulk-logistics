import { TransactionStatus } from "../enums";
import { insertIntoTransactionLedger } from "../models/transactionsRepository";
import { getTransactionStatusByName } from "../models/transactionStatus";
import {
    CreateAccountResponse,
    GetBalanceResponse,
    LoanApplicationRequest,
    LoanApplicationResponse,
    TransactionRequest,
    TransactionResponse,
} from "../types";
import { simulatedClock } from "../utils";
import { BaseApiClient } from "./baseClient";

class BankClient extends BaseApiClient {
    constructor() {
        super(process.env.BANK_API_BASE_URL!, "Bank");
    }

    public async applyForLoan(loanDetails: LoanApplicationRequest): Promise<LoanApplicationResponse> {
        const response = await this.client.post<LoanApplicationResponse>("/loan", loanDetails);
        return response.data;
    }

    public async createAccount(notificationUrl: string): Promise<CreateAccountResponse> {
        const response = await this.client.post<CreateAccountResponse>("/account", { notificationUrl: notificationUrl });
        return response.data;
    }

    public async getBalance(): Promise<GetBalanceResponse> {
        const response = await this.client.get<GetBalanceResponse>("/account/me/balance");
        return response.data;
    }

    public async makePayment({
        paymentDetails,
        transactionCategory,
    }: {
        paymentDetails: TransactionRequest;
        transactionCategory: string;
    }): Promise<TransactionResponse> {
        const response = await this.client.post<TransactionResponse>("/transaction", paymentDetails);

        if (response.data) {
            const transactionDate = simulatedClock.getCurrentDate().toISOString().split("T")[0]; // The date format expected in the DB is YYYY-MM-DD
            const transactionStatus = response.data.success ? TransactionStatus.Completed : TransactionStatus.Failed;
            const status = await getTransactionStatusByName(transactionStatus);

            await insertIntoTransactionLedger({
                commercial_bank_transaction_id: response.data.transaction_number,
                payment_reference_id: response.data.transaction_number,
                transaction_category_id: transactionCategory,
                amount: String(paymentDetails.amount),
                transaction_date: transactionDate,
                transaction_status_id: status?.transaction_status_id ?? null,
                related_pickup_request_id: null,
                loan_id: null,
                related_thoh_order_id: paymentDetails.description,
            });
        }
        return response.data;
    }
}

export const bankApiClient = new BankClient();
