import API from "./api";

interface GetTransactionProps {
    transactionId: string;
}

interface CreateTransctionProps {
    commercial_bank_transaction_id: string;
    payment_reference_id: string;
    transaction_category_id: string;
    amount: number;
    transaction_date: Date;
    transaction_status_id: string;
    related_pickup_request_id?: string;
    related_loan_id?: string;
    related_thoh_order_id?: string;
}

export default class Transactions {
    private static baseEndpoint = "transactions/";

    public static async getAll() {
        return await API.get(Transactions.baseEndpoint);
    }

    public static async breakdown() {
        return await API.get(Transactions.baseEndpoint + "breakdown");
    }

    public static async create(options: CreateTransctionProps) {
        return await API.post(Transactions.baseEndpoint + "transactions", { payload: options });
    }

    public static async totals() {
        return await API.get(Transactions.baseEndpoint + "totals");
    }
    
    public static async activeShipments() {
        return await API.get(Transactions.baseEndpoint + "active-shipments");
    }

    public static async monthly() {
        return await API.get(Transactions.baseEndpoint + "monthly");
    }

    public static async dashboard() {
        return await API.get(Transactions.baseEndpoint + "dashboard");
    }

    public static async topSources() {
        return await API.get(Transactions.baseEndpoint + "top-sources");
    }

    public static async get(options: GetTransactionProps) {
        return await API.get(Transactions.baseEndpoint + options.transactionId);
    }
}
