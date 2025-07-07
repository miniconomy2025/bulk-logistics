import { ShipmentStatus } from "../enums";
import { shipmentModel } from "../models/shipment";

export default async function deliverShipment(shipmentId: number) {
    try {
        const shipment = await shipmentModel.findShipmentById(shipmentId);

        if (!shipment) {
            return { success: false, message: "Shipment not found." };
        }

        if (shipment.status.statusName === ShipmentStatus.Delivered) {
            return { status: false, message: "Shipment already delivered" };
        } else if (shipment.status.statusName === ShipmentStatus.Pending) {
            return { success: false, message: "Shipment must be dispatched before delivery." };
        }

        const updatedShipment = await shipmentModel.updateShipmentStatus(shipmentId, 3); // use enums for statusId
        return { success: true, message: "Shipment delivered", data: updatedShipment };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
}
