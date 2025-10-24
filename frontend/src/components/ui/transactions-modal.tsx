import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TransactionsResponse } from "../../types";
import Transactions from "../../data/transactions";
import { formatDate } from "../../utils/format-date";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
    const [exporting, setExporting] = useState<boolean>(false);
    const [exportTransactions, setExportTransactions] = useState<TransactionsResponse>({
        page: 1,
        limit: 20,
        totalPages: 0,
        totalTransactions: 0,
        transactions: [],
    });

    const fetchTransactionsData = async (page: number, limit: number): Promise<TransactionsResponse> => {
        const response = await Transactions.getAll({ limit, page });
        const data: TransactionsResponse = await response.json();
        return data;
    };

    const fetchTransactionsDataForExport = useCallback(async (): Promise<TransactionsResponse> => {
        const response = await fetchTransactionsData(1, 30000);
        return response;
    }, []);

    const modalContentRef = useRef<HTMLDivElement>(null);

    const exportToCSV = () => {
        setExporting(true);

        if (exportTransactions.transactions.length === 0) {
            alert("No transactions to export.");
            return;
        }

        const headers = ["Company", "Amount", "Transaction Date", "Transaction Type", "Pickup Request ID"];
        const csvRows = [];

        csvRows.push(headers.join(","));

        exportTransactions.transactions.forEach((transaction) => {
            const transactionType =
                transaction.transaction_type === "PAYMENT_RECEIVED" || transaction.transaction_type === "LOAN" ? "Credit" : "Debit";
            csvRows.push(
                [
                    `"${transaction.company}"`,
                    transaction.amount,
                    formatDate(transaction.transaction_date),
                    transactionType,
                    transaction.pickup_request_id,
                ].join(","),
            );
        });

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "transactions.csv");
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        fetchTransactionsDataForExport()
            .then((result) => {
                setExportTransactions(result);
                setExporting(false);
            })
            .catch((err) => {
                console.error("Error fetching initial transactions:", err);
                setExporting(false);
            });
    }, [exporting, fetchTransactionsDataForExport]);

    if (!isOpen) {
        return null;
    }

    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex w-screen items-center justify-center bg-black/75 p-4"
            onClick={handleOverlayClick}
        >
            <div
                ref={modalContentRef}
                className="flex max-h-[90vh] w-[fit-content] flex-col overflow-hidden rounded-lg bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 p-4">
                    <div className="flex">
                        <h2 className="text-xl font-semibold text-gray-800">Transaction History</h2>
                        <button
                            onClick={exportToCSV}
                            className="mx-5 flex items-center justify-center rounded border-2 border-gray-300 px-3 py-1 text-gray-800 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-700"
                            aria-label="Close modal"
                            title="export csv"
                        >
                            <span className="material-symbols-outlined mr-2">download</span> Export
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex cursor-pointer items-center justify-center text-gray-800 transition-colors duration-200 hover:text-gray-700"
                        aria-label="Close modal"
                        title="close modal"
                    >
                        <span className="material-symbols-outlined mr-2">close</span>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-4">{children}</div>
            </div>
        </div>
    );
};

export default Modal;
