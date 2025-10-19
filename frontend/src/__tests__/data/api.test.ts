import API from "../../data/api";
import { APIError } from "../../exceptions/api_error";

global.fetch = jest.fn();

describe("API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (API as any).apiRoot = undefined;
    });

    describe("pingAPI", () => {
        it("should set apiRoot when health check succeeds", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                status: 200,
            });

            await API.get("test-endpoint");

            expect((API as any).apiRoot).toBe("https://bulk-logistics.projects.bbdgrad.com");
        });

        it("should throw APIError when health check fails", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                status: 500,
            });

            await expect(API.get("test-endpoint")).rejects.toThrow(APIError);
        });

        it("should throw APIError when network is unreachable", async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

            await expect(API.get("test-endpoint")).rejects.toThrow(APIError);
        });
    });

    describe("normaliseEndpoint", () => {
        beforeEach(() => {
            (global.fetch as jest.Mock).mockResolvedValue({ status: 200 });
        });

        it("should remove leading slash from endpoint", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) });

            await API.get("/test-endpoint");

            expect(global.fetch).toHaveBeenCalledWith("https://bulk-logistics.projects.bbdgrad.com/api/test-endpoint", expect.any(Object));
        });

        it("should add api/ prefix when not present", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) });

            await API.get("test-endpoint");

            expect(global.fetch).toHaveBeenCalledWith("https://bulk-logistics.projects.bbdgrad.com/api/test-endpoint", expect.any(Object));
        });

        it("should not add api/ prefix when already present", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) });

            await API.get("api/test-endpoint");

            expect(global.fetch).toHaveBeenCalledWith("https://bulk-logistics.projects.bbdgrad.com/api/test-endpoint", expect.any(Object));
        });
    });

    describe("get", () => {
        beforeEach(() => {
            (global.fetch as jest.Mock).mockResolvedValue({ status: 200 });
        });

        it("should make GET request with correct headers", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) });

            await API.get("test-endpoint");

            expect(global.fetch).toHaveBeenCalledWith("https://bulk-logistics.projects.bbdgrad.com/api/test-endpoint", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
        });

        it("should throw APIError when response is not ok", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 404 });

            await expect(API.get("test-endpoint")).rejects.toThrow(APIError);
        });

        it("should return response when successful", async () => {
            const mockResponse = { status: 200, json: () => Promise.resolve({ data: "test" }) };
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

            const result = await API.get("test-endpoint");

            expect(result).toBe(mockResponse);
        });
    });

    describe("post", () => {
        beforeEach(() => {
            (global.fetch as jest.Mock).mockResolvedValue({ status: 200 });
        });

        it("should make POST request with correct data", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) });

            const testData = { payload: { test: "data" } };
            await API.post("test-endpoint", testData);

            expect(global.fetch).toHaveBeenCalledWith("https://bulk-logistics.projects.bbdgrad.com/api/test-endpoint", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(testData.payload),
            });
        });

        it("should include custom headers when provided", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) });

            const testData = {
                payload: { test: "data" },
                headers: { Authorization: "Bearer token" },
            };
            await API.post("test-endpoint", testData);

            expect(global.fetch).toHaveBeenCalledWith("https://bulk-logistics.projects.bbdgrad.com/api/test-endpoint", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token",
                },
                body: JSON.stringify(testData.payload),
            });
        });

        it("should throw APIError when response is not ok", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 400 });

            await expect(API.post("test-endpoint", { payload: {} })).rejects.toThrow(APIError);
        });
    });

    describe("put", () => {
        beforeEach(() => {
            (global.fetch as jest.Mock).mockResolvedValue({ status: 200 });
        });

        it("should make PUT request with correct data", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) });

            const testData = { payload: { test: "data" } };
            await API.put("test-endpoint", testData);

            expect(global.fetch).toHaveBeenCalledWith("https://bulk-logistics.projects.bbdgrad.com/api/test-endpoint", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(testData.payload),
            });
        });

        it("should throw APIError when response is not ok", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 500 });

            await expect(API.put("test-endpoint", { payload: {} })).rejects.toThrow(APIError);
        });
    });

    describe("delete", () => {
        beforeEach(() => {
            (global.fetch as jest.Mock).mockResolvedValue({ status: 200 });
        });

        it("should make DELETE request (note: this appears to be a bug in the implementation)", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) });

            await API.delete("test-endpoint");

            expect(global.fetch).toHaveBeenCalledWith("https://bulk-logistics.projects.bbdgrad.com/api/test-endpoint", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            });
        });

        it("should throw APIError when response is not ok", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 404 });

            await expect(API.delete("test-endpoint")).rejects.toThrow(APIError);
        });
    });

    describe("error handling", () => {
        it("should handle network errors gracefully", async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

            await expect(API.get("test-endpoint")).rejects.toThrow(APIError);
        });

        it("should handle JSON parsing errors", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                status: 200,
                json: () => Promise.reject(new Error("Invalid JSON")),
            });

            await expect(API.get("test-endpoint")).rejects.toThrow();
        });
    });
});
