export interface PickupRequestRequest {
    originalExternalOrderId: string;
    originCompanyId: string;
    destinationCompanyId: string;
    items: [ItemRequest];
    requestSimulationDate?: Date;
}

export interface ItemRequest {
    itemName: number;
    quantity: number;
    measurementType: string;
}

export interface PickupRequestEntity {
    requestingCompanyId: string;
    originCompanyId: string;
    destinationCompanyId: string;
    originalExternalOrderId: string;
    cost: number;
    requestDate: Date;
    completionDate?: Date;
    items: [ItemRequest];
}
