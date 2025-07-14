import db from "../config/database";
import { ItemDefinitionWithName } from "../types";

export const findUnshippedItems = async () => {
    const sql = `
        SELECT 
            p.pickup_request_id, 
            p.original_external_order_id, 
            p.request_date, 
            p.completion_date, 
            pri.pickup_request_item_id, 
            pri.item_definition_id, 
            pri.quantity,
            id.item_name,
            id.capacity_type_id,
            btl.related_pickup_request_id,
            ts.status
        FROM pickup_requests p
        INNER JOIN bank_transactions_ledger btl
            ON p.pickup_request_id = btl.related_pickup_request_id
        INNER JOIN transaction_status ts
            ON btl.transaction_status_id = ts.transaction_status_id
        INNER JOIN pickup_request_item pri
            ON p.pickup_request_id = pri.pickup_request_id
        INNER JOIN item_definitions "id"
            ON pri.item_definition_id = id.item_definition_id
        WHERE p.completion_date IS NULL AND ts.status = 'COMPLETED'
    `;

    const unshippedItems = await db.query(sql);

    return unshippedItems.rows;
};

export const getItemDefinitions = async (): Promise<ItemDefinitionWithName[]> => {
    const sql = `SELECT
        item_definitions.item_definition_id,
        item_definitions.item_name,
        capacity_type.name as "capacity_type_name",
        item_definitions.weight_per_unit
        FROM
        item_definitions
        JOIN
        capacity_type ON item_definitions.capacity_type_id = capacity_type.capacity_type_id`;
    const itemDefinitions = await db.query(sql);
    return itemDefinitions.rows;
};
