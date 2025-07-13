const AllTransactions: React.FC = () => {
    const transactions = [
        {
            id: "1",
            type: "payment",
            icon: "arrow_upward",
            name: "John Doe",
            date: "Today, 2:30 PM",
            txnId: "#TXN123456",
            amount: "+1,250.00",
            status: "Completed",
            statusColor: "text-green-600",
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
        },
        {
            id: "2",
            type: "transfer",
            icon: "arrow_downward",
            name: "Bank Account",
            date: "Today, 1:45 PM",
            txnId: "#TXN123457",
            amount: "-500.00",
            status: "Completed",
            statusColor: "text-green-600",
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
        },
        {
            id: "3",
            type: "refund",
            icon: "refresh",
            name: "Order #12345",
            date: "Yesterday, 4:45 PM",
            txnId: "#TXN123458",
            amount: "$75.50",
            status: "Pending",
            statusColor: "text-yellow-600",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
        },
        {
            id: "4",
            type: "payment",
            icon: "arrow_upward",
            name: "Sarah Smith",
            date: "Yesterday, 11:20 AM",
            txnId: "#TXN123453",
            amount: "+2,100.00",
            status: "Completed",
            statusColor: "text-green-600",
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
        },
        {
            id: "5",
            type: "failed",
            icon: "close",
            name: "Payment Attempt",
            date: "2 days ago, 3:30 PM",
            txnId: "#TXN123452",
            amount: "$350.00",
            status: "Failed",
            statusColor: "text-red-600",
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
        },
        {
            id: "6",
            type: "payment",
            icon: "arrow_upward",
            name: "Mike Johnson",
            date: "3 days ago, 9:15 AM",
            txnId: "#TXN123451",
            amount: "+890.75",
            status: "Completed",
            statusColor: "text-green-600",
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
        },
        {
            id: "7",
            type: "office_supplies",
            icon: "arrow_downward",
            name: "Office Supplies Payment",
            date: "4 days ago, 2:00 PM",
            txnId: "#TXN123450",
            amount: "-425.30",
            status: "Completed",
            statusColor: "text-green-600",
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
        },
        {
            id: "8",
            type: "payment",
            icon: "arrow_upward",
            name: "Lisa Chen",
            date: "5 days ago, 7:45 PM",
            txnId: "#TXN123449",
            amount: "+1,675.00",
            status: "Completed",
            statusColor: "text-green-600",
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
        },
        {
            id: "9",
            type: "refund",
            icon: "refresh",
            name: "Order #12340",
            date: "6 days ago, 12:30 PM",
            txnId: "#TXN123448",
            amount: "$125.00",
            status: "Completed",
            statusColor: "text-green-600",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
        },
    ];

    return (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex w-full max-w-xs items-center rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200">
                    <span className="material-symbols-outlined mr-2 text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="flex-grow bg-transparent text-sm outline-none"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {transactions.map((transaction) => (
                    <div
                        key={transaction.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors duration-200 hover:bg-gray-50"
                    >
                        <div className="flex items-center space-x-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${transaction.iconBg}`}>
                                <span className={`material-symbols-outlined text-lg ${transaction.iconColor}`}>{transaction.icon}</span>
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                    {transaction.type === "payment" && "Payment from "}
                                    {transaction.type === "transfer" && "Transfer to "}
                                    {transaction.type === "refund" && "Refund - "}
                                    {transaction.type === "failed" && "Failed "}
                                    {transaction.type === "office_supplies" && "Office Supplies "}
                                    {transaction.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {transaction.date} &bull; <span className="font-mono text-xs">{transaction.txnId}</span>
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-gray-900">{transaction.amount}</p>
                            <p className={`text-sm ${transaction.statusColor}`}>{transaction.status}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
                <p>Showing 1-10 of 2,847 transactions</p>
                <div className="flex space-x-2">
                    <button className="rounded-md border border-gray-300 px-3 py-1 transition-colors duration-200 hover:bg-gray-100">Previous</button>
                    <button className="rounded-md border border-blue-500 bg-blue-50 px-3 py-1 font-semibold text-blue-700">1</button>
                    <button className="rounded-md border border-gray-300 px-3 py-1 transition-colors duration-200 hover:bg-gray-100">2</button>
                    <button className="rounded-md border border-gray-300 px-3 py-1 transition-colors duration-200 hover:bg-gray-100">3</button>
                    <button className="rounded-md border border-gray-300 px-3 py-1 transition-colors duration-200 hover:bg-gray-100">Next</button>
                </div>
            </div>
        </section>
    );
};

export default AllTransactions;
