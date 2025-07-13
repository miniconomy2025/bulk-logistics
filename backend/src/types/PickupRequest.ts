export interface PickupRequestRequest {
    originalExternalOrderId: string;
    originCompany: string;
    destinationCompany: string;
    items: ItemRequest[];
}

export interface ItemRequest {
    itemName: string;
    quantity: number;
    measurementType?: "KG" | "UNIT";
}

export interface PickupRequestEntity {
    requestingCompany: string;
    originCompany: string;
    destinationCompany: string;
    originalExternalOrderId: string;
    cost: number;
    requestDate: Date;
    completionDate?: Date;
    items: ItemRequest[];
}

export interface PickupRequestCreationResult {
    pickupRequestId: number;
    paymentReferenceId: string;
    cost: number;
    bulkLogisticsBankAccountNumber: string;
}

export interface PickupRequestCreateResponse {
    pickupRequestId: number;
    cost: number;
    paymentReferenceId: string;
    accountNumber: string | number;
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
