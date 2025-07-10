import API from "./api";

export default class Shipments {
    private static baseEndpoint = "shipments/";

    public static async activeShipments() {
        return await API.get(Shipments.baseEndpoint + "active");
    }
}
