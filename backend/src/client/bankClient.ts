/*
================================================================================
| FILE: /src/clients/BankApiClient.ts (NEW)
| DESC: A specific client for interacting with the Commercial Bank's REST API.
================================================================================
*/
import { BaseApiClient } from './baseClient';

// Define interfaces for the Bank API's request/response shapes
interface LoanApplicationRequest {
    amount: number;
    companyIdentifier: string;
}

interface LoanApplicationResponse {
    loanId: string;
    status: 'APPROVED' | 'REJECTED';
}

class BankApiClient extends BaseApiClient {
    // The constructor calls the parent constructor with the Bank API's specific
    // base URL (from environment variables) and a service name for logging.
    constructor() {
        super(process.env.BANK_API_BASE_URL!, 'Bank');
    }

    /**
     * Makes a POST request to the bank to apply for a loan.
     * @param loanDetails The details of the loan application.
     */
    public async applyForLoan(loanDetails: LoanApplicationRequest): Promise<LoanApplicationResponse> {
        // The `this.client.post` method comes from the BaseApiClient.
        // It will automatically use mTLS and handle errors.
        const response = await this.client.post<LoanApplicationResponse>('/loans/apply', loanDetails);
        return response.data;
    }

    // You would add other methods here for other bank endpoints, e.g.:
    // public async getBalance(accountId: string): Promise<BalanceResponse> { ... }
    // public async makePayment(paymentDetails: PaymentRequest): Promise<PaymentResponse> { ... }
}

// Export a single instance so the rest of your app reuses the same client.
export const bankApiClient = new BankApiClient();
