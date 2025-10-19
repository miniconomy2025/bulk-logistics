import { render, screen } from "@testing-library/react";
import { RecentTransaction } from "../../components/recent-transactions";
import type { RecentTransactionsItem } from "../../types";

jest.mock("../../../utils/format-date", () => ({
    formatDate: jest.fn((date: string) => `Formatted: ${date}`),
}));

describe("RecentTransaction", () => {
    const mockTransaction: RecentTransactionsItem = {
        company: "Test Company",
        amount: "1000.50",
        transaction_date: "2024-01-15",
        transaction_type: "PAYMENT_RECEIVED",
        pickup_request_id: 123,
    };

    it("should render payment received transaction correctly", () => {
        render(<RecentTransaction item={mockTransaction} />);

        expect(screen.getByText("Payment from Test Company")).toBeInTheDocument();
        expect(screen.getByText("Shipment #123")).toBeInTheDocument();
        expect(screen.getByText("+ Ð 1000.50")).toBeInTheDocument();
        expect(screen.getByText("Formatted: 2024-01-15")).toBeInTheDocument();
    });

    it("should render loan transaction correctly", () => {
        const loanTransaction = { ...mockTransaction, transaction_type: "LOAN" };
        render(<RecentTransaction item={loanTransaction} />);

        expect(screen.getByText("Payment from Test Company")).toBeInTheDocument();
        expect(screen.getByText("Shipment #123")).toBeInTheDocument();
        expect(screen.getByText("+ Ð 1000.50")).toBeInTheDocument();
    });

    it("should render debit transaction correctly", () => {
        const debitTransaction = { ...mockTransaction, transaction_type: "EXPENSE" };
        render(<RecentTransaction item={debitTransaction} />);

        expect(screen.getByText("Loan repayment")).toBeInTheDocument();
        expect(screen.getByText("Loan disbursement")).toBeInTheDocument();
        expect(screen.getByText("- Ð 1000.50")).toBeInTheDocument();
    });

    it("should apply correct styling for credit transactions", () => {
        render(<RecentTransaction item={mockTransaction} />);

        const amountElement = screen.getByText("+ Ð 1000.50");
        expect(amountElement).toHaveClass("text-green-600");
    });

    it("should apply correct styling for debit transactions", () => {
        const debitTransaction = { ...mockTransaction, transaction_type: "EXPENSE" };
        render(<RecentTransaction item={debitTransaction} />);

        const amountElement = screen.getByText("- Ð 1000.50");
        expect(amountElement).toHaveClass("text-red-600");
    });

    it("should handle different transaction types", () => {
        const purchaseTransaction = { ...mockTransaction, transaction_type: "PURCHASE" };
        render(<RecentTransaction item={purchaseTransaction} />);

        expect(screen.getByText("Loan repayment")).toBeInTheDocument();
        expect(screen.getByText("- Ð 1000.50")).toBeInTheDocument();
    });

    it("should handle zero amount", () => {
        const zeroTransaction = { ...mockTransaction, amount: "0" };
        render(<RecentTransaction item={zeroTransaction} />);

        expect(screen.getByText("+ Ð 0")).toBeInTheDocument();
    });

    it("should handle negative amount", () => {
        const negativeTransaction = { ...mockTransaction, amount: "-500.25" };
        render(<RecentTransaction item={negativeTransaction} />);

        expect(screen.getByText("+ Ð -500.25")).toBeInTheDocument();
    });

    it("should handle different pickup request IDs", () => {
        const transactionWithDifferentId = { ...mockTransaction, pickup_request_id: 999 };
        render(<RecentTransaction item={transactionWithDifferentId} />);

        expect(screen.getByText("Shipment #999")).toBeInTheDocument();
    });

    it("should handle zero pickup request ID", () => {
        const transactionWithZeroId = { ...mockTransaction, pickup_request_id: 0 };
        render(<RecentTransaction item={transactionWithZeroId} />);

        expect(screen.getByText("Shipment #0")).toBeInTheDocument();
    });

    it("should apply correct container styling", () => {
        render(<RecentTransaction item={mockTransaction} />);

        const container = screen.getByText("Payment from Test Company").closest("div");
        expect(container).toHaveClass("flex", "items-center", "justify-between", "border-b", "border-gray-100", "py-3", "last:border-b-0");
    });

    it("should handle empty company name", () => {
        const emptyCompanyTransaction = { ...mockTransaction, company: "" };
        render(<RecentTransaction item={emptyCompanyTransaction} />);

        expect(screen.getByText("Payment from ")).toBeInTheDocument();
    });

    it("should handle special characters in company name", () => {
        const specialCompanyTransaction = { ...mockTransaction, company: "Company & Co. (Ltd.)" };
        render(<RecentTransaction item={specialCompanyTransaction} />);

        expect(screen.getByText("Payment from Company & Co. (Ltd.)")).toBeInTheDocument();
    });
});
