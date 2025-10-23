import { useEffect, useState } from "react";
import { MetricCard } from "../components/ui/metric-card";
import { DashboardLayout } from "../layouts/app-layout";
import PickupRequest from "../data/pickup-requests";
import type { PickupRequestDetails } from "../types/pickup-request";
import { PickupRequestsTable } from "../components/pickup-requests-table";

const PickupRequestDashboard: React.FC = () => {
    const [pickupRequests, setPickupRequests] = useState<PickupRequestDetails[]>([]);

    const fetchPickupRequests = async () => {
        const requests = await PickupRequest.allPickupRequests();
        const data: PickupRequestDetails[] = await requests.json();
        return data;
    };

    useEffect(() => {
        fetchPickupRequests()
            .then((result) => {
                setPickupRequests(result as unknown as PickupRequestDetails[]);
            })
            .catch((error) => console.error(error));
    }, []);

    const completedRequests = pickupRequests.filter((request) => request.completionDate !== null);

    const pendingRequests = pickupRequests.filter((request) => request.completionDate === null);

    return (
        <DashboardLayout>
            <main className="w-full flex-1 overflow-y-auto p-8 pt-[4.5rem] lg:ml-64 lg:pt-8">
                <header className="mb-8 flex flex-col items-start justify-between sm:flex-row sm:items-center">
                    <div>
                        <h1 title="pr-heading" className="text-3xl font-bold text-gray-900">Pickup Requests</h1>
                        <p className="text-md text-gray-500">Track pickup requests and their statuses</p>
                    </div>
                </header>

                <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <MetricCard
                        title="All Requests"
                        type="shipment"
                        value={pickupRequests.length}
                        bgColor="bg-green-100"
                        textColor="text-green-600"
                        icon={<span className="material-symbols-outlined">box</span>}
                    />
                    <MetricCard
                        title="In Progress"
                        type="shipment"
                        value={pendingRequests.length}
                        bgColor="bg-red-100"
                        textColor="text-red-600"
                        icon={<span className="material-symbols-outlined">hourglass_empty</span>}
                    />
                    <MetricCard
                        title="Completed"
                        type="shipment"
                        value={completedRequests.length}
                        bgColor="bg-blue-100"
                        textColor="text-blue-600"
                        icon={<span className="material-symbols-outlined">check_circle</span>}
                    />
                </section>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Pickup Requests</h2>
                        <button
                            type="button"
                            className="flex items-center rounded border border-blue-800 bg-blue-800 p-1 text-gray-50 hover:bg-blue-700"
                            onClick={() => {
                                fetchPickupRequests()
                                    .then((result) => {
                                        setPickupRequests(result as unknown as PickupRequestDetails[]);
                                    })
                                    .catch((error) => console.error(error));
                            }}
                        >
                            <span className="material-symbols-outlined">autorenew</span>
                        </button>
                    </div>

                    {pickupRequests.length === 0 ? (
                        <div className="text-center text-gray-900">
                            <p>No pickup request available</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <PickupRequestsTable requests={pickupRequests} />
                        </div>
                    )}
                </div>
            </main>
        </DashboardLayout>
    );
};

export default PickupRequestDashboard;
