import database from "../config/database";
import { PickupRequestEntity, PickupRequestCreationResult, PickupRequestGetEntity } from "../types/PickupRequest";
import { v4 as uuidv4 } from 'uuid'; // Import the UUID generator

export const savePickupRequest = async (pickupRequest: PickupRequestEntity): Promise<PickupRequestCreationResult> => {
    const paymentReferenceId = uuidv4();

    const query = "SELECT * FROM create_pickup_request($1, $2, $3, $4, $5, $6, $7::jsonb, $8)";
    
    const params = [
        pickupRequest.requestingCompany,      
        pickupRequest.originCompany,          
        pickupRequest.destinationCompany,    
        pickupRequest.originalExternalOrderId, 
        pickupRequest.cost,                   
        pickupRequest.requestDate,            
        JSON.stringify(pickupRequest.items),  
        paymentReferenceId                    
    ];

    const result = await database.query<PickupRequestCreationResult>(query, params);

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

export const findPickupRequestsByCompanyName = async (companyName: string): Promise<PickupRequestGetEntity[] | null> => {
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
            dc.company_name = $1;
    `;

    const result = await database.query<PickupRequestGetEntity>(query, [companyName]);

    return result.rows;
};

export const findPaidAndUnshippedRequests = async () => {
    const query = `SELECT
        pr.pickup_request_id as "pickupRequestId",
        rc.company_name as "requestingCompanyName",
        oc.company_name as "originCompanyName",
        dc.company_name as "destinationCompanyName",
        pr.original_external_order_id as "originalExternalOrderId",
        pr.cost,
        pr.request_date as "requestDate",
        pr.completion_date as "completionDate",
        ts.status as "paymentStatus",
        btl.transaction_date as "paymentDate",
        (
            SELECT COALESCE(json_agg(json_build_object(
                'pickup_request_id', pri.pickup_request_id,
                'pickup_request_item_id', pri.pickup_request_item_id,
                'itemName', idf.item_name,
                'quantity', pri.quantity,
                'capacity_type_id', idf.capacity_type_id,
                'shipment_id', pri.shipment_id,
                'destinationCompanyUrl', dc.company_url,
                'originCompanyUrl', oc.company_url,
                'originalExternalOrderId', pr.original_external_order_id
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
    JOIN bank_transactions_ledger btl ON pr.pickup_request_id = btl.related_pickup_request_id
    JOIN transaction_status ts ON btl.transaction_status_id = ts.transaction_status_id
    WHERE
        pr.completion_date IS NULL
        AND ts.status = 'COMPLETED'
    ORDER BY
        btl.transaction_date ASC, 
        pr.request_date ASC;`;

    const result = await database.query(query);

    return result.rows;
};

export const updateCompletionDate = async (pickup_request_id: number, date: Date) => {
    const query = `UPDATE pickup_requests SET completion_date = $1 WHERE pickup_request_id = $2`;

    const result = await database.query(query, [date, pickup_request_id]);
};

export const updatePickupRequestStatuses = async (completionDate: Date): Promise<number> => {
    const query = `
        UPDATE pickup_requests
        SET completion_date = $1
        WHERE 
            completion_date IS NULL
            AND pickup_request_id IN (
                SELECT pickup_request_id
                FROM pickup_request_item
                GROUP BY pickup_request_id
                HAVING COUNT(*) FILTER (WHERE shipment_id IS NULL) = 0
            );
    `;

    const result = await database.query(query, [completionDate]);

    // Return the number of rows that were updated.
    return result.rowCount ?? 0;
};
