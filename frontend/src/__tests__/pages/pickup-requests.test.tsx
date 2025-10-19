import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PickupRequestDashboard from "../../pages/pickup-requests";

jest.mock("../../data/pickup-requests", () => ({
    allPickupRequests: jest.fn(),
}));

jest.mock("../../components/pickup-requests-table", () => {
    return function MockPickupRequestsTable({ requests }: any) {
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
    };
});

jest.mock("../../layouts/app-layout", () => {
    return function MockDashboardLayout({ children }: any) {
        return <div data-testid="dashboard-layout">{children}</div>;
    };
});

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

        expect(screen.getByText("Pickup Requests")).toBeInTheDocument();
        expect(screen.getByText("Track pickup requests and their statuses")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText("All Requests")).toBeInTheDocument();
            expect(screen.getByText("In Progress")).toBeInTheDocument();
            expect(screen.getByText("Completed")).toBeInTheDocument();
        });
    });

    it("should display correct metric counts", async () => {
        render(<PickupRequestDashboard />);

        await waitFor(() => {
            expect(screen.getByText("3")).toBeInTheDocument(); // All Requests
            expect(screen.getByText("1")).toBeInTheDocument(); // In Progress (1 pending)
            expect(screen.getByText("2")).toBeInTheDocument(); // Completed (2 with completionDate)
        });
    });

    it("should display pickup requests table", async () => {
        render(<PickupRequestDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("pickup-requests-table")).toBeInTheDocument();
            expect(screen.getByTestId("request-0")).toBeInTheDocument();
            expect(screen.getByTestId("request-1")).toBeInTheDocument();
            expect(screen.getByTestId("request-2")).toBeInTheDocument();
        });
    });

    it("should display table content correctly", async () => {
        render(<PickupRequestDashboard />);

        await waitFor(() => {
            expect(screen.getByText("company-a → company-b")).toBeInTheDocument();
            expect(screen.getByText("company-c → company-d")).toBeInTheDocument();
            expect(screen.getByText("company-e → company-f")).toBeInTheDocument();
        });
    });

    it("should show refresh button", async () => {
        render(<PickupRequestDashboard />);

        await waitFor(() => {
            const refreshButton = screen.getByRole("button", { name: /autorenew/i });
            expect(refreshButton).toBeInTheDocument();
        });
    });

    it("should refresh data when refresh button is clicked", async () => {
        const user = userEvent.setup();
        render(<PickupRequestDashboard />);

        await waitFor(() => {
            expect(mockPickupRequest.allPickupRequests).toHaveBeenCalledTimes(1);
        });

        const refreshButton = screen.getByRole("button", { name: /autorenew/i });
        await user.click(refreshButton);

        await waitFor(() => {
            expect(mockPickupRequest.allPickupRequests).toHaveBeenCalledTimes(2);
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

    it("should calculate completed requests correctly", async () => {
        const mixedData = [
            { ...mockPickupRequestsData[0], completionDate: "2024-01-20" }, // Completed
            { ...mockPickupRequestsData[1], completionDate: null }, // In Progress
            { ...mockPickupRequestsData[2], completionDate: "2024-01-22" }, // Completed
        ];

        mockPickupRequest.allPickupRequests.mockResolvedValue({
            json: () => Promise.resolve(mixedData),
        });

        render(<PickupRequestDashboard />);

        await waitFor(() => {
            expect(screen.getByText("3")).toBeInTheDocument(); // All Requests
            expect(screen.getByText("1")).toBeInTheDocument(); // In Progress
            expect(screen.getByText("2")).toBeInTheDocument(); // Completed
        });
    });

    it("should handle empty completion dates", async () => {
        const dataWithNullCompletion = mockPickupRequestsData.map((request) => ({
            ...request,
            completionDate: null,
        }));

        mockPickupRequest.allPickupRequests.mockResolvedValue({
            json: () => Promise.resolve(dataWithNullCompletion),
        });

        render(<PickupRequestDashboard />);

        await waitFor(() => {
            expect(screen.getByText("3")).toBeInTheDocument(); // All Requests
            expect(screen.getByText("3")).toBeInTheDocument(); // In Progress (all null completionDate)
            expect(screen.getByText("0")).toBeInTheDocument(); // Completed
        });
    });

    it("should render with correct CSS classes", async () => {
        render(<PickupRequestDashboard />);

        await waitFor(() => {
            const mainElement = screen.getByRole("main");
            expect(mainElement).toHaveClass("w-full", "flex-1", "overflow-y-auto", "p-8", "pt-[4.5rem]", "lg:ml-64", "lg:pt-8");
        });
    });

    it("should display metric cards with correct styling", async () => {
        render(<PickupRequestDashboard />);

        await waitFor(() => {
            const allRequestsCard = screen.getByText("All Requests").closest("div");
            expect(allRequestsCard).toHaveClass(
                "flex",
                "flex-grow",
                "items-center",
                "rounded-xl",
                "border",
                "border-gray-200",
                "bg-white",
                "p-4",
                "shadow-sm",
            );
        });
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
