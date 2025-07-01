export interface ShipmentStatus {
    shipment_status_id: number;
    name: string;
}

export interface Shipment {
    shipment_id: number;
    dispatch_date: string;
    vehicle_id: number;
    shipment_status_id: number;
}

export interface ShipmentItemDetail {
    shipment_item_detail_id: number;
    shipment_id: number;
    pickup_request_item_id: number;
    quantity_transported: number;
}
