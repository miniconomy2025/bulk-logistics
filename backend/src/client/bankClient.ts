import { TransactionStatus } from "../enums";
import { getCategoryIdByName, insertIntoTransactionLedger, saveLoanDetails } from "../models/transactionsRepository";
import { getTransactionStatusByName } from "../models/transactionStatusRepository";
import {
    AllLoansInfoResponse,
    CreateAccountResponse,
    LoanApplicationRequest,
    LoanApplicationResponse,
    TransactionRequest,
    TransactionResponse,
    type AccountDetails,
    type LoanInfoResponse,
} from "../types";
import { simulatedClock } from "../utils";
import AppError from "../utils/errorHandlingMiddleware/appError";
import { BaseApiClient } from "./baseClient";

class BankClient extends BaseApiClient {
    constructor() {
        super("https://commercial-bank-api.projects.bbdgrad.com/api", "Bank");
    }

    public async applyForLoan(loanDetails: LoanApplicationRequest): Promise<LoanApplicationResponse> {
        try {
            console.log("---APPLYING FOR LOAN---");
            console.log("Loan request: ", loanDetails);
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
                        response.data.loan_number,
                    );
                }
            }
            return response.data;
        } catch (error: any) {
            throw new AppError(error, 500);
        }
    }

    public async getAllLoanDetails(): Promise<AllLoansInfoResponse> {
        try {
            const response = await this.client.get<AllLoansInfoResponse>("/loan");
            if (response.data.success && response.data.loans.length > 0) {
                return response.data;
            }
            return {
                success: false,
                total_outstanding_amount: 0,
                loans: [],
            };
        } catch (error: any) {
            throw new AppError(error, 500);
        }
    }

    public async createAccount(notificationUrl: string): Promise<CreateAccountResponse> {
        try {
            const response = await this.client.post<CreateAccountResponse>("/account", { notification_url: notificationUrl });
            return response.data;
        } catch (error: any) {
            throw new AppError(error, 500);
        }
    }

    public async getAccountDetails(): Promise<AccountDetails> {
        try {
            const response = await this.client.get<AccountDetails>("/account/me");
            return response.data;
        } catch {
            return {
                success: false,
            };
        }
    }

    public async getBalance(): Promise<AccountDetails> {
        try {
            const response = await this.client.get<AccountDetails>("/account");
            return response.data;
        } catch (error: any) {
            throw new AppError(error, 500);
        }
    }

    public async makePayment({
        paymentDetails,
        transactionCategory,
    }: {
        paymentDetails: TransactionRequest;
        transactionCategory: string;
    }): Promise<TransactionResponse> {
        const response = await this.client.post<TransactionResponse>("/transaction", paymentDetails);
        try {
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
        } catch (error: any) {
            throw new AppError(error, 500);
        }
    }
}

export const bankApiClient = new BankClient();
