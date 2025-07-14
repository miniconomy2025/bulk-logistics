import React, { useState } from "react";
import type { PickupRequestDetails } from "../types/pickup-request";
import { formatDate } from "../utils/format-date";
import type { SortConfig } from "../types/sort-config";
import { formatAsCurrencyStyle } from "../utils/format-currency";

/**
 * Formats a vehicle name string (e.g., "truck_heavy") into "Truck Heavy".
 * @param vehicle - The vehicle string to format.
 * @returns The formatted vehicle name.
 */
function formatCompanyName(company: string): string {
    return company
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/**
 * A table component to display a list of shipments with sorting capabilities.
 */
export const PickupRequestsTable: React.FC<{ requests: PickupRequestDetails[] }> = ({ requests }) => {
    // State now holds a configuration object for sorting.
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: "requestDate",
        order: "desc",
    });

    /**
     * Sorts the shipments array based on the current sortConfig state.
     */
    const sortedRequests = React.useMemo(() => {
        const sortableItems = [...requests];
        sortableItems.sort((a, b) => {
            let comparison = 0;

            if (sortConfig.key === "requestDate") {
                const dateA = new Date(a.requestDate).getTime();
                const dateB = new Date(b.requestDate).getTime();
                comparison = dateA - dateB;
            } else if (sortConfig.key === "originCompanyName") {
                comparison = a.originCompanyName.localeCompare(b.originCompanyName);
            } else if (sortConfig.key === "destinationCompanyName") {
                comparison = a.destinationCompanyName.localeCompare(b.destinationCompanyName);
            } else if (sortConfig.key === "paymentStatus") {
                comparison = a.paymentStatus?.localeCompare(b.paymentStatus ?? "") || 0;
            }

            return sortConfig.order === "asc" ? comparison : -comparison;
        });
        return sortableItems;
    }, [requests, sortConfig]);

    /**
     * Handles requests to sort the table by a specific column.
     * If the same column is clicked, the order is toggled.
     * If a new column is clicked, it becomes the sort key with ascending order.
     * @param key - The key of the column to sort by.
     */
    const handleSort = (key: SortConfig["key"]) => {
        setSortConfig((prevConfig) => ({
            key,
            order: prevConfig.key === key && prevConfig.order === "asc" ? "desc" : "asc",
        }));
    };

    /**
     * Renders the sort direction arrow (▲ or ▼) for a given column key
     * if it's the currently active sort column.
     * @param key - The key of the column header.
     * @returns A JSX span element with the arrow or null.
     */
    const renderSortArrow = (key: SortConfig["key"]) => {
        if (sortConfig.key !== key) {
            return null;
        }
        return <span className="ml-2">{sortConfig.order === "asc" ? "▲" : "▼"}</span>;
    };

    return (
        <div className="rounded-md border border-gray-200 bg-white shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-6 items-center bg-gray-50 px-4 py-3 text-left">
                {/* Date Dispatched Header */}
                <button
                    type="button"
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("requestDate")}
                >
                    Request Date
                    {renderSortArrow("requestDate")}
                </button>

                {/* Origin Company Header */}
                <button
                    type="button"
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("originCompanyName")}
                >
                    From
                    {renderSortArrow("originCompanyName")}
                </button>

                {/* Destination Company Header */}
                <button
                    type="button"
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("destinationCompanyName")}
                >
                    To
                    {renderSortArrow("destinationCompanyName")}
                </button>

                {/* Cost Header */}
                <button
                    type="button"
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    Cost
                </button>

                {/* Status Header */}
                <button
                    type="button"
                    className="flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("paymentStatus")}
                >
                    Payment
                    {renderSortArrow("paymentStatus")}
                </button>

                {/* Status Header (now sortable) */}
                <button
                    type="button"
                    className="flex w-full items-center justify-end text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    Status
                </button>
            </div>

            {/* Table Body */}
            <div>
                {sortedRequests.map((request, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-6 items-center border-b border-gray-100 px-4 py-3 last:border-b-0"
                    >
                        {/* Date Column */}
                        <p className="text-xs text-gray-500">{formatDate(request.requestDate)}</p>

                        {/* Origin Company Column */}
                        <div>
                            <p className="text-xs text-gray-500">{formatCompanyName(request.originCompanyName)}</p>
                        </div>

                        {/* Destination Company Column */}
                        <div>
                            <p className="text-xs text-gray-500">{formatCompanyName(request.destinationCompanyName)}</p>
                        </div>

                        {/* Cost Column */}
                        <div>
                            <p className="text-xs text-gray-500">Ð {request.cost && formatAsCurrencyStyle(request.cost)}</p>
                        </div>

                        {/* Payment Status Column */}
                        <div className="flex justify-center">
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    request.paymentStatus === "PENDING" || !request.paymentStatus
                                        ? "bg-slate-100 text-slate-600"
                                        : request.paymentStatus === "COMPLETED"
                                          ? "bg-green-100 text-green-600"
                                          : "bg-red-100 text-red-600"
                                }`}
                            >
                                {request.paymentStatus || "PENDING"}
                            </span>
                        </div>

                        {/* Status Column */}
                        <p className="text-right text-xs text-gray-500">
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    request.completionDate ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                {request.completionDate ? "DELIVERED" : "IN PROGRESS"}
                            </span>
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
