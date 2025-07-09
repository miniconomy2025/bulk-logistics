-- Function to get a dummy bank account number for Bulk Logistics
-- REPLACE LATER WHEN WE HAVE CONFIG SET UP
CREATE OR REPLACE FUNCTION get_bulk_logistics_bank_account()
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN 'BL1234567890'; -- Replace with our actual bank account number. How else are we gonna get this? Can pass it in query from config perhaps.
END;
$$ LANGUAGE plpgsql;

-- ** UPDATED TYPE DEFINITION **
-- Define a composite type for the return value of our creation function.
-- The field names are now quoted and in camelCase to match the desired output.
DROP TYPE IF EXISTS pickup_request_creation_result CASCADE;
CREATE TYPE pickup_request_creation_result AS (
    "pickupRequestId" INTEGER,
    "paymentReferenceId" UUID,
    "cost" NUMERIC(10,2),
    "bulkLogisticsBankAccountNumber" VARCHAR(50)
);

-- ** UPDATED FUNCTION **
-- Function to create a new pickup request and its items,
-- and to atomically create an associated bank transaction ledger entry,
-- returning key details for the application.
CREATE OR REPLACE FUNCTION create_pickup_request(
    p_requesting_company_id INTEGER,
    p_origin_company_id INTEGER,
    p_destination_company_id INTEGER,
    p_original_external_order_id VARCHAR,
    p_cost NUMERIC(10,2), -- Cost of the logistics service
    p_request_date DATE, -- Simulation date of the request
    p_items_json JSONB -- Array of items with 'itemName' and 'quantity' at LEAST.
)
RETURNS pickup_request_creation_result -- returns our custom composite type
LANGUAGE plpgsql AS $$
DECLARE
    v_pickup_request_id INTEGER;
    v_payment_reference_id UUID;
    v_item_data JSONB;
    v_bulk_logistics_bank_account VARCHAR(50);
    v_item_definition_id INTEGER;
    v_item_name VARCHAR(100);
    v_quantity INTEGER;
    v_transaction_category_id INTEGER;
    v_transaction_status_id INTEGER;
    v_result pickup_request_creation_result; -- Variable to hold the return value
BEGIN
    -- 1. Generate Payment Reference ID for the bank transaction
    v_payment_reference_id := gen_random_uuid();

    -- 2. Get Bulk Logistics Bank Account Number (for API response)
    v_bulk_logistics_bank_account := get_bulk_logistics_bank_account();

    -- 3. Insert into pickup_requests table
    INSERT INTO pickup_requests (
        requesting_company_id,
        origin_company_id,
        destination_company_id,
        original_external_order_id,
        cost,
        request_date
    ) VALUES (
        p_requesting_company_id,
        p_origin_company_id,
        p_destination_company_id,
        p_original_external_order_id,
        p_cost,
        p_request_date
    ) RETURNING pickup_request_id INTO v_pickup_request_id;

    -- 4. Insert into pickup_request_item table for each item in the JSONB array
    FOR v_item_data IN SELECT * FROM jsonb_array_elements(p_items_json) LOOP
        v_item_name := v_item_data->>'itemName';
        v_quantity := (v_item_data->>'quantity')::INTEGER;

        SELECT item_definition_id INTO v_item_definition_id
        FROM item_definitions
        WHERE item_name = v_item_name;

        IF v_item_definition_id IS NULL THEN
            RAISE EXCEPTION 'Item definition not found for item_name: %', v_item_name;
        END IF;

        INSERT INTO pickup_request_item (
            pickup_request_id,
            item_definition_id,
            quantity
        ) VALUES (
            v_pickup_request_id,
            v_item_definition_id,
            v_quantity
        );
    END LOOP;

    -- 5. Create an associated entry in bank_transactions_ledger
    SELECT transaction_category_id INTO v_transaction_category_id
    FROM transaction_category
    WHERE name = 'PAYMENT_RECEIVED';

    SELECT transaction_status_id INTO v_transaction_status_id
    FROM transaction_status
    WHERE status = 'Pending';

    INSERT INTO bank_transactions_ledger (
        commercial_bank_transaction_id,
        payment_reference_id,
        transaction_category_id,
        amount,
        transaction_date,
        transaction_status_id,
        related_pickup_request_id,
        loan_id,
        related_thoh_order_id
    ) VALUES (
        NULL,
        v_payment_reference_id,
        v_transaction_category_id,
        p_cost,
        p_request_date,
        v_transaction_status_id,
        v_pickup_request_id,
        NULL,
        NULL
    );

    -- 6. ** UPDATED ASSIGNMENTS **
    -- Prepare the return value using the camelCase field names.
    v_result."pickupRequestId" := v_pickup_request_id;
    v_result."paymentReferenceId" := v_payment_reference_id;
    v_result."cost" := p_cost;
    v_result."bulkLogisticsBankAccountNumber" := v_bulk_logistics_bank_account;

    RETURN v_result; --Return the composite type
END;
$$;
