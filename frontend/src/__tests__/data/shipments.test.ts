import Shipments from "../../data/shipments";
import API from "../../data/api";

jest.mock("../../data/api");

describe("Shipments", () => {
    const mockAPI = API as jest.Mocked<typeof API>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("activeShipments", () => {
        it("should call API.get with correct endpoint", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.activeShipments();

            expect(mockAPI.get).toHaveBeenCalledWith("shipments/active");
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ active: "5" }) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await Shipments.activeShipments();

            expect(result).toBe(mockResponse);
        });

        it("should handle API errors", async () => {
            const error = new Error("API Error");
            mockAPI.get.mockRejectedValue(error);

            await expect(Shipments.activeShipments()).rejects.toThrow("API Error");
        });
    });

    describe("allShipments", () => {
        it("should call API.get with no filters when no parameters provided", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments();

            expect(mockAPI.get).toHaveBeenCalledWith("shipments");
        });

        it("should call API.get with statusId filter when provided", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments(1);

            expect(mockAPI.get).toHaveBeenCalledWith("shipments?statusId=1");
        });

        it("should call API.get with dispatchDate filter when provided", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments(undefined, "2024-01-15");

            expect(mockAPI.get).toHaveBeenCalledWith("shipments?dispatchDate=2024-01-15");
        });

        it("should call API.get with both filters when both provided", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments(2, "2024-01-15");

            expect(mockAPI.get).toHaveBeenCalledWith("shipments?statusId=2&dispatchDate=2024-01-15");
        });

        it("should handle null statusId", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments(null);

            expect(mockAPI.get).toHaveBeenCalledWith("shipments?statusId=");
        });

        it("should handle empty dispatchDate", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments(undefined, "");

            expect(mockAPI.get).toHaveBeenCalledWith("shipments");
        });

        it("should return the API response", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ shipments: [] }) };
            mockAPI.get.mockResolvedValue(mockResponse as any);

            const result = await Shipments.allShipments();

            expect(result).toBe(mockResponse);
        });

        it("should handle different statusId values", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments(5);

            expect(mockAPI.get).toHaveBeenCalledWith("shipments?statusId=5");
        });

        it("should handle different dispatchDate formats", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments(undefined, "2024-12-31");

            expect(mockAPI.get).toHaveBeenCalledWith("shipments?dispatchDate=2024-12-31");
        });

        it("should handle API errors", async () => {
            const error = new Error("Network error");
            mockAPI.get.mockRejectedValue(error);

            await expect(Shipments.allShipments()).rejects.toThrow("Network error");
        });

        it("should handle timeout errors", async () => {
            const timeoutError = new Error("Request timeout");
            mockAPI.get.mockRejectedValue(timeoutError);

            await expect(Shipments.allShipments(1, "2024-01-15")).rejects.toThrow("Request timeout");
        });
    });

    describe("URLSearchParams behavior", () => {
        it("should handle multiple parameters correctly", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments(3, "2024-06-15");

            expect(mockAPI.get).toHaveBeenCalledWith("shipments?statusId=3&dispatchDate=2024-06-15");
        });

        it("should handle undefined parameters correctly", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments(undefined, undefined);

            expect(mockAPI.get).toHaveBeenCalledWith("shipments");
        });

        it("should handle zero statusId", async () => {
            mockAPI.get.mockResolvedValue({} as any);

            await Shipments.allShipments(0);

            expect(mockAPI.get).toHaveBeenCalledWith("shipments?statusId=");
        });
    });
});
