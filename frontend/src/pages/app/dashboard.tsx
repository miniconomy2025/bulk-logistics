import { RecentTransaction } from "../../components/recent-transactions";
import { TopRevenueSource } from "../../components/top-revenue";
import { MetricCard } from "../../components/ui/metric-card";
import { TransactionItem } from "../../components/ui/transaction-item";
import { DashboardLayout } from "../../layouts/app/dashboard-layout";

const Dashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <main className="flex-1 p-8 overflow-y-auto w-full pt-[4.5rem] lg:pt-8 lg:ml-64">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Financial Dashboard
            </h1>
            <p className="text-md text-gray-500">
              Track revenue, expenses, and transaction flow
            </p>
          </div>
        </header>

        {/* Key Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Revenues"
            value="R847,293"
            change="+12.9% "
            changeType="increase"
            bgColor="bg-green-100"
            textColor="text-green-600"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1L21 12m-6 4h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01-.707 1.707H3.707a1 1 0 01-.707-1.707l2.414-2.414A1 1 0 017.414 16H10m-2.592-8a2 2 0 012.592-1z"
                ></path>
              </svg>
            }
          />
          <MetricCard
            title="Total Expenses"
            value="R324,891"
            change="+8.2% "
            changeType="decrease"
            bgColor="bg-red-100"
            textColor="text-red-600"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                ></path>
              </svg>
            }
          />
          <MetricCard
            title="Net Profit"
            value="R522,402"
            change="+12.9% "
            changeType="increase"
            bgColor="bg-blue-100"
            textColor="text-blue-600"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0h.01M9 19H7a2 2 0 01-2-2v-6a2 2 0 012-2h2m2-7v11m3-4h.01M17 19h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a2 2 0 002 2z"
                ></path>
              </svg>
            }
          />
          <MetricCard
            title="Active Shipments"
            value="1,247"
            change="+25 new today"
            changeType="increase"
            bgColor="bg-orange-100"
            textColor="text-orange-600"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                ></path>
              </svg>
            }
          />
        </section>

        {/* Revenue vs Expenses & Transaction Breakdown */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue vs Expenses
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Monthly comparison over the last 12 months
            </p>
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400">
              Chart visualization would be here
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Transaction Breakdown
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Distribution of income sources
            </p>
            <div className="space-y-2">
              <TransactionItem
                label="Freight Services"
                percentage="72%"
                colorClass="bg-blue-500"
              />
              <TransactionItem
                label="Storage Fees"
                percentage="18%"
                colorClass="bg-green-500"
              />
              <TransactionItem
                label="Insurance"
                percentage="7%"
                colorClass="bg-orange-500"
              />
              <TransactionItem
                label="Other Services"
                percentage="3%"
                colorClass="bg-purple-500"
              />
            </div>
          </div>
        </section>

        {/* Recent Transactions & Top Revenue Sources */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Transactions
              </h2>
              <button className="text-sm text-blue-600 font-medium hover:underline">
                View all
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Added financial activity
            </p>
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

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Revenue Sources
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Highest paying clients this month
            </p>
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
