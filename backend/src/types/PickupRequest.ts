export interface PickupRequestRequest {
    originalExternalOrderId: string; //
    originCompanyId: string; //
    destinationCompanyId: string; //
    items: [ItemRequest]; //
}

export interface ItemRequest {
    itemName: number;
    quantity: number;
    measurementType: "KG" | "UNIT";
}

export interface PickupRequestEntity {
    requestingCompanyId: string;
    originCompanyId: string;
    destinationCompanyId: string;
    originalExternalOrderId: string;
    cost: number;
    requestDate: Date;
    completionDate?: Date;
    items: ItemRequest[];
}

export interface PickupRequestCreationResult {
    pickupRequestId: number;
    paymentReferenceId: string; // UUIDs are typically strings in JS
    cost: number;
    bulkLogisticsBankAccountNumber: string;
}

export interface PickupRequestCreateResponse {
    pickupRequestId: number;
    cost: number;
    paymentReferenceId: string;
    bulkLogisticsBankAccountNumber: string | number;
    status: string;
    statusCheckUrl: string;
}

export interface PickupRequestGetEntity {
    pickupRequestId: number;
    requestingCompanyName: number;
    originCompanyName: number;
    destinationCompanyName: number;
    originalExternalOrderId: number;
    cost: number;
    requestDate: Date;
    completionDate: Date;
    status?: string;
    paymentStatus: string;
    items: ItemRequest[];
}
