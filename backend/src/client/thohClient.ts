import type { MachinesInformationResponse, TimeResponse, TruckInfoResponse, TruckPurchaseRequest, TruckPurchaseResponse } from "../types/thoh";
import AppError from "../utils/errorHandlingMiddleware/appError";
import { BaseApiClient } from "./baseClient";

class THOHApiClient extends BaseApiClient {
    constructor() {
        super("https://thoh-api.projects.bbdgrad.com", "THOH");
    }

    /**
     * Makes a POST request to THOH to purchase a truck.
     * @param truckInfo The details of the truck to purchase
     * @returns The response containing truck purchase details
     */

    public async purchaseTruck(truckInfo: TruckPurchaseRequest): Promise<TruckPurchaseResponse> {
        console.log("------PURCHASING TRUCKS-------\nTRUCK REQUEST: ", truckInfo);
        const response = await this.client.post("/trucks", truckInfo);
        console.log("------PURCHASING COMPLETE-------\nTRUCK RESPONSE: ", response.data);
        return response.data;
    }

    public async getTime(): Promise<TimeResponse> {
        try {
            const response = await this.client.get("/time");
            return response.data;
        } catch {
            return {
                error: "No current time",
            };
        }
    }

    /**
     * Fetches information about all trucks available in THOH.
     * @returns An array of truck information
     */
    public async getTrucksInformation(): Promise<TruckInfoResponse[]> {
        try {
            const response = await this.client.get("/trucks");
            return response.data;
        } catch (error: any) {
            throw new AppError(error.error, 500);
        }
    }

    public async getMachinesInformation(): Promise<MachinesInformationResponse> {
        try {
            const response = await this.client.get("/machines");
            return response.data;
        } catch (error: any) {
            throw new AppError(error.error, 500);
        }
    }
}

export const thohApiClient = new THOHApiClient();
