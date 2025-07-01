export interface PickupRequestRequest {
  originalExternalOrderId: string;
  requestingCompanyId: string;
  originCompanyId: string;
  destinationCompanyId: string;
  items: [ItemRequest];
  requestSimulationDate: Date;
}

export interface ItemRequest {
  itemName: number;
  quantity: number;
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
