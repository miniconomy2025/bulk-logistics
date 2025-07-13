import React, { useState } from "react";
import type { PickupRequestDetails } from "../types/pickup-request";
type SortConfig = {
    key: "dispatch_date" | "status" | "vehicle";
    order: "asc" | "desc";
};

/**
 * Formats a date string (YYYY-MM-DD) into "DD Month YYYY".
 * @param date - The date string to format.
 * @returns The formatted date string.
 */
function formatDate(date: string): string {
    const dateParts = date.split("-");
    const day = String(dateParts[2]).padStart(2, "0");
    const monthName = new Date(date).toLocaleString("default", { month: "long" });
    const year = dateParts[0];

    return `${day} ${monthName} ${year}`;
}

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
        key: "dispatch_date",
        order: "asc",
    });

    /**
     * Sorts the shipments array based on the current sortConfig state.
     */
    const sortedRequests = React.useMemo(() => {
        const sortableItems = [...requests];
        // sortableItems.sort((a, b) => {
        //     let comparison = 0;
        //     // Logic to compare based on the selected key (date, status, or vehicle)
        //     if (sortConfig.key === "dispatch_date") {
        //         const dateA = new Date(a.dispatch_date).getTime();
        //         const dateB = new Date(b.dispatch_date).getTime();
        //         comparison = dateA - dateB;
        //     } else if (sortConfig.key === "status") {
        //         // Use localeCompare for alphabetical string comparison
        //         comparison = a.status.statusName.localeCompare(b.status.statusName);
        //     } else if (sortConfig.key === "vehicle") {
        //         // Use localeCompare for vehicle name comparison
        //         comparison = a.vehicle.localeCompare(b.vehicle);
        //     }

        //     // Apply ascending or descending order
        //     return sortConfig.order === "asc" ? comparison : -comparison;
        // });
        return sortableItems;
    }, [requests]);

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
            <div className="grid grid-cols-5 items-center bg-gray-50 px-4 py-3 text-left">
                {/* Date Dispatched Header */}
                <button
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("dispatch_date")}
                >
                    Request Date
                    {renderSortArrow("dispatch_date")}
                </button>

                {/* Origin Company Header */}
                <button
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("status")}
                >
                    From
                    {renderSortArrow("status")}
                </button>

                {/* Destination Company Header */}
                <button
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("status")}
                >
                    To
                    {renderSortArrow("status")}
                </button>

                {/* Status Header */}
                <button
                    className="flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("status")}
                >
                    Payment
                    {renderSortArrow("status")}
                </button>

                {/* Status Header (now sortable) */}
                <button
                    className="flex w-full items-center justify-end text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("vehicle")}
                >
                    Status
                    {renderSortArrow("vehicle")}
                </button>
            </div>

            {/* Table Body */}
            <div>
                {sortedRequests.map((request, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-5 items-center border-b border-gray-100 px-4 py-3 last:border-b-0"
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
