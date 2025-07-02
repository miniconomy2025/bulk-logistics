import database from "../config/database";
import { PickupRequestEntity, PickupRequestCreationResult, PickupRequestGetEntity } from "../models/PickupRequest";

export const savePickupRequest = async (pickupRequest: PickupRequestEntity): Promise<PickupRequestCreationResult> => {
    const result = await database.query<PickupRequestCreationResult>(
        "SELECT * FROM create_pickup_request($1, $2, $3, $4, $5, $6, $7::jsonb)",
        [
            pickupRequest.requestingCompanyId,
            pickupRequest.originCompanyId,
            pickupRequest.destinationCompanyId,
            pickupRequest.originalExternalOrderId,
            pickupRequest.cost,
            pickupRequest.requestDate,
            JSON.stringify(pickupRequest.items),
        ]
    );

    // The result from a function call will be in result.rows[0]
    if (result.rows.length === 0) {
        throw new Error("Failed to create pickup request: No data returned from DB function.");
    }

    return result.rows[0];
};

export const findPickupRequestById = async (id: string): Promise<PickupRequestGetEntity | null> => {
    const query = `
        SELECT
            pr.pickup_request_id as "pickupRequestId",
            rc.company_name as "requestingCompanyName",
            oc.company_name as "originCompanyName",
            dc.company_name as "destinationCompanyName",
            pr.original_external_order_id as "originalExternalOrderId",
            pr.cost,
            pr.request_date as "requestDate",
            pr.completion_date as "completionDate",
            ts.status as "paymentStatus",
            (
                SELECT COALESCE(json_agg(json_build_object(
                    'itemName', idf.item_name,
                    'quantity', pri.quantity
                )), '[]'::json)
                FROM pickup_request_item pri
                JOIN item_definitions idf ON pri.item_definition_id = idf.item_definition_id
                WHERE pri.pickup_request_id = pr.pickup_request_id
            ) as items
        FROM
            pickup_requests pr
        JOIN company rc ON pr.requesting_company_id = rc.company_id
        JOIN company oc ON pr.origin_company_id = oc.company_id
        JOIN company dc ON pr.destination_company_id = dc.company_id
        LEFT JOIN bank_transactions_ledger btl ON pr.pickup_request_id = btl.related_pickup_request_id
        LEFT JOIN transaction_status ts ON btl.transaction_status_id = ts.transaction_status_id
        WHERE
            pr.pickup_request_id = $1;
    `;
    const result = await database.query<PickupRequestGetEntity>(query, [id]);

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
};

export const findPickupRequestsByCompanyId = async (companyId: string): Promise<PickupRequestGetEntity[] | null> => {
    const query = `
        SELECT
            pr.pickup_request_id as "pickupRequestId",
            rc.company_name as "requestingCompanyName",
            oc.company_name as "originCompanyName",
            dc.company_name as "destinationCompanyName",
            pr.original_external_order_id as "originalExternalOrderId",
            pr.cost,
            pr.request_date as "requestDate",
            pr.completion_date as "completionDate",
            ts.status as "paymentStatus",
            (
                SELECT COALESCE(json_agg(json_build_object(
                    'itemName', idf.item_name,
                    'quantity', pri.quantity
                )), '[]'::json)
                FROM pickup_request_item pri
                JOIN item_definitions idf ON pri.item_definition_id = idf.item_definition_id
                WHERE pri.pickup_request_id = pr.pickup_request_id
            ) as items
        FROM
            pickup_requests pr
        JOIN company rc ON pr.requesting_company_id = rc.company_id
        JOIN company oc ON pr.origin_company_id = oc.company_id
        JOIN company dc ON pr.destination_company_id = dc.company_id
        LEFT JOIN bank_transactions_ledger btl ON pr.pickup_request_id = btl.related_pickup_request_id
        LEFT JOIN transaction_status ts ON btl.transaction_status_id = ts.transaction_status_id
        WHERE
            pr.destination_company_id = $1;
    `

    const result = await database.query<PickupRequestGetEntity>(query, [companyId]);

    return result.rows;
}