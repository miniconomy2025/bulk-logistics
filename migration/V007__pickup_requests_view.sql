CREATE VIEW pickup_requests_view
AS
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
            'quantity', pri.quantity,
            'itemUnit', ct.name
        )), '[]'::json)
        FROM pickup_request_item pri
            JOIN item_definitions idf ON pri.item_definition_id = idf.item_definition_id
            JOIN capacity_type ct ON idf.capacity_type_id = ct.capacity_type_id
        WHERE pri.pickup_request_id = pr.pickup_request_id
    ) as items
    FROM
        pickup_requests pr
        JOIN company rc ON pr.requesting_company_id = rc.company_id
        JOIN company oc ON pr.origin_company_id = oc.company_id
        JOIN company dc ON pr.destination_company_id = dc.company_id
        LEFT JOIN bank_transactions_ledger btl ON pr.pickup_request_id = btl.related_pickup_request_id
        LEFT JOIN transaction_status ts ON btl.transaction_status_id = ts.transaction_status_id;
