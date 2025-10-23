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
    IncomeExpenseChart: function MockIncomeExpenseChart({ transaction }: any) {
        return <div data-testid="income-expense-chart">Chart with {transaction.length} data points</div>;
    },
}));

jest.mock("../../components/all-transactions", () => ({
    AllTransactions: function MockAllTransactions() {
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
                {label} {percentage}
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
                            amount: "1000",
                            transaction_date: "2024-01-15",
                            transaction_type: "PAYMENT_RECEIVED",
                            pickup_request_id: 123,
                        },
                        {
                            company: "Company B",
                            amount: "500",
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
        });
    });

    it("should display metric cards with correct values", async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("Ð 5,000")).toBeInTheDocument();
            expect(screen.getByText("Ð 1,700")).toBeInTheDocument();
            expect(screen.getByText("Ð 3,300")).toBeInTheDocument();
            expect(screen.getByText("3")).toBeInTheDocument();
        });
    });

    it("should display revenue vs expenses chart", async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("Revenue vs Expenses")).toBeInTheDocument();
            expect(screen.getByText("Monthly comparison over the months")).toBeInTheDocument();
            expect(screen.getByTestId("income-expense-chart")).toBeInTheDocument();
        });
    });

    it("should display transaction breakdown", async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("Transaction Breakdown")).toBeInTheDocument();
            expect(screen.getByText("Distribution of income sources")).toBeInTheDocument();
            expect(screen.getByText("Company A")).toBeInTheDocument();
            expect(screen.getByText("Company B")).toBeInTheDocument();
        });
    });

    it("should display recent transactions", async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("Recent Transactions")).toBeInTheDocument();
            expect(screen.getByText("Added financial activity")).toBeInTheDocument();
            expect(screen.getByText("Payment from Company A")).toBeInTheDocument();
            expect(screen.getByText("Loan repayment")).toBeInTheDocument();
        });
    });

    it('should open modal when "View all" button is clicked', async () => {
        const user = userEvent.setup();
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("View all")).toBeInTheDocument();
        });

        const viewAllButton = screen.getByText("View all");
        await user.click(viewAllButton);

        expect(screen.getByText("Transaction History")).toBeInTheDocument();
        expect(screen.getByTestId("all-transactions")).toBeInTheDocument();
    });

    it("should close modal when close button is clicked", async () => {
        const user = userEvent.setup();
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("View all")).toBeInTheDocument();
        });

        const viewAllButton = screen.getByText("View all");
        await user.click(viewAllButton);

        expect(screen.getByText("Transaction History")).toBeInTheDocument();

        const closeButton = screen.getByLabelText("Close modal");
        await user.click(closeButton);

        await waitFor(() => {
            expect(screen.queryByText("Transaction History")).not.toBeInTheDocument();
        });
    });

    it("should handle API errors gracefully", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        mockTransactions.totals.mockRejectedValue(new Error("API Error"));
        mockTransactions.topSources.mockRejectedValue(new Error("API Error"));
        mockTransactions.getAll.mockRejectedValue(new Error("API Error"));
        mockTransactions.monthly.mockRejectedValue(new Error("API Error"));
        mockShipments.activeShipments.mockRejectedValue(new Error("API Error"));

        render(<Dashboard />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });

        consoleSpy.mockRestore();
    });

    it("should display loading state initially", () => {
        render(<Dashboard />);

        expect(screen.getByText("Ð 0")).toBeInTheDocument();
    });

    it("should calculate percentages correctly for transaction breakdown", async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("40.00%")).toBeInTheDocument();
            expect(screen.getByText("30.00%")).toBeInTheDocument();
        });
    });

    it("should handle empty transaction data", async () => {
        mockTransactions.topSources.mockResolvedValue({
            json: () => Promise.resolve({ transaction: [] }),
        });

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("Transaction Breakdown")).toBeInTheDocument();
        });
    });

    it("should handle zero values in calculations", async () => {
        mockTransactions.totals.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    transaction: [
                        {
                            expense: "0",
                            loan: "0",
                            payment_received: "0",
                            purchase: "0",
                        },
                    ],
                }),
        });

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText("Ð 0")).toBeInTheDocument(); // All values should be 0
        });
    });

    it("should render with correct CSS classes", async () => {
        render(<Dashboard />);

        await waitFor(() => {
            const mainElement = screen.getByRole("main");
            expect(mainElement).toHaveClass("w-full", "flex-1", "overflow-y-auto", "p-8", "pt-[4.5rem]", "lg:ml-64", "lg:pt-8");
        });
    });
});
