export interface LoanApplicationRequest {
    amount: number;
}

export interface LoanApplicationResponse {
    success: boolean;
    loan_number: string;
    initial_transaction_id: number;
    interest_rate: string;
    started_at: string;
    write_off: boolean;
}

export interface LoanInfoResponse {
    success: boolean;
    loan_number: string;
    initial_amount: number;
    interest_rate: string;
    started_at: string;
    write_off: boolean;
    outstanding_amount: string;
    payments: LoanPaymentResponse[];
}

interface LoanPaymentResponse {
    timestamp: string;
    amount: number;
    is_interest: boolean;
}

export interface CreateAccountResponse {
    account_number: string;
}

export interface AccountDetails {
    success: boolean;
    account_number?: string;
    net_balance?: number;
    notification_url?: string;
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
