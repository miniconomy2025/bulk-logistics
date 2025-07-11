import type { TruckInfoResponse, TruckPurchaseRequest, TruckPurchaseResponse } from "../types/thoh";
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
        const response = await this.client.post("/trucks", truckInfo);
        return response.data;
    }

    /**
     * Fetches information about all trucks available in THOH.
     * @returns An array of truck information
     */
    public async getTrucksInformation(): Promise<TruckInfoResponse[]> {
        const response = await this.client.get("/trucks");
        return response.data;
    }
}

export const thohApiClient = new THOHApiClient();
