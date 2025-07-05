import { useEffect, useState } from "react";
import { RecentTransaction } from "../../components/recent-transactions";
import { TopRevenueSource } from "../../components/top-revenue";
import { MetricCard } from "../../components/ui/metric-card";
import { TransactionItem } from "../../components/ui/transaction-item";
import { DashboardLayout } from "../../layouts/app-layout";
import Transactions from "../../data/transactions";
import IncomeExpensesChart from "../../components/income-expense-chart";
import type { IncomeExpensesChartProps } from "../../types";

interface TransactionItem {
    total_revenue: string;
    total_expenses: string;
}

interface TransactionResponse {
    transaction: TransactionItem[];
}

interface ActiveShipmentsItem {
    count: string;
}

interface ActiveShipmentsResponse {
    transaction: ActiveShipmentsItem[];
}

interface TopRevenueSourceItem {
    category: string;
    total: string;
}

interface TopRevenueSourcesResponse {
    transaction: TopRevenueSourceItem[];
}

const Dashboard: React.FC = () => {
    const [totals, setTotals] = useState<TransactionResponse>({
        transaction: [
            {
                total_revenue: "0",
                total_expenses: "0",
            },
        ],
    });
    const [activeShipments, setActiveShipments] = useState<ActiveShipmentsResponse>({
        transaction: [
            {
                count: "0",
            },
        ],
    });
    const [topRevenueSources, setTopRevenueSources] = useState<TopRevenueSourcesResponse>({
        transaction: [
            {
                category: "",
                total: "",
            },
        ],
    });
    const [incomeBreakdown, setIncomeBreakdown] = useState<IncomeExpensesChartProps>({
        transaction: [
            { year: "2025", month: "6", revenue: 32912, expenses: 8934 },
            { year: "2025", month: "5", revenue: 3482, expenses: 121123 },
            { year: "2025", month: "4", revenue: 234435, expenses: 7382 },
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

    const fetchActiveShipmentsData = async (): Promise<ActiveShipmentsResponse> => {
        const response = await Transactions.activeShipments();
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
    }, []);

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
                        value={`R${totals.transaction[0].total_revenue}`}
                        change=""
                        changeType="increase"
                        bgColor="bg-green-100"
                        textColor="text-green-600"
                        icon={<span className="material-symbols-outlined">attach_money</span>}
                    />
                    <MetricCard
                        title="Total Expenses"
                        value={`R${totals.transaction[0].total_expenses}`}
                        change=""
                        changeType="decrease"
                        bgColor="bg-red-100"
                        textColor="text-red-600"
                        icon={<span className="material-symbols-outlined">account_balance_wallet</span>}
                    />
                    <MetricCard
                        title="Net Profit"
                        value={`R${Number(totals.transaction[0].total_revenue) - Number(totals.transaction[0].total_revenue)}`}
                        change=""
                        changeType="increase"
                        bgColor="bg-blue-100"
                        textColor="text-blue-600"
                        icon={<span className="material-symbols-outlined">money_bag</span>}
                    />
                    <MetricCard
                        title="Active Shipments"
                        value={`R${activeShipments.transaction[0].count}`}
                        change=""
                        changeType="increase"
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
                                const percent = (Number(item.total) / Number(totals.transaction[0].total_revenue)) * 100;
                                const displayPercent = !isFinite(percent) || isNaN(percent) ? 0 : percent;
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
                                        label={item.category}
                                        percentage={`${displayPercent}%`}
                                        colorClass={randomColor}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Recent Transactions & Top Revenue Sources */}
                <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                            <button className="text-sm font-medium text-blue-600 hover:underline">View all</button>
                        </div>
                        <p className="mb-6 text-sm text-gray-500">Added financial activity</p>
                        <div className="space-y-2">
                            <RecentTransaction
                                title="Payment from CasualCorp"
                                description="New equipment purchase"
                                amount="+R24,500"
                                date="May 1, 10:00 AM"
                                type="credit"
                            />
                            <RecentTransaction
                                title="Fuel Payment"
                                description="Fleet maintenance"
                                amount="-R3,420"
                                date="Today, 11:30 AM"
                                type="debit"
                            />
                            <RecentTransaction
                                title="Storage Fee - TechCorp"
                                description="Warehouse storage"
                                amount="+R8,750"
                                date="Yesterday, 4:40 PM"
                                type="credit"
                            />
                            <RecentTransaction
                                title="Insurance Premium"
                                description="Monthly coverage"
                                amount="-R12,000"
                                date="Yesterday, 9:15 AM"
                                type="debit"
                            />
                            <RecentTransaction
                                title="Payment from MegaHaul"
                                description="Logistics Dashboard subscription"
                                amount="+R45,000"
                                date="3 days ago"
                                type="credit"
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Revenue Sources</h2>
                        <p className="mb-6 text-sm text-gray-500">Highest paying clients this month</p>
                        <div className="space-y-2">
                            <TopRevenueSource
                                name="GlobalCorp Industries"
                                description="10+ active shipments"
                                amount="R142,830"
                                status="Platinum"
                            />
                            <TopRevenueSource
                                name="MegaFleet Co."
                                description="8 active shipments"
                                amount="R95,420"
                                status="Premium"
                            />
                            <TopRevenueSource
                                name="ExecTrans Solutions"
                                description="6 active shipments"
                                amount="R76,190"
                                status="Standard"
                            />
                            <TopRevenueSource
                                name="AutoPack Inc."
                                description="4 active shipments"
                                amount="R52,300"
                                status="Standard"
                            />
                            <TopRevenueSource
                                name="FastFleet Chain"
                                description="3 active shipments"
                                amount="R41,290"
                                status="Basic"
                            />
                        </div>
                    </div>
                </section>
            </main>
        </DashboardLayout>
    );
};

export default Dashboard;
