CREATE OR REPLACE FUNCTION get_shipment_details(
    p_shipment_id INT DEFAULT NULL,
    p_status_id INT DEFAULT NULL,
    p_dispatch_date DATE DEFAULT NULL
	)
RETURNS TABLE (
    "shipmentId" INT,
    dispatch_date DATE,
    vehicle VARCHAR(50),
    status JSON,
    "shipmentItems" JSON
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.shipment_id AS "shipmentId",
        s.dispatch_date,
        vt.name AS vehicle,
        json_build_object(
            'statusId', ss.shipment_status_id,
            'statusName', ss.name
        ) AS status,
        (
            SELECT json_agg(
                pickup_request_data
                ORDER BY pickup_request_data
            )
            FROM (
                SELECT
                    pr.pickup_request_id AS "pickUpRequestId",
                    json_build_object(
                        'companyId', oc.company_id,
                        'companyName', oc.company_name
                    ) AS "originCompany",
                    json_build_object(
                        'companyId', dc.company_id,
                        'companyName', dc.company_name
                    ) AS "destinationCompany",
                    pr.cost,
                    pr.request_date AS "requestDate",
                    pr.completion_date AS "completionDate",
                    (
                        SELECT json_agg(
                            json_build_object(
                                'itemId', id.item_definition_id,
                                'name', id.item_name,
                                'quantity', pri.quantity,
                                'capacityType', ct.name
                            )
                        )
                        FROM pickup_request_item pri
                        INNER JOIN item_definitions id ON pri.item_definition_id = id.item_definition_id
                        INNER JOIN capacity_type ct ON id.capacity_type_id = ct.capacity_type_id
                        WHERE pri.pickup_request_id = pr.pickup_request_id
                    ) AS items
                FROM
                    pickup_requests pr
                INNER JOIN
                    pickup_request_item pri ON pr.pickup_request_id = pri.pickup_request_id
                INNER JOIN
                    company oc ON pr.origin_company_id = oc.company_id
                INNER JOIN
                    company dc ON pr.destination_company_id = dc.company_id
                WHERE
                    pri.shipment_id = s.shipment_id
                GROUP BY
                    pr.pickup_request_id, pr.cost, pr.request_date, pr.completion_date,
                    oc.company_id, oc.company_name,
                    dc.company_id, dc.company_name
            ) AS pickup_request_data
        ) AS "shipmentItems"
    FROM
        shipments s
    INNER JOIN
        vehicle v ON s.vehicle_id = v.vehicle_id
    INNER JOIN
        shipment_status ss ON s.shipment_status_id = ss.shipment_status_id
    INNER JOIN
        vehicle_type vt ON v.vehicle_type_id = vt.vehicle_type_id
    WHERE
        (p_shipment_id IS NULL OR s.shipment_id = p_shipment_id)
        AND (p_status_id IS NULL OR ss.shipment_status_id = p_status_id)
        AND (p_dispatch_date IS NULL OR s.dispatch_date::DATE = p_dispatch_date);
END;
$$;