import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShipmentsDashboard from "../../pages/shipments";
import "@testing-library/jest-dom";

jest.mock("../../data/shipments", () => ({
    allShipments: jest.fn(),
}));

jest.mock("../../data/shipment-status", () => ({
    allShipmentStatuses: jest.fn(),
}));

jest.mock("../../components/shipment-items", () => ({
    ShipmentTable: function MockShipmentTable({ shipments }: any) {
        return (
            <div data-testid="shipment-table">
                {shipments.map((shipment: any, index: number) => (
                    <div
                        key={index}
                        data-testid={`shipment-${index}`}
                    >
                        {shipment.vehicle} - {shipment.status.statusName}
                    </div>
                ))}
            </div>
        );
    },
}));

jest.mock("../../layouts/app-layout", () => ({
    DashboardLayout: function MockDashboardLayout({ children }: any) {
        return <div data-testid="dashboard-layout">{children}</div>;
    },
}));

describe("ShipmentsDashboard", () => {
    const mockShipments = {
        allShipments: jest.fn(),
    };

    const mockShipmentStatus = {
        allShipmentStatuses: jest.fn(),
    };

    const mockShipmentsData = [
        {
            id: 1,
            dispatch_date: "2024-01-15",
            vehicle: "truck_heavy",
            status: { statusId: 1, statusName: "PENDING" },
        },
        {
            id: 2,
            dispatch_date: "2024-01-16",
            vehicle: "van_small",
            status: { statusId: 2, statusName: "PICKED_UP" },
        },
        {
            id: 3,
            dispatch_date: "2024-01-17",
            vehicle: "car_electric",
            status: { statusId: 3, statusName: "DELIVERED" },
        },
    ];

    const mockStatusData = [
        { shipmentStatusId: 1, name: "PENDING" },
        { shipmentStatusId: 2, name: "PICKED_UP" },
        { shipmentStatusId: 3, name: "DELIVERED" },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        mockShipments.allShipments.mockResolvedValue({
            json: () => Promise.resolve(mockShipmentsData),
        });

        mockShipmentStatus.allShipmentStatuses.mockResolvedValue({
            json: () => Promise.resolve(mockStatusData),
        });
    });

    it("should render shipments dashboard", async () => {
        render(<ShipmentsDashboard />);

        expect(screen.getByText("Shipments Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Track shipments schedules")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText("All Shipments")).toBeInTheDocument();
            expect(screen.getByText("Pending")).toBeInTheDocument();
            expect(screen.getByText("In Transit")).toBeInTheDocument();
            expect(screen.getByText("Completed")).toBeInTheDocument();
        });
    });

    it("should display correct metric counts", async () => {
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(screen.getByText("3")).toBeInTheDocument(); // All Shipments
            expect(screen.getByText("1")).toBeInTheDocument(); // Pending
            expect(screen.getByText("1")).toBeInTheDocument(); // In Transit (PICKED_UP)
            expect(screen.getByText("1")).toBeInTheDocument(); // Completed (DELIVERED)
        });
    });

    it("should display shipments table", async () => {
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("shipment-table")).toBeInTheDocument();
            expect(screen.getByTestId("shipment-0")).toBeInTheDocument();
            expect(screen.getByTestId("shipment-1")).toBeInTheDocument();
            expect(screen.getByTestId("shipment-2")).toBeInTheDocument();
        });
    });

    it("should display table content correctly", async () => {
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(screen.getByText("truck_heavy - PENDING")).toBeInTheDocument();
            expect(screen.getByText("van_small - PICKED_UP")).toBeInTheDocument();
            expect(screen.getByText("car_electric - DELIVERED")).toBeInTheDocument();
        });
    });

    it("should show status filter dropdown", async () => {
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(screen.getByLabelText("Filter by Status")).toBeInTheDocument();
            expect(screen.getByText("All Shipments")).toBeInTheDocument();
            expect(screen.getByText("Pending")).toBeInTheDocument();
            expect(screen.getByText("In Transit")).toBeInTheDocument();
            expect(screen.getByText("Delivered")).toBeInTheDocument();
        });
    });

    it("should filter shipments by status", async () => {
        const user = userEvent.setup();
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("shipment-table")).toBeInTheDocument();
        });

        const statusFilter = screen.getByLabelText("Filter by Status");
        await user.selectOptions(statusFilter, "1"); // PENDING

        await waitFor(() => {
            expect(screen.getByText("truck_heavy - PENDING")).toBeInTheDocument();
            expect(screen.queryByText("van_small - PICKED_UP")).not.toBeInTheDocument();
            expect(screen.queryByText("car_electric - DELIVERED")).not.toBeInTheDocument();
        });
    });

    it('should show all shipments when "All Shipments" is selected', async () => {
        const user = userEvent.setup();
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("shipment-table")).toBeInTheDocument();
        });

        const statusFilter = screen.getByLabelText("Filter by Status");
        await user.selectOptions(statusFilter, ""); // All Shipments

        await waitFor(() => {
            expect(screen.getByText("truck_heavy - PENDING")).toBeInTheDocument();
            expect(screen.getByText("van_small - PICKED_UP")).toBeInTheDocument();
            expect(screen.getByText("car_electric - DELIVERED")).toBeInTheDocument();
        });
    });

    it("should show refresh button", async () => {
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            const refreshButton = screen.getByRole("button", { name: /autorenew/i });
            expect(refreshButton).toBeInTheDocument();
        });
    });

    it("should refresh data when refresh button is clicked", async () => {
        const user = userEvent.setup();
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(mockShipments.allShipments).toHaveBeenCalledTimes(1);
        });

        const refreshButton = screen.getByRole("button", { name: /autorenew/i });
        await user.click(refreshButton);

        await waitFor(() => {
            expect(mockShipments.allShipments).toHaveBeenCalledTimes(2);
        });
    });

    it("should reset filter when refresh button is clicked", async () => {
        const user = userEvent.setup();
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("shipment-table")).toBeInTheDocument();
        });

        const statusFilter = screen.getByLabelText("Filter by Status");
        await user.selectOptions(statusFilter, "1");

        const refreshButton = screen.getByRole("button", { name: /autorenew/i });
        await user.click(refreshButton);

        await waitFor(() => {
            expect(statusFilter).toHaveValue("");
        });
    });

    it('should display "No shipments available" when no data', async () => {
        mockShipments.allShipments.mockResolvedValue({
            json: () => Promise.resolve([]),
        });

        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(screen.getByText("No shipments available")).toBeInTheDocument();
        });
    });

    it("should handle API errors gracefully", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        mockShipments.allShipments.mockRejectedValue(new Error("API Error"));
        mockShipmentStatus.allShipmentStatuses.mockRejectedValue(new Error("API Error"));

        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });

        consoleSpy.mockRestore();
    });

    it("should format status names correctly", async () => {
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            // PICKED_UP should be displayed as "In Transit"
            expect(screen.getByText("In Transit")).toBeInTheDocument();
            // Other statuses should be formatted normally
            expect(screen.getByText("Pending")).toBeInTheDocument();
            expect(screen.getByText("Delivered")).toBeInTheDocument();
        });
    });

    it("should handle different status combinations", async () => {
        const mixedStatusData = [
            { ...mockShipmentsData[0], status: { statusId: 1, statusName: "PENDING" } },
            { ...mockShipmentsData[1], status: { statusId: 2, statusName: "PICKED_UP" } },
            { ...mockShipmentsData[2], status: { statusId: 3, statusName: "DELIVERED" } },
        ];

        mockShipments.allShipments.mockResolvedValue({
            json: () => Promise.resolve(mixedStatusData),
        });

        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(screen.getByText("3")).toBeInTheDocument(); // All Shipments
            expect(screen.getByText("1")).toBeInTheDocument(); // Pending
            expect(screen.getByText("1")).toBeInTheDocument(); // In Transit
            expect(screen.getByText("1")).toBeInTheDocument(); // Completed
        });
    });

    it("should render with correct CSS classes", async () => {
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            const mainElement = screen.getByRole("main");
            expect(mainElement).toHaveClass("w-full", "flex-1", "overflow-y-auto", "p-8", "pt-[4.5rem]", "lg:ml-64", "lg:pt-8");
        });
    });

    it("should handle filter change without errors", async () => {
        const user = userEvent.setup();
        render(<ShipmentsDashboard />);

        await waitFor(() => {
            expect(screen.getByLabelText("Filter by Status")).toBeInTheDocument();
        });

        const statusFilter = screen.getByLabelText("Filter by Status");

        await expect(user.selectOptions(statusFilter, "2")).resolves.not.toThrow();
    });
});
