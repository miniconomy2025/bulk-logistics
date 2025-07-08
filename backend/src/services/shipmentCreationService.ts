// TODO: Add functionality to create a shipment
/* Get all uncompleted and paid pick requests, order them by IDs or request dates
        -//* Get undelivered Items:
            - //! check in the completed shipments or picked-up shipments
        -//* grouped unshipped items by measurement type
        -//* //! check the availability of the required vehicle type (if measurement_type = Units, vehicle = small/medium truck, else large truck)
        -//* check if there are available vehicles (based on the type on the previous step)
            -//! If available
                create a list of shipments = []
                - //* For Units measurement type
                    - //! While the vehicle is not full and there are still items not belonging to a shipment
                        - //! IF current item can fit in the vehicle
                            - Add to vehicle
                            - remove item from the list, and
                            - move to the next item
                            -//* IF vehicle is full, move to the next one
                            
                        - //! ELSE 
                            - move to the next item
                        - //! IF item out of bound &&, reset the iterator to 0
                        .....More steps to follow
            - //! ELSE stop shipment creation
*/

import { MeasurmentType } from "../enums";
import { findUnshippedItems } from "../models/pickupRequestItem";
import { findAvailableVehicles } from "../models/vehicle";

async function createShipments() {
    //1. Get unshipped items
    const unshippedItems = await findUnshippedItems();

    //2. Group shipments by unit types
    const unitBasedItems = unshippedItems.filter((item) => item.capacity_type === MeasurmentType.Unit);
    const kgBasedItems = unshippedItems.filter((item) => item.capacity_type === MeasurmentType.Weight);

    //3. Get available vehicles
    const availableVehicles = await findAvailableVehicles("2025-07-06"); // Date from the simulation date

    //  medium trucks and small trucks if there are unit based items
    if (unitBasedItems.length) {
    }
    //4. Get available large trucks if there are kg-based items
}
