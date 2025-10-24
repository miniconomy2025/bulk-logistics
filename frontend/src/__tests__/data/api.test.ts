import API from "../../data/api";
import { APIError } from "../../exceptions/api_error";

global.fetch = jest.fn();

describe("API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        API.apiRoot = undefined;
    });

    describe("get", () => {
        beforeEach(() => {
            (global.fetch as jest.Mock).mockResolvedValue({ status: 200 });
        });

        it("should throw APIError when response is not ok", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 404 });

            await expect(API.get("health")).rejects.toThrow(APIError);
        });
    });

    describe("post", () => {
        beforeEach(() => {
            (global.fetch as jest.Mock).mockResolvedValue({ status: 200 });
        });

        it("should throw APIError when response is not ok", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 400 });

            await expect(API.post("health", { payload: {} })).rejects.toThrow(APIError);
        });
    });

    describe("put", () => {
        beforeEach(() => {
            (global.fetch as jest.Mock).mockResolvedValue({ status: 200 });
        });

        it("should throw APIError when response is not ok", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 500 });

            await expect(API.put("health", { payload: {} })).rejects.toThrow(APIError);
        });
    });

    describe("delete", () => {
        beforeEach(() => {
            (global.fetch as jest.Mock).mockResolvedValue({ status: 200 });
        });

        it("should throw APIError when response is not ok", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });
            (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 404 });

            await expect(API.delete("health")).rejects.toThrow(APIError);
        });
    });
});
