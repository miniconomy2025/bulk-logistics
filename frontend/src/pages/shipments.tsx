import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../components/ui/metric-card";
import { DashboardLayout } from "../layouts/app-layout";
import Shipments from "../data/shipments";
import type { Shipment } from "../types/shipment";
import { ShipmentTable } from "../components/shipment-items";
import type { ShipmentStatusResponse } from "../types/shipment-status";
import ShipmentStatus from "../data/shipment-status";

const ShipmentsDashboard: React.FC = () => {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [displayedShipments, setDisplayedShipments] = useState<Shipment[]>([]);
    const [shipmentStatuses, setShipmentStatuses] = useState<ShipmentStatusResponse[]>([]);
    const [currentStatus, setCurrentStatus] = useState<number | null>(null);

    const fetchAllShipments = async (): Promise<Shipment[]> => {
        const response = await Shipments.allShipments();
        const data: Shipment[] = await response.json();
        return data;
    };

    const fetchShipmentStatuses = async (): Promise<ShipmentStatusResponse[]> => {
        const response = await ShipmentStatus.allShipmentStatuses();

        const data: ShipmentStatusResponse[] = await response.json();
        return data;
    };

    useEffect(() => {
        fetchShipmentStatuses()
            .then((result) => {
                setShipmentStatuses(result);
            })
            .catch((error) => console.error(error));
    }, []);

    useEffect(() => {
        fetchAllShipments()
            .then((result) => {
                setShipments(result);
            })
            .catch((error) => console.error(error));
    }, []);

    useEffect(() => {
        if (currentStatus !== null) {
            setDisplayedShipments(shipments.filter((shipment) => shipment.status.statusId === currentStatus));
        } else {
            setDisplayedShipments(shipments);
        }
    }, [currentStatus, shipments]);

    const pendingShipments = useMemo(() => {
        return shipments.filter((shipment) => shipment.status.statusName === "PENDING").length;
    }, [shipments]);

    const shipmentsInTransit = useMemo(() => {
        return shipments.filter((shipment) => shipment.status.statusName === "PICKED_UP").length;
    }, [shipments]);

    const completedShipments = useMemo(() => {
        return shipments.filter((shipment) => shipment.status.statusName === "DELIVERED").length;
    }, [shipments]);

    function formatStatusName(statusName: string): string {
        const words = statusName.split("_");

        return words.length > 0
            ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ")
            : statusName.slice(0, 1).toUpperCase() + statusName.slice(1).toLowerCase();
    }

    return (
        <DashboardLayout>
            <main className="w-full flex-1 overflow-y-auto p-8 pt-[4.5rem] lg:ml-64 lg:pt-8">
                <header className="mb-8 flex flex-col items-start justify-between sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Shipments Dashboard</h1>
                        <p className="text-md text-gray-500">Track shipments schedules</p>
                    </div>
                </header>

                <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="All Shipments"
                        type="shipment"
                        value={shipments.length}
                        bgColor="bg-green-100"
                        textColor="text-green-600"
                        icon={<span className="material-symbols-outlined">local_shipping</span>}
                    />
                    <MetricCard
                        title="Pending"
                        type="shipment"
                        value={pendingShipments}
                        bgColor="bg-red-100"
                        textColor="text-red-600"
                        icon={<span className="material-symbols-outlined">cached</span>}
                    />
                    <MetricCard
                        title="In Transit"
                        type="shipment"
                        value={shipmentsInTransit}
                        bgColor="bg-orange-100"
                        textColor="text-orange-600"
                        icon={<span className="material-symbols-outlined">delivery_truck_speed</span>}
                    />
                    <MetricCard
                        title="Completed"
                        type="shipment"
                        value={completedShipments}
                        bgColor="bg-blue-100"
                        textColor="text-blue-600"
                        icon={<span className="material-symbols-outlined">orders</span>}
                    />
                </section>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Shipments</h2>
                        <div className="flex space-x-4">
                            <label
                                htmlFor="paymentFilter"
                                className="sr-only"
                            >
                                Filter by Status
                            </label>
                            <select
                                id="paymentFilter"
                                aria-labelledby="paymentFilter"
                                className="rounded border border-gray-300 p-2 text-sm"
                                value={currentStatus ?? ""}
                                onChange={(e) => setCurrentStatus(e.target.value === "" ? null : Number(e.target.value))}
                            >
                                <option value="">All Shipments</option>
                                {shipmentStatuses.map((status) => (
                                    <option
                                        key={status.shipmentStatusId}
                                        value={status.shipmentStatusId}
                                    >
                                        {status.name === "PICKED_UP" ? "In Transit" : formatStatusName(status.name)}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="flex items-center rounded border border-blue-800 bg-blue-800 p-1 text-gray-50 hover:bg-blue-700"
                                onClick={() => {
                                    fetchAllShipments()
                                        .then((result) => {
                                            setShipments(result);
                                            setCurrentStatus(null);
                                        })
                                        .catch((error) => console.error(error));
                                }}
                            >
                                <span className="material-symbols-outlined">autorenew</span>
                            </button>
                        </div>
                    </div>

                    {shipments.length === 0 ? (
                        <div className="text-center text-gray-900">
                            <p>No shipments available</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <ShipmentTable shipments={displayedShipments} />
                        </div>
                    )}
                </div>
            </main>
        </DashboardLayout>
    );
};

export default ShipmentsDashboard;
