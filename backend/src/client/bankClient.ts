import { BaseApiClient } from "./baseClient";

interface LoanApplicationRequest {
    amount: number;
    companyIdentifier: string;
}

interface LoanApplicationResponse {
    loanId: string;
    status: "APPROVED" | "REJECTED";
}

interface CreateAccountResponse {
    account_number: string;
    net_balance: number;
}

interface GetBalanceResponse {
    balance: number;
}

class BankClient extends BaseApiClient {
    constructor() {
        super(process.env.BANK_API_BASE_URL!, "Bank");
    }

    public async applyForLoan(loanDetails: LoanApplicationRequest): Promise<LoanApplicationResponse> {
        const response = await this.client.post<LoanApplicationResponse>("/loans/apply", loanDetails);
        return response.data;
    }

    public async createAccount(notificationUrl: string): Promise<CreateAccountResponse> {
        const response = await this.client.post<CreateAccountResponse>("/account", { notificationUrl });
        return response.data;
    }

    public async getBalance(): Promise<GetBalanceResponse> {
        const response = await this.client.get<GetBalanceResponse>("/account/me/balance");
        return response.data;
    }
}

export const bankApiClient = new BankClient();
