-- Function to get a dummy bank account number for Bulk Logistics
-- This should probably come from a configuration or a dedicated table.
CREATE OR REPLACE FUNCTION get_bulk_logistics_bank_account()
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN 'BL1234567890'; -- Replace with your actual bank account number
END;
$$ LANGUAGE plpgsql;

-- This proc will make the pickup request, populate the pickup_request_items table and create a ledger entry for the request.
CREATE OR REPLACE PROCEDURE create_pickup_request(
    p_requesting_company_id INTEGER,
    p_origin_company_id INTEGER,
    p_destination_company_id INTEGER,
    p_original_external_order_id VARCHAR,
    p_cost NUMERIC(10,2), -- Cost of the logistics service
    p_request_date DATE, -- Simulation date of the request
    p_items_json JSONB -- Array of items with 'itemName' and 'quantity'
)
LANGUAGE plpgsql AS $$
DECLARE
    v_pickup_request_id INTEGER;
    v_payment_reference_id UUID; -- Generated for the bank transaction
    v_item_data JSONB;
    v_bulk_logistics_bank_account VARCHAR(50);
    v_item_definition_id INTEGER;
    v_item_name VARCHAR(100);
    v_quantity INTEGER;
    v_transaction_category_id INTEGER;
    v_transaction_status_id INTEGER;
BEGIN
    -- 1. Generate Payment Reference ID for the bank transaction
    v_payment_reference_id := gen_random_uuid();

    -- 2. Get Bulk Logistics Bank Account Number (for API response)
    v_bulk_logistics_bank_account := get_bulk_logistics_bank_account();

    -- 3. Insert into pickup_requests table
    -- 'completion_date' is nullable and left NULL on creation.
    INSERT INTO pickup_requests (
        requesting_company_id,
        origin_company_id,
        destination_company_id,
        original_external_order_id,
        cost,
        request_date
        -- completion_date is implicitly NULL here
    ) VALUES (
        p_requesting_company_id,
        p_origin_company_id,
        p_destination_company_id,
        p_original_external_order_id,
        p_cost,
        p_request_date
    ) RETURNING pickup_request_id INTO v_pickup_request_id; -- Store the resulting id in the variable here.

    -- 4. Insert into pickup_request_item table for each item in the JSONB array
    -- for each item in the items array, set the item name and quantity. Then get the item definition id from the name. If the name is wrong, throw error.
    -- If all is well, we insert the pickup request item into the table.
    FOR v_item_data IN SELECT * FROM jsonb_array_elements(p_items_json) LOOP
        v_item_name := v_item_data->>'itemName';
        v_quantity := (v_item_data->>'quantity')::INTEGER;

        -- Look up item_definition_id from item_definitions table using the item_name
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
    -- Get the IDs for the transaction category and initial status
    SELECT transaction_category_id INTO v_transaction_category_id
    FROM transaction_category
    WHERE name = 'INBOUND_LOGISTICS_FEE'; -- Still need to insert this into the DB.

    SELECT transaction_status_id INTO v_transaction_status_id
    FROM transaction_status
    WHERE status = 'PENDING'; -- Still need to insert this into the DB

    INSERT INTO bank_transactions_ledger (
        commercial_bank_transaction_id, -- This will be NULL initially, filled when bank confirms
        payment_reference_id, -- Your generated UUID for this transaction
        transaction_category_id,
        amount,
        transaction_date,
        transaction_status_id,
        related_pickup_request_id, -- Link back to the pickup request
        related_loan_id, -- NULL for this type of transaction
        related_thoh_order_id -- NULL for this type of transaction
    ) VALUES (
        NULL, -- commercial_bank_transaction_id is set by the bank later
        v_payment_reference_id,
        v_transaction_category_id,
        p_cost, -- The cost of the pickup request
        p_request_date, -- The date the transaction was initiated
        v_transaction_status_id, -- Initial status is PENDING
        v_pickup_request_id,
        NULL,
        NULL
    );

    -- -- 6. Raise a notice for logging/debugging (optional, for direct procedure calls)                          OPTIONAL
    -- RAISE NOTICE 'Pickup Request Created: ID=%, Cost=%, PaymentRef=%, BankAccount=%',
    --              v_pickup_request_id, p_cost, v_payment_reference_id, v_bulk_logistics_bank_account;

END;
$$;