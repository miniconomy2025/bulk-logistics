export interface LoanApplicationRequest {
    amount: number;
    companyIdentifier: string;
}

export interface LoanApplicationResponse {
    loanId: string;
    status: "APPROVED" | "REJECTED";
}

export interface CreateAccountResponse {
    account_number: string;
    net_balance: number;
}

export interface GetBalanceResponse {
    balance: number;
}
