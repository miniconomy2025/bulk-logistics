/**
 * Interface representing a single item within a shipment.
 */
interface Item {
    itemId: number;
    name: string;
    quantity: number;
    capacityType: string;
}

/**
 * Interface representing a company, either origin or destination.
 */
interface Company {
    companyId: number;
    companyName: string;
}

/**
 * Interface representing an individual item within a shipment,
 * detailing its origin, destination, and contents.
 */
interface ShipmentItem {
    pickUpRequestId: number;
    originCompany: Company;
    destinationCompany: Company;
    cost: number;
    requestDate: string;
    completionDate: string;
    items: Item[];
}

/**
 * Interface representing the status of a shipment.
 */
interface Status {
    statusId: number;
    statusName: string;
}

/**
 * The main interface representing the entire shipment object.
 */
export interface Shipment {
    shipmentId: number;
    dispatch_date: string;
    vehicle: string;
    status: Status;
    shipmentItems: ShipmentItem[];
}
