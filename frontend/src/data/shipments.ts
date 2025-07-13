import API from "./api";

export default class Shipments {
    private static baseEndpoint = "shipments";

    public static async activeShipments() {
        return await API.get(Shipments.baseEndpoint + "/active");
    }

    public static async allShipments(statusId?: number | null, dispatchDate?: string) {
        const filter = new URLSearchParams();

        if (statusId !== undefined) {
            filter.append("statusId", statusId ? statusId.toString() : "");
        }
        if (dispatchDate) {
            filter.append("dispatchDate", dispatchDate ? dispatchDate : "");
        }
        const endpoint = `${Shipments.baseEndpoint}${filter.toString().length > 0 ? "?" : ""}${filter.toString()}`;

        return await API.get(endpoint);
    }
}
