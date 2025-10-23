import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PickupRequestDashboard from "../../pages/pickup-requests";
import "@testing-library/jest-dom";

jest.mock("../../data/pickup-requests", () => ({
    allPickupRequests: jest.fn(),
}));

jest.mock("../../components/pickup-requests-table", () => ({
    PickupRequestsTable: function MockPickupRequestsTable({ requests }: any) {
        return (
            <div data-testid="pickup-requests-table">
                {requests.map((request: any, index: number) => (
                    <div
                        key={index}
                        data-testid={`request-${index}`}
                    >
                        {request.originCompanyName} → {request.destinationCompanyName}
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

describe("PickupRequestDashboard", () => {
    const mockPickupRequest = {
        allPickupRequests: jest.fn(),
    };

    const mockPickupRequestsData = [
        {
            id: 1,
            requestDate: "2024-01-15",
            originCompanyName: "company-a",
            destinationCompanyName: "company-b",
            cost: 1000,
            paymentStatus: "COMPLETED",
            completionDate: "2024-01-20",
        },
        {
            id: 2,
            requestDate: "2024-01-16",
            originCompanyName: "company-c",
            destinationCompanyName: "company-d",
            cost: 1500,
            paymentStatus: "PENDING",
            completionDate: null,
        },
        {
            id: 3,
            requestDate: "2024-01-17",
            originCompanyName: "company-e",
            destinationCompanyName: "company-f",
            cost: 2000,
            paymentStatus: "COMPLETED",
            completionDate: "2024-01-22",
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        mockPickupRequest.allPickupRequests.mockResolvedValue({
            json: () => Promise.resolve(mockPickupRequestsData),
        });
    });

    it("should render pickup requests dashboard", async () => {
        render(<PickupRequestDashboard />);

        expect(screen.getByTitle("pr-heading")).toBeInTheDocument();
        expect(screen.getByText("Track pickup requests and their statuses")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText("All Requests")).toBeInTheDocument();
            expect(screen.getByText("In Progress")).toBeInTheDocument();
            expect(screen.getByText("Completed")).toBeInTheDocument();
        });
    });

    it("should show refresh button", async () => {
        render(<PickupRequestDashboard />);

        await waitFor(() => {
            const refreshButton = screen.getByRole("button", { name: /autorenew/i });
            expect(refreshButton).toBeInTheDocument();
        });
    });

    it('should display "No pickup request available" when no data', async () => {
        mockPickupRequest.allPickupRequests.mockResolvedValue({
            json: () => Promise.resolve([]),
        });

        render(<PickupRequestDashboard />);

        await waitFor(() => {
            expect(screen.getByText("No pickup request available")).toBeInTheDocument();
        });
    });

    it("should handle API errors gracefully", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        mockPickupRequest.allPickupRequests.mockRejectedValue(new Error("API Error"));

        render(<PickupRequestDashboard />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });

        consoleSpy.mockRestore();
    });

    it("should handle refresh button click without errors", async () => {
        const user = userEvent.setup();
        render(<PickupRequestDashboard />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /autorenew/i })).toBeInTheDocument();
        });

        const refreshButton = screen.getByRole("button", { name: /autorenew/i });

        await expect(user.click(refreshButton)).resolves.not.toThrow();
    });
});
