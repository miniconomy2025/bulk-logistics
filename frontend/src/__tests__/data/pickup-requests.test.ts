import PickupRequest from "../../data/pickup-requests";
import API from "../../data/api";

jest.mock("../../data/api");

describe("PickupRequest", () => {
    const mockAPI = API as jest.Mocked<typeof API>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getInstance", () => {
        it("should return the same instance on multiple calls (singleton pattern)", () => {
            const instance1 = PickupRequest.getInstance();
            const instance2 = PickupRequest.getInstance();

            expect(instance1).toBe(instance2);
            expect(instance1).toBeInstanceOf(PickupRequest);
        });

        it("should create new instance on first call", () => {
            const instance = PickupRequest.getInstance();

            expect(instance).toBeInstanceOf(PickupRequest);
        });

        it("should return existing instance on subsequent calls", () => {
            const instance1 = PickupRequest.getInstance();
            const instance2 = PickupRequest.getInstance();
            const instance3 = PickupRequest.getInstance();

            expect(instance1).toBe(instance2);
            expect(instance2).toBe(instance3);
        });
    });

    describe("allPickupRequests", () => {
        it("should call API.get with correct endpoint", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await PickupRequest.allPickupRequests();

            expect(mockAPI.get).toHaveBeenCalledWith("pickup-request");
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ requests: [] }) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await PickupRequest.allPickupRequests();

            expect(result).toBe(mockResponse);
        });

        it("should handle API errors", async () => {
            const error = new Error("API Error");
            mockAPI.get.mockRejectedValue(error);

            await expect(PickupRequest.allPickupRequests()).rejects.toThrow("API Error");
        });

        it("should handle network errors", async () => {
            const networkError = new Error("Network error");
            mockAPI.get.mockRejectedValue(networkError);

            await expect(PickupRequest.allPickupRequests()).rejects.toThrow("Network error");
        });

        it("should handle timeout errors", async () => {
            const timeoutError = new Error("Request timeout");
            mockAPI.get.mockRejectedValue(timeoutError);

            await expect(PickupRequest.allPickupRequests()).rejects.toThrow("Request timeout");
        });

        it("should handle successful response with data", async () => {
            const mockData = [
                { id: 1, company: "Company A", status: "pending" },
                { id: 2, company: "Company B", status: "completed" },
            ];
            const mockResponse = { status: 200, json: () => Promise.resolve(mockData) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await PickupRequest.allPickupRequests();

            expect(result).toBe(mockResponse);
        });

        it("should handle empty response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve([]) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await PickupRequest.allPickupRequests();

            expect(result).toBe(mockResponse);
        });
    });

    describe("singleton behavior", () => {
        it("should maintain singleton pattern across multiple method calls", () => {
            const instance1 = PickupRequest.getInstance();
            const instance2 = PickupRequest.getInstance();

            expect(instance1).toBe(instance2);
        });

        it("should work correctly with async operations", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            const instance1 = PickupRequest.getInstance();
            await PickupRequest.allPickupRequests();
            const instance2 = PickupRequest.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe("error propagation", () => {
        it("should propagate API errors correctly", async () => {
            const apiError = new Error("API responded with status 500");
            mockAPI.get.mockRejectedValue(apiError);

            await expect(PickupRequest.allPickupRequests()).rejects.toThrow("API responded with status 500");
        });

        it("should handle different types of errors", async () => {
            const errors = [new Error("Network error"), new Error("Timeout error"), new Error("Authentication error"), new Error("Server error")];

            for (const error of errors) {
                mockAPI.get.mockRejectedValueOnce(error);
                await expect(PickupRequest.allPickupRequests()).rejects.toThrow(error.message);
            }
        });
    });

    describe("response handling", () => {
        it("should handle different response status codes", async () => {
            const statusCodes = [200, 201, 204, 400, 401, 403, 404, 500];

            for (const status of statusCodes) {
                const mockResponse = { status, json: () => Promise.resolve({}) };
                mockAPI.get.mockResolvedValueOnce(mockResponse as any);

                const result = await PickupRequest.allPickupRequests();
                expect(result.status).toBe(status);
            }
        });
    });
});
