import React, { useState } from "react";
import type { Shipment } from "../types/shipment";
import { formatVehicleName } from "../utils/format-vehicle";
import { formatDate } from "../utils/format-date";
import type { SortConfig } from "../types/sort-config";

/**
 * A table component to display a list of shipments with sorting capabilities.
 */
export const ShipmentTable: React.FC<{ shipments: Shipment[] }> = ({ shipments }) => {
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: "dispatch_date",
        order: "desc",
    });

    /**
     * Sorts the shipments array based on the current sortConfig state.
     */
    const sortedShipments = React.useMemo(() => {
        const sortableItems = [...shipments];
        sortableItems.sort((a, b) => {
            let comparison = 0;
            if (sortConfig.key === "dispatch_date") {
                const dateA = new Date(a.dispatch_date).getTime();
                const dateB = new Date(b.dispatch_date).getTime();
                comparison = dateA - dateB;
            } else if (sortConfig.key === "status") {
                comparison = a.status.statusName.localeCompare(b.status.statusName);
            } else if (sortConfig.key === "vehicle") {
                comparison = a.vehicle.localeCompare(b.vehicle);
            }

            return sortConfig.order === "asc" ? comparison : -comparison;
        });
        return sortableItems;
    }, [shipments, sortConfig]);

    const handleSort = (key: SortConfig["key"]) => {
        setSortConfig((prevConfig) => ({
            key,
            order: prevConfig.key === key && prevConfig.order === "asc" ? "desc" : "asc",
        }));
    };

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
                    type="button"
                    onClick={() => handleSort("dispatch_date")}
                >
                    Date Dispatched
                    {renderSortArrow("dispatch_date")}
                </button>

                {/* Status Header */}
                <button
                    className="flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900"
                    type="button"
                    onClick={() => handleSort("status")}
                >
                    Status
                    {renderSortArrow("status")}
                </button>

                {/* Vehicle Header (now sortable) */}
                <button
                    className="flex w-full items-center justify-end text-sm font-medium text-gray-600 hover:text-gray-900"
                    type="button"
                    onClick={() => handleSort("vehicle")}
                >
                    Vehicle
                    {renderSortArrow("vehicle")}
                </button>
            </div>

            {/* Table Body */}
            <div>
                {sortedShipments.length === 0 ? (
                    <p className="px-4 py-3 text-center text-sm text-gray-500">No shipments available.</p>
                ) : (
                    sortedShipments.map((shipment, index) => (
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
                    ))
                )}
            </div>
        </div>
    );
};
