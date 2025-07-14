import type { RecentTransactionsItem } from "../types";
import { formatDate } from "../utils/format-date";

interface RecentTransactionProps {
    item: RecentTransactionsItem;
}

export const RecentTransaction: React.FC<RecentTransactionProps> = ({ item }) => {
    const transactionType = item.transaction_type === "PAYMENT_RECEIVED" || item.transaction_type === "LOAN" ? "credit" : "debit";

    return (
        <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0">
            <div>
                <p className="text-sm font-medium text-gray-900">
                    {transactionType === "credit" ? `Payment from ${item.company}` : "Loan repayment"}
                </p>
                <p className="text-xs text-gray-500">{transactionType === "credit" ? `Shipment #${item.pickup_request_id}` : "Loan disbursement"}</p>
            </div>
            <div className="text-right">
                <p className={`text-sm font-semibold ${transactionType === "credit" ? "text-green-600" : "text-red-600"}`}>
                    {transactionType === "credit" ? "+ " : "- "}Ð {item.amount}
                </p>
                <p className="text-xs text-gray-500">{formatDate(item.transaction_date)}</p>
            </div>
        </div>
    );
};
