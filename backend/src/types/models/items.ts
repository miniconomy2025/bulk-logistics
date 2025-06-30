export interface CapacityType {
  capacity_type_id: number;
  name: string;
}

export interface ItemDefinition {
  item_definition_id: number;
  item_name: string;
  capacity_type_id: number;
}
