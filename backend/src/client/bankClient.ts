import { CreateAccountResponse, GetBalanceResponse, LoanApplicationRequest, LoanApplicationResponse } from "../types";
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
        const response = await this.client.post<CreateAccountResponse>("/account", { notificationUrl });
        return response.data;
    }

    public async getBalance(): Promise<GetBalanceResponse> {
        const response = await this.client.get<GetBalanceResponse>("/account/me/balance");
        return response.data;
    }
}

export const bankApiClient = new BankClient();
