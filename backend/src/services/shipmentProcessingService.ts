import { shipmentModel } from "../models/shipmentRepository";

export class ShipmentProcessingService {
    public processShipmentUpdate = async ({ itemsIDs, newStatusId }: { itemsIDs: number[]; newStatusId: number }) => {
        try {
            // Step 1: Get the shipment IDs
            console.log("Shipment Items to be updated ", itemsIDs);
            console.log("new shipment status ID  ", newStatusId);
            const shipmentIdsToUpdate = await shipmentModel.findShipmentIdsByItemIds(itemsIDs);

            if (shipmentIdsToUpdate.ok) {
                console.log("Found shipment IDs to update:", shipmentIdsToUpdate.value);

                // Step 2: Update their statuses
                const updatedCount = await shipmentModel.updateShipmentStatusesByIds({ shipmentIds: shipmentIdsToUpdate.value, newStatusId });

                console.log(`Process complete. ${updatedCount ?? 0} shipments moved to status ${newStatusId}.`);
            } else {
                console.log("No shipments found for the given items. Nothing to update.");
            }
        } catch (err) {
            console.error("An error occurred during the shipment update process", err);
        }
    };
}

export default new ShipmentProcessingService();