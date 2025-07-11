import { TransactionStatus } from "../enums";
import { getCategoryIdByName, insertIntoTransactionLedger, saveLoanDetails } from "../models/transactionsRepository";
import { getTransactionStatusByName } from "../models/transactionStatus";
import {
    CreateAccountResponse,
    GetBalanceResponse,
    LoanApplicationRequest,
    LoanApplicationResponse,
    TransactionRequest,
    TransactionResponse,
    type LoanInfoResponse,
} from "../types";
import { simulatedClock } from "../utils";
import { BaseApiClient } from "./baseClient";

class BankClient extends BaseApiClient {
    constructor() {
        super(process.env.BANK_API_BASE_URL!, "Bank");
    }

    public async applyForLoan(loanDetails: LoanApplicationRequest): Promise<LoanApplicationResponse> {
        const response = await this.client.post<LoanApplicationResponse>("/loan", loanDetails);

        if (response.data.success) {
            const loanInfo = await this.client.get<LoanInfoResponse>(`/loan/${response.data.loan_number}`);

            if (loanInfo.data.success) {
                await saveLoanDetails(
                    {
                        loan_number: loanInfo.data.loan_number,
                        interest_rate: loanInfo.data.interest_rate,
                        initial_amount: loanInfo.data.initial_amount,
                    },
                    response.data.initial_transaction_id.toString(),
                );
            }
        }
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
            const transactionDate = simulatedClock.getCurrentDate().toISOString().split("T")[0];
            const transactionStatus = response.data.success ? TransactionStatus.Completed : TransactionStatus.Failed;
            const status = await getTransactionStatusByName(transactionStatus);
            const transactionCategoryId = await getCategoryIdByName(transactionCategory);

            await insertIntoTransactionLedger({
                commercial_bank_transaction_id: response.data.transaction_number,
                payment_reference_id: response.data.transaction_number,
                transaction_category_id: transactionCategoryId,
                amount: paymentDetails.amount,
                transaction_date: transactionDate,
                transaction_status_id: status?.transaction_status_id!,
                related_pickup_request_id: null,
                loan_id: null,
                related_thoh_order_id: paymentDetails.description,
            });
        }
        return response.data;
    }
}

export const bankApiClient = new BankClient();
