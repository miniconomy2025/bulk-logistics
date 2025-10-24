import { render, screen, waitFor } from "@testing-library/react";

import Dashboard from "../../pages/dashboard";
import "@testing-library/jest-dom";

jest.mock("../../data/transactions", () => ({
    totals: jest.fn(),
    topSources: jest.fn(),
    getAll: jest.fn(),
    monthly: jest.fn(),
}));

jest.mock("../../data/shipments", () => ({
    activeShipments: jest.fn(),
}));

jest.mock("../../components/income-expense-chart", () => ({
    __esModule: true,
    default : function MockIncomeExpenseChart({ transaction }: any) {
        return <div data-testid="income-expense-chart">Chart with {transaction.length} data points</div>;
    },
}));

jest.mock("../../components/all-transactions", () => ({
    __esModule: true,
    default: function MockAllTransactions() {
        return <div data-testid="all-transactions">All Transactions Component</div>;
    },
}));

jest.mock("../../layouts/app-layout", () => ({
    DashboardLayout: function MockDashboardLayout({ children }: any) {
        return <div data-testid="dashboard-layout">{children}</div>;
    },
}));

jest.mock("../../components/ui/metric-card", () => ({
    MetricCard: function MockMetricCard({ title, value, bgColor, textColor, icon }: any) {
        const formattedValue = value.toLocaleString();
        const isCurrency = title !== "Active Shipments";
        const displayValue = isCurrency ? `Ð ${formattedValue}` : formattedValue;
        return (
            <div className={bgColor}>
                {icon}
                <h3>{title}</h3>
                <p className={textColor}>{displayValue}</p>
            </div>
        );
    },
}));

jest.mock("../../components/ui/transaction-item", () => ({
    TransactionItem: function MockTransactionItem({ label, percentage, colorClass }: any) {
        return (
            <div className={colorClass}>
                <p>{label}</p>
                <p>{percentage}</p>
            </div>
        );
    },
}));

jest.mock("../../components/recent-transactions", () => ({
    RecentTransaction: function MockRecentTransaction({ item }: any) {
        let displayText = "";
        switch (item.transaction_type) {
            case "PAYMENT_RECEIVED":
                displayText = `Payment from ${item.company}`;
                break;
            case "LOAN":
                displayText = "Loan repayment";
                break;
            default:
                displayText = `${item.transaction_type} for ${item.company}`;
        }
        return <div>{displayText}</div>;
    },
}));

jest.mock("../../components/ui/transactions-modal", () => {
    return function MockModal({ isOpen, onClose, children }: any) {
        if (!isOpen) return null;
        return (
            <div>
                <h2>Transaction History</h2>
                {children}
                <button
                    aria-label="Close modal"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        );
    };
});

describe("Dashboard", () => {
    const mockTransactions = {
        totals: jest.fn(),
        topSources: jest.fn(),
        getAll: jest.fn(),
        monthly: jest.fn(),
    };

    const mockShipments = {
        activeShipments: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTransactions.totals.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    transaction: [
                        {
                            expense: "1000",
                            loan: "500",
                            payment_received: "5000",
                            purchase: "200",
                        },
                    ],
                }),
        });

        mockTransactions.topSources.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    transaction: [
                        { company: "Company A", total: "2000", shipments: "5" },
                        { company: "Company B", total: "1500", shipments: "3" },
                    ],
                }),
        });

        mockTransactions.getAll.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    page: 1,
                    limit: 7,
                    totalPages: 1,
                    totalTransactions: 2,
                    transactions: [
                        {
                            company: "Company A",
                            amount: "2000",
                            transaction_date: "2024-01-15",
                            transaction_type: "PAYMENT_RECEIVED",
                            pickup_request_id: 123,
                        },
                        {
                            company: "Company B",
                            amount: "1500",
                            transaction_date: "2024-01-16",
                            transaction_type: "LOAN",
                            pickup_request_id: 124,
                        },
                    ],
                }),
        });

        mockTransactions.monthly.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    transaction: [
                        { year: "2024", month: "1", revenue: 5000, expenses: 1700 },
                        { year: "2024", month: "2", revenue: 4500, expenses: 1200 },
                    ],
                }),
        });

        mockShipments.activeShipments.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    shipments: { active: "3" },
                }),
        });
    });

    it("should render dashboard with all sections", async () => {
        render(<Dashboard />);

        expect(screen.getByText("Financial Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Track revenue, expenses, and transaction flow")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText("Total Revenues")).toBeInTheDocument();
            expect(screen.getByText("Total Expenses")).toBeInTheDocument();
            expect(screen.getByText("Net Profit")).toBeInTheDocument();
            expect(screen.getByText("Active Shipments")).toBeInTheDocument();
            expect(screen.getByText("Revenue vs Expenses")).toBeInTheDocument();
            expect(screen.getByText("Monthly comparison over the months")).toBeInTheDocument();
        });
    });

    it("should display metric cards with correct values", async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getAllByText("Ð 0").length).toBeGreaterThan(0);
            expect(screen.getByText("0")).toBeInTheDocument();
        });
    });

    it("should display transaction breakdown", async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("Transaction Breakdown")).toBeInTheDocument();
            expect(screen.getByText("Distribution of income sources")).toBeInTheDocument();
        });
    });

    it("should display recent transactions", async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("Recent Transactions")).toBeInTheDocument();
            expect(screen.getByText("Added financial activity")).toBeInTheDocument();
        });
    });


    it("should handle API errors gracefully", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        mockTransactions.totals.mockRejectedValue(new Error("API Error"));
        mockTransactions.topSources.mockRejectedValue(new Error("API Error"));
        mockTransactions.getAll.mockRejectedValue(new Error("API Error"));
        mockTransactions.monthly.mockRejectedValue(new Error("API Error"));

        render(<Dashboard />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });

    });
});
