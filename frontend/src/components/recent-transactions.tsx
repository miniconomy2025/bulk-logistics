interface RecentTransactionProps {
    title: string;
    description: string;
    amount: string;
    date: string;
    type: "credit" | "debit";
}

export const RecentTransaction: React.FC<RecentTransactionProps> = ({ title, description, amount, date, type }) => (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0">
        <div>
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className="text-right">
            <p className={`text-sm font-semibold ${type === "credit" ? "text-green-600" : "text-red-600"}`}>{amount}</p>
            <p className="text-xs text-gray-500">{date}</p>
        </div>
    </div>
);
