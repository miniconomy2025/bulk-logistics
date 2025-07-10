CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION get_bulk_logistics_bank_account()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_account_number VARCHAR(50);
BEGIN
    SELECT bank_account_number 
    INTO v_account_number
    FROM company 
    WHERE company_name = 'bulk-logistics';

    RETURN v_account_number;
END;
$$ LANGUAGE plpgsql;


DROP TYPE IF EXISTS pickup_request_creation_result CASCADE;
CREATE TYPE pickup_request_creation_result AS (
    "pickupRequestId" INTEGER,
    "paymentReferenceId" UUID,
    "cost" NUMERIC(10,2),
    "bulkLogisticsBankAccountNumber" VARCHAR(50)
);

CREATE OR REPLACE FUNCTION create_pickup_request(
    p_requesting_company_name VARCHAR, 
    p_origin_company_name VARCHAR,     
    p_destination_company_name VARCHAR,
    p_original_external_order_id VARCHAR,
    p_cost NUMERIC(10,2), 
    p_request_date DATE, 
    p_items_json JSONB 
)
RETURNS pickup_request_creation_result 
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
    v_result pickup_request_creation_result;
    
    v_requesting_company_id INTEGER;
    v_origin_company_id INTEGER;
    v_destination_company_id INTEGER;
BEGIN
    SELECT company_id INTO v_requesting_company_id FROM company WHERE company_name = p_requesting_company_name;
    IF v_requesting_company_id IS NULL THEN
        RAISE EXCEPTION 'Company not found for name: %', p_requesting_company_name;
    END IF;

    SELECT company_id INTO v_origin_company_id FROM company WHERE company_name = p_origin_company_name;
    IF v_origin_company_id IS NULL THEN
        RAISE EXCEPTION 'Company not found for name: %', p_origin_company_name;
    END IF;

    SELECT company_id INTO v_destination_company_id FROM company WHERE company_name = p_destination_company_name;
    IF v_destination_company_id IS NULL THEN
        RAISE EXCEPTION 'Company not found for name: %', p_destination_company_name;
    END IF;

    v_payment_reference_id := uuid_generate_v4();

    v_bulk_logistics_bank_account := get_bulk_logistics_bank_account();

    INSERT INTO pickup_requests (
        requesting_company_id,
        origin_company_id,
        destination_company_id,
        original_external_order_id,
        cost,
        request_date
    ) VALUES (
        v_requesting_company_id,
        v_origin_company_id,
        v_destination_company_id,
        p_original_external_order_id,
        p_cost,
        p_request_date
    ) RETURNING pickup_request_id INTO v_pickup_request_id;

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

    SELECT transaction_category_id INTO v_transaction_category_id
    FROM transaction_category
    WHERE name = 'PAYMENT_RECEIVED';

    SELECT transaction_status_id INTO v_transaction_status_id
    FROM transaction_status
    WHERE status = 'PENDING';

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

    v_result."pickupRequestId" := v_pickup_request_id;
    v_result."paymentReferenceId" := v_payment_reference_id;
    v_result."cost" := p_cost;
    v_result."bulkLogisticsBankAccountNumber" := v_bulk_logistics_bank_account;

    RETURN v_result;
END;
$$;