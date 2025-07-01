export interface PickupRequest {
  pickup_request_id: number;
  requesting_company_id: number;
  origin_company_id: number;
  destination_company_id: number;
  original_external_order_id: string;
  cost: number;
  request_date: string;
  completion_date?: string | null;
}

export interface PickupRequestItem {
  pickup_request_item_id: number;
  item_definition_id: number;
  pickup_request_id: number;
  quantity: number;
}
