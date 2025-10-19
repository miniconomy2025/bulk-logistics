import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../../../components/ui/transactions-modal";

jest.mock("../../../data/transactions", () => ({
    getAll: jest.fn(),
}));

jest.mock("../../../utils/format-date", () => ({
    formatDate: jest.fn((date: string) => `Formatted: ${date}`),
}));

global.URL.createObjectURL = jest.fn(() => "mock-url");
global.URL.revokeObjectURL = jest.fn();

const mockLink = {
    click: jest.fn(),
    setAttribute: jest.fn(),
    style: {},
    download: "transactions.csv",
};
const mockCreateElement = jest.fn(() => mockLink);
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

Object.defineProperty(document, "createElement", {
    value: mockCreateElement,
    writable: true,
});
Object.defineProperty(document.body, "appendChild", {
    value: mockAppendChild,
    writable: true,
});
Object.defineProperty(document.body, "removeChild", {
    value: mockRemoveChild,
    writable: true,
});

describe("Modal", () => {
    const mockOnClose = jest.fn();
    const mockChildren = <div data-testid="modal-children">Modal Content</div>;

    beforeEach(() => {
        jest.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getAll } = require("../../../data/transactions");
        getAll.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    page: 1,
                    limit: 20,
                    totalPages: 1,
                    totalTransactions: 2,
                    transactions: [
                        {
                            company: "Test Company",
                            amount: "1000.50",
                            transaction_date: "2024-01-15",
                            transaction_type: "PAYMENT_RECEIVED",
                            pickup_request_id: 123,
                        },
                        {
                            company: "Another Company",
                            amount: "500.25",
                            transaction_date: "2024-01-16",
                            transaction_type: "EXPENSE",
                            pickup_request_id: 124,
                        },
                    ],
                }),
        });
    });

    it("should not render when isOpen is false", () => {
        render(
            <Modal
                isOpen={false}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        expect(screen.queryByTestId("modal-children")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        expect(screen.getByText("Transaction History")).toBeInTheDocument();
        expect(screen.getByTestId("modal-children")).toBeInTheDocument();
    });

    it("should call onClose when close button is clicked", async () => {
        const user = userEvent.setup();
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        const closeButton = screen.getByLabelText("Close modal");
        await user.click(closeButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when overlay is clicked", async () => {
        const user = userEvent.setup();
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        const overlay = screen.getByRole("generic").firstChild;
        await user.click(overlay!);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onClose when modal content is clicked", async () => {
        const user = userEvent.setup();
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        const modalContent = screen.getByTestId("modal-children");
        await user.click(modalContent);

        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should call onClose when Escape key is pressed", async () => {
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        fireEvent.keyDown(document, { key: "Escape" });

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onClose when other keys are pressed", async () => {
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        fireEvent.keyDown(document, { key: "Enter" });
        fireEvent.keyDown(document, { key: "Space" });

        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should render export button", () => {
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        expect(screen.getByText("Export")).toBeInTheDocument();
    });

    it("should handle export functionality", async () => {
        const user = userEvent.setup();
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        const exportButton = screen.getByText("Export");
        await user.click(exportButton);

        await waitFor(() => {
            expect(mockCreateElement).toHaveBeenCalledWith("a");
            expect(mockLink.setAttribute).toHaveBeenCalledWith("href", "mock-url");
            expect(mockLink.setAttribute).toHaveBeenCalledWith("download", "transactions.csv");
            expect(mockLink.click).toHaveBeenCalled();
        });
    });

    it("should show alert when no transactions to export", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getAll } = require("../../../data/transactions");
        getAll.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    page: 1,
                    limit: 20,
                    totalPages: 0,
                    totalTransactions: 0,
                    transactions: [],
                }),
        });

        const user = userEvent.setup();
        const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        const exportButton = screen.getByText("Export");
        await user.click(exportButton);

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith("No transactions to export.");
        });

        alertSpy.mockRestore();
    });

    it("should apply correct styling", () => {
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        const overlay = screen.getByRole("generic").firstChild;
        expect(overlay).toHaveClass("fixed", "inset-0", "z-50", "flex", "w-screen", "items-center", "justify-center", "bg-black/75", "p-4");

        const modalContent = screen.getByTestId("modal-children").closest("div");
        expect(modalContent).toHaveClass(
            "flex",
            "max-h-[90vh]",
            "w-[fit-content]",
            "flex-col",
            "overflow-hidden",
            "rounded-lg",
            "bg-white",
            "shadow-xl",
        );
    });

    it("should render children content", () => {
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {mockChildren}
            </Modal>,
        );

        expect(screen.getByTestId("modal-children")).toBeInTheDocument();
        expect(screen.getByText("Modal Content")).toBeInTheDocument();
    });

    it("should handle multiple children", () => {
        const multipleChildren = (
            <>
                <div data-testid="child-1">Child 1</div>
                <div data-testid="child-2">Child 2</div>
            </>
        );

        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
            >
                {multipleChildren}
            </Modal>,
        );

        expect(screen.getByTestId("child-1")).toBeInTheDocument();
        expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });
});
