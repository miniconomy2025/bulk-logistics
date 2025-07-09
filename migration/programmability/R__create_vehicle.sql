CREATE OR REPLACE PROCEDURE insert_vehicle_info
(
    p_name VARCHAR
(50),
    p_purchase_date DATE,
    p_daily_operational_cost NUMERIC
(10,2),
    p_maximum_capacity INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_capacity_type_id INTEGER;
    v_max_pickups INTEGER;
    v_max_dropoffs INTEGER;
    v_vehicle_type_id INTEGER;
BEGIN
    CASE p_name
        WHEN 'large_truck' THEN
    SELECT capacity_type_id
    INTO v_capacity_type_id
    FROM capacity_type
    WHERE name = 'KG';
    v_max_pickups := 1;
v_max_dropoffs := 1;
        WHEN 'medium_truck' THEN
SELECT capacity_type_id
INTO v_capacity_type_id
FROM capacity_type
WHERE name = 'UNIT';
v_max_pickups := 5;
            v_max_dropoffs := 100;
        WHEN 'small_truck' THEN
SELECT capacity_type_id
INTO v_capacity_type_id
FROM capacity_type
WHERE name = 'UNIT';
v_max_pickups := 200;
            v_max_dropoffs := 500;
        ELSE
            -- If the vehicle name doesn't match known types, raise an exception.
            RAISE EXCEPTION 'Invalid vehicle name provided: %', p_name;
END CASE;

-- Check if a capacity type was found. If not, the prerequisite data is missing.
IF v_capacity_type_id IS NULL THEN
        RAISE EXCEPTION 'Capacity type for vehicle % could not be found. Please ensure capacity types ''KG'' and ''UNIT'' exist.', p_name;
END
IF;

    -- Attempt to find an existing vehicle_type with the same name.
    SELECT vehicle_type_id
INTO v_vehicle_type_id
FROM vehicle_type
WHERE name = p_name;

-- If no existing vehicle_type is found, insert a new one.
IF NOT FOUND THEN
INSERT INTO vehicle_type
    (
    name,
    capacity_type_id,
    maximum_capacity,
    max_pickups_per_day,
    max_dropoffs_per_day
    )
VALUES
    (
        p_name,
        v_capacity_type_id,
        p_maximum_capacity,
        v_max_pickups,
        v_max_dropoffs
        )
RETURNING vehicle_type.vehicle_type_id INTO v_vehicle_type_id;
END
IF;

    INSERT INTO vehicle
    (
    is_active,
    daily_operational_cost,
    vehicle_type_id,
    purchase_date
    )
VALUES
    (
        TRUE, -- A new vehicle is active by default (we'll update the table creation logic later if needed).
        p_daily_operational_cost,
        v_vehicle_type_id,
        p_purchase_date
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE INFO 'An error occurred: %', SQLERRM;
        RAISE;
END;
$$;