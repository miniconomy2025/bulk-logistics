export interface ItemRequest {
    itemName: string;
    quantity: number;
    measurementType?: "KG" | "UNIT";
}

export interface PickupRequestDetails {
    pickupRequestId: number;
    requestingCompanyName: string;
    originCompanyName: string;
    destinationCompanyName: string;
    originalExternalOrderId: string;
    cost: number;
    requestDate: string;
    completionDate: string | null;
    paymentStatus: string | null;
    items: ItemRequest[];
}
