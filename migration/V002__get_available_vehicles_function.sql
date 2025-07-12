DROP FUNCTION get_available_vehicles(date);

CREATE OR REPLACE FUNCTION get_available_vehicles(p_dispatch_date DATE)
RETURNS TABLE (
    vehicle_id INT,
    vehicle_type_id INT,
    is_active BOOLEAN,
    "vehicleType" VARCHAR, -- Or appropriate string type for your vehicle_type name
    maximum_capacity INT,
    capacity_type_id INT,
    max_pickups_per_day INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.vehicle_id,
        v.vehicle_type_id,
        v.is_active,
        vt.name AS "vehicleType",
        vt.maximum_capacity,
        vt.capacity_type_id,
        vt.max_pickups_per_day
    FROM
        vehicle v
    INNER JOIN
        vehicle_type vt ON v.vehicle_type_id = vt.vehicle_type_id
    WHERE
        v.is_active = TRUE
    AND NOT EXISTS (
        SELECT 1
        FROM shipments s
        WHERE s.vehicle_id = v.vehicle_id
          AND s.dispatch_date = p_dispatch_date
    );
END;
$$;