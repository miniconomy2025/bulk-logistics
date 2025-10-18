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
        try {
            // Validate truck purchase request
            if (!truckInfo.truckName || truckInfo.truckName.trim() === '') {
                throw new Error("Truck name is required");
            }

            if (truckInfo.quantity <= 0) {
                throw new Error("Truck quantity must be greater than 0");
            }

            // Validate truck name is one of the allowed types
            const validTruckNames = ['large_truck', 'medium_truck', 'small_truck'];
            if (!validTruckNames.includes(truckInfo.truckName)) {
                console.warn(`Unknown truck name: ${truckInfo.truckName}. Valid types: ${validTruckNames.join(', ')}`);
            }

            console.log("------PURCHASING TRUCKS-------\nTRUCK REQUEST: ", truckInfo);
            const response = await this.client.post("/trucks", truckInfo);
            console.log("------PURCHASING COMPLETE-------\nTRUCK RESPONSE: ", response.data);
            return response.data;
        } catch (error: any) {
            // Fixed: Now wraps all errors in AppError for consistency
            throw new AppError(error, 500);
        }
    }

    public async getTime(): Promise<TimeResponse> {
        try {
            const response = await this.client.get("/time");
            return response.data;
        } catch (error: any) {
            // Fixed: Now throws AppError for consistency with other methods
            throw new AppError(error, 503);
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
            // Fixed: Use error.message instead of error.error
            throw new AppError(error.message || error, 500);
        }
    }

    public async getMachinesInformation(): Promise<MachinesInformationResponse> {
        try {
            const response = await this.client.get("/machines");
            return response.data;
        } catch (error: any) {
            // Fixed: Use error.message instead of error.error
            throw new AppError(error.message || error, 500);
        }
    }
}

export const thohApiClient = new THOHApiClient();
