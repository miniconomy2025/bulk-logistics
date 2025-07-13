import API from "./api";

export default class ShipmentStatus {
    private static baseEndpoint = "shipment-status";

    public static async allShipmentStatuses() {
        return await API.get(ShipmentStatus.baseEndpoint);
    }
}
