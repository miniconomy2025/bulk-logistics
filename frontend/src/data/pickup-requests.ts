import API from "./api";

export default class PickupRequest {
    private static instance: PickupRequest;
    private static baseEndpoint = "pickup-request";

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    public static getInstance(): PickupRequest {
        if (!PickupRequest.instance) {
            PickupRequest.instance = new PickupRequest();
        }
        return PickupRequest.instance;
    }

    public static async allPickupRequests() {
        return await API.get(PickupRequest.baseEndpoint);
    }
}
