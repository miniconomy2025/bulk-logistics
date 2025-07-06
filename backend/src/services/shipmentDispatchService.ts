import { ShipmentStatus } from "../enums";
import { shipmentModel } from "../models/shipment";

export default async function dispatchShipment(shipmentId: number, date: string) {
    const shipment = await shipmentModel.findShipmentById(shipmentId);

    if (!shipment) {
        return { success: false, message: "Shipment not found." };
    }

    if (shipment.status.statusName !== ShipmentStatus.Pending) {
        return { success: false, message: "Shipment already dispatched" };
    }

    try {
        const updatedShipment = await shipmentModel.updateShipmentStatus(shipmentId, 2, date); // use enums for statusId
        return { success: true, message: "Shipment dispatched", data: updatedShipment };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
}
