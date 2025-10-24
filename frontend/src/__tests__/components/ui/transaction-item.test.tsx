import { render, screen } from "@testing-library/react";
import { TransactionItem } from "../../../components/ui/transaction-item";
import "@testing-library/jest-dom";

describe("TransactionItem", () => {
    const defaultProps = {
        label: "Test Company",
        percentage: "25.5%",
        colorClass: "bg-blue-500",
    };

    it("should render with all required props", () => {
        render(<TransactionItem {...defaultProps} />);

        expect(screen.getByText("Test Company")).toBeInTheDocument();
        expect(screen.getByText("25.5%")).toBeInTheDocument();
    });

    it("should render the color indicator with correct class", () => {
        render(<TransactionItem {...defaultProps} />);

        const colorIndicator = screen.getByText("Test Company").closest("div")?.querySelector("span");
        expect(colorIndicator).toHaveClass("h-2", "w-2", "rounded-full", "bg-blue-500", "mr-2");
    });

    it("should handle different color classes", () => {
        render(
            <TransactionItem
                {...defaultProps}
                colorClass="bg-red-500"
            />,
        );

        const colorIndicator = screen.getByText("Test Company").closest("div")?.querySelector("span");
        expect(colorIndicator).toHaveClass("bg-red-500");
        expect(colorIndicator).not.toHaveClass("bg-blue-500");
    });

    it("should handle different percentage formats", () => {
        render(
            <TransactionItem
                {...defaultProps}
                percentage="100%"
            />,
        );
        expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("should handle decimal percentages", () => {
        render(
            <TransactionItem
                {...defaultProps}
                percentage="33.33%"
            />,
        );
        expect(screen.getByText("33.33%")).toBeInTheDocument();
    });

    it("should handle zero percentage", () => {
        render(
            <TransactionItem
                {...defaultProps}
                percentage="0%"
            />,
        );
        expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("should handle long company names", () => {
        const longName = "Very Long Company Name That Might Overflow";
        render(
            <TransactionItem
                {...defaultProps}
                label={longName}
            />,
        );
        expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it("should handle special characters in company names", () => {
        const specialName = "Company & Co. (Ltd.)";
        render(
            <TransactionItem
                {...defaultProps}
                label={specialName}
            />,
        );
        expect(screen.getByText(specialName)).toBeInTheDocument();
    });

    it("should apply correct text styling", () => {
        render(<TransactionItem {...defaultProps} />);

        const label = screen.getByText("Test Company");
        const percentage = screen.getByText("25.5%");

        expect(label).toHaveClass("text-sm", "text-gray-700");
        expect(percentage).toHaveClass("text-sm", "font-medium", "text-gray-900");
    });

    it("should handle multiple color classes", () => {
        render(
            <TransactionItem
                {...defaultProps}
                colorClass="bg-green-500 bg-opacity-50"
            />,
        );

        const colorIndicator = screen.getByText("Test Company").closest("div")?.querySelector("span");
        expect(colorIndicator).toHaveClass("bg-green-500", "bg-opacity-50");
    });
});
