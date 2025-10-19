import Transactions from "../../data/transactions";
import API from "../../data/api";

jest.mock("../../data/api");

describe("Transactions", () => {
    const mockAPI = API as jest.Mocked<typeof API>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getAll", () => {
        it("should call API.get with correct endpoint and default parameters", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Transactions.getAll();

            expect(mockAPI.get).toHaveBeenCalledWith("transactions/?page=1&limit=20");
        });

        it("should call API.get with custom parameters", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Transactions.getAll({ page: 2, limit: 50 });

            expect(mockAPI.get).toHaveBeenCalledWith("transactions/?page=2&limit=50");
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ data: "test" }) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await Transactions.getAll();

            expect(result).toBe(mockResponse);
        });

        it("should handle API errors", async () => {
            const error = new Error("API Error");
            mockAPI.get.mockRejectedValue(error);

            await expect(Transactions.getAll()).rejects.toThrow("API Error");
        });
    });

    describe("breakdown", () => {
        it("should call API.get with correct endpoint", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Transactions.breakdown();

            expect(mockAPI.get).toHaveBeenCalledWith("transactions/breakdown");
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ breakdown: "data" }) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await Transactions.breakdown();

            expect(result).toBe(mockResponse);
        });
    });

    describe("create", () => {
        it("should call API.post with correct endpoint and data", async () => {
            mockAPI.post.mockResolvedValue({} as any);

            const transactionData = {
                commercial_bank_transaction_id: "123",
                payment_reference_id: "ref-123",
                transaction_category_id: "cat-1",
                amount: 1000,
                transaction_date: new Date("2024-01-01"),
                transaction_status_id: "status-1",
                related_pickup_request_id: "pickup-1",
                loan_id: "loan-1",
                related_thoh_order_id: "thoh-1",
            };

            await Transactions.create(transactionData);

            expect(mockAPI.post).toHaveBeenCalledWith("transactions/transactions", { payload: transactionData });
        });

        it("should handle optional fields", async () => {
            mockAPI.post.mockResolvedValue({} as any);

            const transactionData = {
                commercial_bank_transaction_id: "123",
                payment_reference_id: "ref-123",
                transaction_category_id: "cat-1",
                amount: 1000,
                transaction_date: new Date("2024-01-01"),
                transaction_status_id: "status-1",
            };

            await Transactions.create(transactionData);

            expect(mockAPI.post).toHaveBeenCalledWith("transactions/transactions", { payload: transactionData });
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 201, json: () => Promise.resolve({ id: "new-transaction" }) };
            mockAPI.post.mockResolvedValue(mockResponse as any);

            const transactionData = {
                commercial_bank_transaction_id: "123",
                payment_reference_id: "ref-123",
                transaction_category_id: "cat-1",
                amount: 1000,
                transaction_date: new Date("2024-01-01"),
                transaction_status_id: "status-1",
            };

            const result = await Transactions.create(transactionData);

            expect(result).toBe(mockResponse);
        });
    });

    describe("totals", () => {
        it("should call API.get with correct endpoint", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Transactions.totals();

            expect(mockAPI.get).toHaveBeenCalledWith("transactions/totals");
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ totals: "data" }) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await Transactions.totals();

            expect(result).toBe(mockResponse);
        });
    });

    describe("monthly", () => {
        it("should call API.get with correct endpoint", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Transactions.monthly();

            expect(mockAPI.get).toHaveBeenCalledWith("transactions/monthly");
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ monthly: "data" }) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await Transactions.monthly();

            expect(result).toBe(mockResponse);
        });
    });

    describe("dashboard", () => {
        it("should call API.get with correct endpoint", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Transactions.dashboard();

            expect(mockAPI.get).toHaveBeenCalledWith("transactions/dashboard");
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ dashboard: "data" }) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await Transactions.dashboard();

            expect(result).toBe(mockResponse);
        });
    });

    describe("topSources", () => {
        it("should call API.get with correct endpoint", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Transactions.topSources();

            expect(mockAPI.get).toHaveBeenCalledWith("transactions/top-sources");
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ sources: "data" }) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await Transactions.topSources();

            expect(result).toBe(mockResponse);
        });
    });

    describe("get", () => {
        it("should call API.get with correct endpoint and transaction ID", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Transactions.get({ transactionId: "123" });

            expect(mockAPI.get).toHaveBeenCalledWith("transactions/123");
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ transaction: "data" }) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await Transactions.get({ transactionId: "123" });

            expect(result).toBe(mockResponse);
        });

        it("should handle different transaction IDs", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Transactions.get({ transactionId: "abc-123" });

            expect(mockAPI.get).toHaveBeenCalledWith("transactions/abc-123");
        });
    });

    describe("error handling", () => {
        it("should propagate API errors from getAll", async () => {
            const error = new Error("Network error");
            mockAPI.get.mockRejectedValue(error);

            await expect(Transactions.getAll()).rejects.toThrow("Network error");
        });

        it("should propagate API errors from create", async () => {
            const error = new Error("Validation error");
            mockAPI.post.mockRejectedValue(error);

            const transactionData = {
                commercial_bank_transaction_id: "123",
                payment_reference_id: "ref-123",
                transaction_category_id: "cat-1",
                amount: 1000,
                transaction_date: new Date("2024-01-01"),
                transaction_status_id: "status-1",
            };

            await expect(Transactions.create(transactionData)).rejects.toThrow("Validation error");
        });

        it("should handle API timeout errors", async () => {
            const timeoutError = new Error("Request timeout");
            mockAPI.get.mockRejectedValue(timeoutError);

            await expect(Transactions.totals()).rejects.toThrow("Request timeout");
        });
    });
});
