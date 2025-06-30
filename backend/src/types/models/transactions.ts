export interface TransactionCategory {
  transaction_category_id: number;
  name: string;
}

export interface TransactionStatus {
  transaction_status_id: number;
  status: string;
}

export interface BankTransactionLedger {
  transaction_ledger_id: number;
  commercial_bank_transaction_id?: string | null;
  payment_reference_id?: string | null; // UUID
  transaction_category_id: number;
  amount: number;
  transaction_date: string;
  transaction_status_id: number;
  related_pickup_request_id?: number | null;
  related_loan_id?: number | null;
  related_thoh_order_id?: string | null;
}
