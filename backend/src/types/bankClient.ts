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

export interface TransactionRequest {
    to_account_number: string;
    to_bank_name: string;
    amount: number;
    description: string;
}

export interface TransactionResponse {
    success: true;
    transaction_number: string;
    status: string;
}
