import { useEffect, useState, type JSX } from "react";
import type { TransactionsResponse } from "../types";
import Transactions from "../data/transactions";
import { formatDate } from "../utils/format-date";

interface RenderPaginationButtonsProps {
    totalPages: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    pageWindowSize?: number;
}

const renderPaginationButtons = (options: RenderPaginationButtonsProps): JSX.Element[] => {
    const { totalPages, currentPage, onPageChange, pageWindowSize = 2 } = options;
    const buttons: JSX.Element[] = [];

    let startPage = Math.max(1, currentPage - pageWindowSize);
    let endPage = Math.min(totalPages, currentPage + pageWindowSize);

    if (currentPage - pageWindowSize < 1) {
        endPage = Math.min(totalPages, endPage + (1 - (currentPage - pageWindowSize)));
    }

    if (currentPage + pageWindowSize > totalPages) {
        startPage = Math.max(1, startPage - (currentPage + pageWindowSize - totalPages));
    }

    const actualVisiblePages = endPage - startPage + 1;
    const desiredVisiblePages = pageWindowSize * 2 + 1;

    if (actualVisiblePages < desiredVisiblePages && totalPages >= desiredVisiblePages) {
        if (startPage === 1) {
            endPage = desiredVisiblePages;
        } else if (endPage === totalPages) {
            startPage = totalPages - desiredVisiblePages + 1;
        }
    }

    if (startPage > 1) {
        buttons.push(
            <button
                key={1}
                className={`rounded-md border border-gray-300 px-3 py-1 transition-colors duration-200 hover:bg-gray-100 ${
                    1 === currentPage ? "bg-blue-500 text-white" : ""
                }`}
                onClick={() => onPageChange(1)}
                disabled={1 === currentPage}
            >
                1
            </button>,
        );
        if (startPage > 2) {
            buttons.push(
                <span
                    key="ellipsis-start"
                    className="px-3 py-1 text-gray-500"
                >
                    ...
                </span>,
            );
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        buttons.push(
            <button
                key={i}
                className={`rounded-md border border-gray-300 px-3 py-1 transition-colors duration-200 ${
                    isActive ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                }`}
                onClick={() => onPageChange(i)}
                disabled={isActive}
            >
                {i}
            </button>,
        );
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttons.push(
                <span
                    key="ellipsis-end"
                    className="px-3 py-1 text-gray-500"
                >
                    ...
                </span>,
            );
        }
        buttons.push(
            <button
                key={totalPages}
                className={`rounded-md border border-gray-300 px-3 py-1 transition-colors duration-200 hover:bg-gray-100 ${
                    totalPages === currentPage ? "bg-blue-500 text-white" : ""
                }`}
                onClick={() => onPageChange(totalPages)}
                disabled={totalPages === currentPage}
            >
                {totalPages}
            </button>,
        );
    }

    return buttons;
};

const AllTransactions: React.FC = () => {
    const [transactions, setRecentTransactions] = useState<TransactionsResponse>({
        page: 1,
        limit: 20,
        totalPages: 0,
        totalTransactions: 0,
        transactions: [],
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
        return <div className="py-8 text-center text-red-600">Error: {error}</div>;
    }

    return (
        <>
            <div
                id="transactions-list"
                className="space-y-4"
            >
                {" "}
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
                    <div className="py-8 text-center text-gray-500">No transactions found for this page.</div>
                )}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
                <p className="mr-5">
                    Showing {(currentPageIndex - 1) * transactions.limit + 1} -{" "}
                    {Math.min(currentPageIndex * transactions.limit, transactions.totalTransactions)} of{" "}
                    {transactions.totalTransactions.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} transactions
                </p>
                <div className="flex space-x-2">
                    {renderPaginationButtons({
                        totalPages: transactions.totalPages,
                        currentPage: currentPageIndex,
                        onPageChange: handlePageChange,
                        pageWindowSize: 3,
                    })}
                </div>
            </div>
        </>
    );
};

export default AllTransactions;
