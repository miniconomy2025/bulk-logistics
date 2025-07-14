import { useEffect, useState, type JSX } from "react";
import type { TransactionsResponse } from "../types";
import Transactions from "../data/transactions";
import { formatDate } from "../utils/format-date";

interface RenderPaginationButtonsProps {
    totalPages: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}

const renderPaginationButtons = (options: RenderPaginationButtonsProps): JSX.Element[] => {
    const buttons: JSX.Element[] = [];
    for (let i = 1; i <= options.totalPages; i++) {
        const isActive = i === options.currentPage;
        buttons.push(
            <button
                key={i}
                className={`rounded-md border border-gray-300 px-3 py-1 transition-colors duration-200 ${
                    isActive ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                }`}
                onClick={() => options.onPageChange(i)}
                disabled={isActive}
            >
                {i}
            </button>,
        );
    }
    return buttons;
};

const AllTransactions: React.FC = () => {
    const [transactions, setRecentTransactions] = useState<TransactionsResponse>({
        page: 1,
        limit: 20,
        totalPages: 2,
        totalTransactions: 0,
        transactions: [
            {
                company: "",
                amount: "",
                transaction_date: "",
                transaction_type: "",
                pickup_request_id: 0,
            },
        ],
    });
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactionsData = async (page: number, limit: number): Promise<TransactionsResponse> => {
        const response = await Transactions.getAll({ limit, page });
        const data: TransactionsResponse = await response.json();
        return data;
    };

    const handlePageChange = (page: number) => {
        if (page < 1 || page > transactions.totalPages || page === currentPageIndex) {
            return; 
        }
        setCurrentPageIndex(page);
        setLoading(true);
        fetchTransactionsData(page, transactions.limit)
            .then((result) => {
                setRecentTransactions(result);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching transactions:", err);
                setError("Failed to load transactions.");
                setLoading(false);
            });
    };

    useEffect(() => {
        setLoading(true);
        fetchTransactionsData(currentPageIndex, transactions.limit)
            .then((result) => {
                setRecentTransactions(result);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching initial transactions:", err);
                setError("Failed to load initial transactions.");
                setLoading(false);
            });
    }, [currentPageIndex, transactions.limit]);

    if (loading) {
        return <div className="py-8 text-center">Loading transactions...</div>;
    }

    if (error) {
        return <div className="py-8 text-center text-red-600">Error fetching transactions. Please try again.</div>;
    }

    return (
        <>
            <div className="space-y-4">
                {transactions.transactions.length > 0 ? (
                    transactions.transactions.map((transaction, index) => {
                        const transactionType =
                            transaction.transaction_type === "PAYMENT_RECEIVED" || transaction.transaction_type === "LOAN" ? "credit" : "debit";

                        return (
                            <div
                                key={index}
                                className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0"
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {transactionType === "credit" ? `Payment from ${transaction.company}` : "Loan repayment"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {transactionType === "credit" ? `Shipment #${transaction.pickup_request_id}` : "Loan disbursement"}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-semibold ${transactionType === "credit" ? "text-green-600" : "text-red-600"}`}>
                                        {transactionType === "credit" ? "+ " : "- "}Ð {transaction.amount}
                                    </p>
                                    <p className="text-xs text-gray-500">{formatDate(transaction.transaction_date)}</p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 text-center text-gray-500">No transactions found.</div>
                )}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
                <p>
                    Showing {(currentPageIndex - 1) * transactions.limit + 1} -{" "}
                    {Math.min(currentPageIndex * transactions.limit, transactions.totalTransactions)} of{" "}
                    {transactions.totalTransactions.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} transactions
                </p>
                <div className="flex space-x-2">
                    <button
                        className="rounded-md border border-gray-300 px-3 py-1 transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handlePageChange(currentPageIndex - 1)}
                        disabled={currentPageIndex === 1}
                    >
                        Previous
                    </button>
                    {renderPaginationButtons({
                        totalPages: transactions.totalPages,
                        currentPage: currentPageIndex,
                        onPageChange: handlePageChange,
                    })}
                    <button
                        className="rounded-md border border-gray-300 px-3 py-1 transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handlePageChange(currentPageIndex + 1)}
                        disabled={currentPageIndex === transactions.totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        </>
    );
};

export default AllTransactions;
