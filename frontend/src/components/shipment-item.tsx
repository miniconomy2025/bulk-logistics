import React, { useState } from "react";
import type { Shipment } from "../types/shipment";

// Assuming a Shipment type definition exists, for example:
// export interface Shipment {
//   dispatch_date: string;
//   status: {
//     statusName: "PENDING" | "PICKED_UP" | "IN_TRANSIT";
//   };
//   vehicle: string;
// }
// To make this example runnable, I'll define a mock type.
// type Shipment = {
//   dispatch_date: string;
//   status: {
//     statusName: "PENDING" | "PICKED_UP" | "IN_TRANSIT";
//   };
//   vehicle: string;
// };

// A type to define the structure of our sorting configuration.
// Now includes 'vehicle' as a possible sort key.
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
function formatVehicleName(vehicle: string): string {
    return vehicle
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/**
 * A table component to display a list of shipments with sorting capabilities.
 */
export const ShipmentTable: React.FC<{ shipments: Shipment[] }> = ({ shipments }) => {
    // State now holds a configuration object for sorting.
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: "dispatch_date",
        order: "asc",
    });

    /**
     * Sorts the shipments array based on the current sortConfig state.
     */
    const sortedShipments = React.useMemo(() => {
        const sortableItems = [...shipments];
        sortableItems.sort((a, b) => {
            let comparison = 0;
            // Logic to compare based on the selected key (date, status, or vehicle)
            if (sortConfig.key === "dispatch_date") {
                const dateA = new Date(a.dispatch_date).getTime();
                const dateB = new Date(b.dispatch_date).getTime();
                comparison = dateA - dateB;
            } else if (sortConfig.key === "status") {
                // Use localeCompare for alphabetical string comparison
                comparison = a.status.statusName.localeCompare(b.status.statusName);
            } else if (sortConfig.key === "vehicle") {
                // Use localeCompare for vehicle name comparison
                comparison = a.vehicle.localeCompare(b.vehicle);
            }

            // Apply ascending or descending order
            return sortConfig.order === "asc" ? comparison : -comparison;
        });
        return sortableItems;
    }, [shipments, sortConfig]);

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
            <div className="grid grid-cols-3 items-center bg-gray-50 px-4 py-3 text-left">
                {/* Date Dispatched Header */}
                <button
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("dispatch_date")}
                >
                    Date Dispatched
                    {renderSortArrow("dispatch_date")}
                </button>

                {/* Status Header */}
                <button
                    className="flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("status")}
                >
                    Status
                    {renderSortArrow("status")}
                </button>

                {/* Vehicle Header (now sortable) */}
                <button
                    className="flex w-full items-center justify-end text-sm font-medium text-gray-600 hover:text-gray-900"
                    onClick={() => handleSort("vehicle")}
                >
                    Vehicle
                    {renderSortArrow("vehicle")}
                </button>
            </div>

            {/* Table Body */}
            <div>
                {sortedShipments.map((shipment, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-3 items-center border-b border-gray-100 px-4 py-3 last:border-b-0"
                    >
                        {/* Date Column */}
                        <p className="text-xs text-gray-500">{formatDate(shipment.dispatch_date)}</p>

                        {/* Status Column */}
                        <div className="flex justify-center">
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    shipment.status.statusName === "PENDING"
                                        ? "bg-red-100 text-red-600"
                                        : shipment.status.statusName === "PICKED_UP"
                                          ? "bg-orange-100 text-orange-600"
                                          : "bg-blue-100 text-blue-600"
                                }`}
                            >
                                {shipment.status.statusName === "PICKED_UP" ? "IN TRANSIT" : shipment.status.statusName}
                            </span>
                        </div>

                        {/* Vehicle Column */}
                        <p className="text-right text-xs text-gray-500">{formatVehicleName(shipment.vehicle)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
