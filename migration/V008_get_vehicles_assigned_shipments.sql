DROP FUNCTION IF EXISTS get_OpCost_For_Vehicles_WithShipments(date);

CREATE OR REPLACE FUNCTION get_OpCost_For_Vehicles_WithShipments(p_dispatch_date DATE)
RETURNS TABLE (
    "operationalCost" NUMERIC(10,2) 
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.daily_operational_cost as "operationalCost"
    FROM
        vehicle v
    WHERE
        is_active = TRUE
    AND EXISTS (
        SELECT 1
        FROM shipments s
        WHERE s.vehicle_id = v.vehicle_id
          AND s.dispatch_date = p_dispatch_date
    );
END;
$$;