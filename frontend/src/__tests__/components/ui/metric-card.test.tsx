import { render, screen } from "@testing-library/react";
import { MetricCard } from "../../../components/ui/metric-card";

describe("MetricCard", () => {
    const defaultProps = {
        title: "Test Metric",
        value: 1234,
        icon: <span data-testid="test-icon">📊</span>,
        bgColor: "bg-blue-100",
        textColor: "text-blue-600",
    };

    it("should render with all required props", () => {
        render(<MetricCard {...defaultProps} />);

        expect(screen.getByText("Test Metric")).toBeInTheDocument();
        expect(screen.getByText("1,234")).toBeInTheDocument();
        expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });

    it("should format numbers with commas for large values", () => {
        render(
            <MetricCard
                {...defaultProps}
                value={1234567}
            />,
        );
        expect(screen.getByText("1,234,567")).toBeInTheDocument();
    });

    it("should not show currency symbol for shipment type", () => {
        render(
            <MetricCard
                {...defaultProps}
                type="shipment"
            />,
        );
        expect(screen.getByText("1,234")).toBeInTheDocument();
        expect(screen.queryByText("Ð")).not.toBeInTheDocument();
    });

    it("should show currency symbol for non-shipment types", () => {
        render(<MetricCard {...defaultProps} />);
        expect(screen.getByText("Ð 1,234")).toBeInTheDocument();
    });

    it('should show currency symbol for "Active Shipments" title', () => {
        render(
            <MetricCard
                {...defaultProps}
                title="Active Shipments"
            />,
        );
        expect(screen.getByText("Ð 1,234")).toBeInTheDocument();
    });

    it("should handle zero values", () => {
        render(
            <MetricCard
                {...defaultProps}
                value={0}
            />,
        );
        expect(screen.getByText("Ð 0")).toBeInTheDocument();
    });

    it("should handle negative values", () => {
        render(
            <MetricCard
                {...defaultProps}
                value={-1234}
            />,
        );
        expect(screen.getByText("Ð -1,234")).toBeInTheDocument();
    });

    it("should apply custom background and text colors", () => {
        render(
            <MetricCard
                {...defaultProps}
                bgColor="bg-red-100"
                textColor="text-red-600"
            />,
        );

        const iconContainer = screen.getByTestId("test-icon").closest("div");
        expect(iconContainer).toHaveClass("bg-red-100", "text-red-600");
    });

    it("should render different icons correctly", () => {
        const customIcon = <span data-testid="custom-icon">🚀</span>;
        render(
            <MetricCard
                {...defaultProps}
                icon={customIcon}
            />,
        );

        expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
        expect(screen.queryByTestId("test-icon")).not.toBeInTheDocument();
    });

    it("should handle decimal values", () => {
        render(
            <MetricCard
                {...defaultProps}
                value={1234.56}
            />,
        );
        expect(screen.getByText("Ð 1,234.56")).toBeInTheDocument();
    });

    it("should handle very large numbers", () => {
        render(
            <MetricCard
                {...defaultProps}
                value={999999999}
            />,
        );
        expect(screen.getByText("Ð 999,999,999")).toBeInTheDocument();
    });
});
