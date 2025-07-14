import { useEffect, useState } from "react";

import { RecentTransaction } from "../components/recent-transactions";
import { MetricCard } from "../components/ui/metric-card";
import { TransactionItem } from "../components/ui/transaction-item";
import { DashboardLayout } from "../layouts/app-layout";
import Transactions from "../data/transactions";
import IncomeExpensesChart from "../components/income-expense-chart";
import type { IncomeExpensesChartProps, TransactionsResponse } from "../types";
import Shipments from "../data/shipments";
import AllTransactions from "../components/all-transactions";
import Modal from "../components/ui/transactions-modal";

interface TransactionItem {
    purchase: string;
    expense: string;
    payment_received: string;
    loan: string;
}

interface TransactionResponse {
    transaction: TransactionItem[];
}

interface ActiveShipmentsResponse {
    shipments: {
        active: string;
    };
}

interface TopRevenueSourceItem {
    company: string;
    total: string;
    shipments: string;
}

interface TopRevenueSourcesResponse {
    transaction: TopRevenueSourceItem[];
}

const Dashboard: React.FC = () => {
    const [modalIsOpen, setIsOpen] = useState<boolean>(false);
    const [totals, setTotals] = useState<TransactionResponse>({
        transaction: [
            {
                expense: "",
                loan: "",
                payment_received: "",
                purchase: "",
            },
        ],
    });
    const [activeShipments, setActiveShipments] = useState<ActiveShipmentsResponse>({
        shipments: {
            active: "0",
        },
    });
    const [topRevenueSources, setTopRevenueSources] = useState<TopRevenueSourcesResponse>({
        transaction: [
            {
                company: "",
                shipments: "",
                total: "",
            },
        ],
    });
    const [recentTransactions, setRecentTransactions] = useState<TransactionsResponse>({
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
    const [incomeBreakdown, setIncomeBreakdown] = useState<IncomeExpensesChartProps>({
        transaction: [
            { year: "2025", month: "6", revenue: 0, expenses: 0 },
            { year: "2025", month: "5", revenue: 0, expenses: 0 },
            { year: "2025", month: "4", revenue: 0, expenses: 0 },
        ],
    });

    const fetchDashboardData = async (): Promise<TransactionResponse> => {
        const response = await Transactions.totals();
        const data: TransactionResponse = await response.json();
        return data;
    };

    const fetchTopRevenueSourceData = async (): Promise<TopRevenueSourcesResponse> => {
        const response = await Transactions.topSources();
        const data: TopRevenueSourcesResponse = await response.json();
        return data;
    };

    const fetchRecentTransactionsData = async (): Promise<TransactionsResponse> => {
        const response = await Transactions.getAll({ limit: 7, page: 1 });
        const data: TransactionsResponse = await response.json();
        return data;
    };

    const fetchActiveShipmentsData = async (): Promise<ActiveShipmentsResponse> => {
        const response = await Shipments.activeShipments();
        const data: ActiveShipmentsResponse = await response.json();
        return data;
    };

    const fetchCostsBreakdown = async (): Promise<IncomeExpensesChartProps> => {
        const response = await Transactions.monthly();
        const data: IncomeExpensesChartProps = await response.json();
        return data;
    };

    useEffect(() => {
        fetchDashboardData()
            .then((result) => {
                setTotals(result);
            })
            .catch((error) => console.error(error));
        fetchActiveShipmentsData()
            .then((result) => {
                setActiveShipments(result);
            })
            .catch((error) => console.error(error));
        fetchTopRevenueSourceData()
            .then((result) => {
                setTopRevenueSources(result);
            })
            .catch((error) => console.error(error));
        fetchCostsBreakdown()
            .then((result) => {
                setIncomeBreakdown(result);
            })
            .catch((error) => console.error(error));
        fetchRecentTransactionsData()
            .then((result) => {
                setRecentTransactions(result);
            })
            .catch((error) => console.error(error));
    }, []);

    const total_money_out = Number(totals.transaction[0].loan) + Number(totals.transaction[0].expense) + Number(totals.transaction[0].purchase);

    const openModal = (): void => {
        setIsOpen(true);
    };

    const closeModal = (): void => {
        setIsOpen(false);
    };

    return (
        <DashboardLayout>
            <main className="w-full flex-1 overflow-y-auto p-8 pt-[4.5rem] lg:ml-64 lg:pt-8">
                <header className="mb-8 flex flex-col items-start justify-between sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
                        <p className="text-md text-gray-500">Track revenue, expenses, and transaction flow</p>
                    </div>
                </header>

                {/* Key Metrics */}
                <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Total Revenues"
                        value={Number(totals.transaction[0].payment_received)}
                        bgColor="bg-green-100"
                        textColor="text-green-600"
                        icon={<span className="material-symbols-outlined">attach_money</span>}
                    />
                    <MetricCard
                        title="Total Expenses"
                        value={Number(total_money_out)}
                        bgColor="bg-red-100"
                        textColor="text-red-600"
                        icon={<span className="material-symbols-outlined">account_balance_wallet</span>}
                    />
                    <MetricCard
                        title="Net Profit"
                        value={Number(totals.transaction[0].payment_received) - Number(total_money_out)}
                        bgColor="bg-blue-100"
                        textColor="text-blue-600"
                        icon={<span className="material-symbols-outlined">money_bag</span>}
                    />
                    <MetricCard
                        title="Active Shipments"
                        value={Number(activeShipments.shipments.active)}
                        bgColor="bg-orange-100"
                        textColor="text-orange-600"
                        icon={<span className="material-symbols-outlined">assignment</span>}
                    />
                </section>

                {/* Revenue vs Expenses & Transaction Breakdown */}
                <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue vs Expenses</h2>
                        <p className="mb-6 text-sm text-gray-500">Monthly comparison over the months</p>
                        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                            <IncomeExpensesChart transaction={incomeBreakdown.transaction} />
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">Transaction Breakdown</h2>
                        <p className="mb-6 text-sm text-gray-500">Distribution of income sources</p>
                        <div className="space-y-2">
                            {topRevenueSources.transaction.map((item, key) => {
                                const percent = (Number(item.total) / Number(totals.transaction[0].payment_received)) * 100;
                                const displayPercent = !isFinite(percent) || isNaN(percent) ? 0 : percent.toFixed(2);
                                const colors = [
                                    "bg-blue-500",
                                    "bg-green-500",
                                    "bg-red-500",
                                    "bg-yellow-500",
                                    "bg-purple-500",
                                    "bg-pink-500",
                                    "bg-indigo-500",
                                    "bg-teal-500",
                                    "bg-orange-500",
                                ];
                                const randomColor = colors[Math.floor(Math.random() * colors.length)];

                                return (
                                    <TransactionItem
                                        key={key}
                                        label={item.company}
                                        percentage={`${displayPercent}%`}
                                        colorClass={randomColor}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Recent Transactions & Top Revenue Sources */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                        <button
                            onClick={openModal}
                            className="text-sm font-medium text-blue-600 hover:underline"
                        >
                            View all
                        </button>
                        <Modal
                            isOpen={modalIsOpen}
                            onClose={closeModal}
                        >
                            <AllTransactions />
                        </Modal>
                    </div>
                    <p className="mb-6 text-sm text-gray-500">Added financial activity</p>
                    <div className="space-y-2">
                        {recentTransactions.transactions.map((item, key) => {
                            return (
                                <RecentTransaction
                                    key={key}
                                    item={item}
                                />
                            );
                        })}
                    </div>
                </div>
            </main>
        </DashboardLayout>
    );
};

export default Dashboard;
