BEGIN;

-- Insert data into capacity_type
INSERT INTO capacity_type (name) VALUES
('KG'),
('UNIT');

-- Insert data into transaction_category
INSERT INTO transaction_category (name) VALUES
('LOAN'),
('PURCHASE'),
('EXPENSE'),
('PAYMENT_RECEIVED');

-- Insert data into transaction_status
INSERT INTO transaction_status (status) VALUES
('Pending'),
('Completed'),
('Failed');

-- Insert data into company (updated with new names)
INSERT INTO company (company_name, certificate_identifier, bank_account_number) VALUES
('electronics-supplier', 'CERT-ELEC-SUP-001', '1000000001'),
('screen-supplier', 'CERT-SCRN-SUP-001', '1000000002'),
('case-supplier', 'CERT-CASE-SUP-001', '1000000003'),
('bulk-logistics', 'CERT-BULK-LOG-001', '1000000004'),
('consumer-logistics', 'CERT-CONS-LOG-001', '1000000005'),
('pear-company', 'CERT-PEAR-CMP-001', '1000000006'),
('sumsang-company', 'CERT-SUMS-CMP-001', '1000000007'),
('commercial-bank', 'CERT-COMM-BANK-001', '1000000008'),
('retail-bank', 'CERT-RET-BANK-001', '1000000009'),
('thoh', 'CERT-THOH-001', '1000000010'),
('recycler', 'CERT-RECYCLER-001', '1000000011');

-- Insert data into item_definitions
INSERT INTO item_definitions (item_name, capacity_type_id) VALUES
('Heavy Machinery Part', (SELECT capacity_type_id FROM capacity_type WHERE name = 'KG')),
('Pallet of Goods', (SELECT capacity_type_id FROM capacity_type WHERE name = 'KG')),
('Small Parcel', (SELECT capacity_type_id FROM capacity_type WHERE name = 'UNIT')),
('Electronics Box', (SELECT capacity_type_id FROM capacity_type WHERE name = 'UNIT')),
('Industrial Chemicals', (SELECT capacity_type_id FROM capacity_type WHERE name = 'KG'));

-- Insert data into vehicle_type
INSERT INTO vehicle_type (name, capacity_type_id, maximum_capacity, max_pickups_per_day, max_dropoffs_per_day) VALUES
('LARGE', (SELECT capacity_type_id FROM capacity_type WHERE name = 'KG'), 5000, 2, 2),
('MEDIUM', (SELECT capacity_type_id FROM capacity_type WHERE name = 'UNIT'), 2000, 3, 3),
('SMALL', (SELECT capacity_type_id FROM capacity_type WHERE name = 'UNIT'), 500, 5, 5);

-- Insert data into vehicle
INSERT INTO vehicle (is_active, daily_operational_cost, vehicle_type_id, purchase_date) VALUES
(TRUE, 150.00, (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'LARGE'), '2022-01-15'),
(TRUE, 100.00, (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'MEDIUM'), '2023-03-01'),
(TRUE, 75.00, (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'SMALL'), '2023-06-10'),
(TRUE, 160.00, (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'LARGE'), '2022-07-20'),
(FALSE, 90.00, (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'MEDIUM'), '2021-11-05');

-- Insert data into pickup_requests (updated with new company references)
INSERT INTO pickup_requests (requesting_company_id, origin_company_id, destination_company_id, original_external_order_id, cost, request_date, completion_date) VALUES
((SELECT company_id FROM company WHERE company_name = 'pear-company'), (SELECT company_id FROM company WHERE company_name = 'electronics-supplier'), (SELECT company_id FROM company WHERE company_name = 'bulk-logistics'), 'ACME-ORDER-001', 500.00, '2024-06-01', '2024-06-02'),
((SELECT company_id FROM company WHERE company_name = 'sumsang-company'), (SELECT company_id FROM company WHERE company_name = 'screen-supplier'), (SELECT company_id FROM company WHERE company_name = 'consumer-logistics'), 'BETA-ORDER-002', 150.00, '2024-06-01', NULL),
((SELECT company_id FROM company WHERE company_name = 'pear-company'), (SELECT company_id FROM company WHERE company_name = 'case-supplier'), (SELECT company_id FROM company WHERE company_name = 'bulk-logistics'), 'ACME-ORDER-003', 750.00, '2024-06-02', NULL),
((SELECT company_id FROM company WHERE company_name = 'consumer-logistics'), (SELECT company_id FROM company WHERE company_name = 'pear-company'), (SELECT company_id FROM company WHERE company_name = 'recycler'), 'GLOBAL-ORDER-004', 300.00, '2024-06-03', '2024-06-04');

-- Insert data into pickup_request_item
INSERT INTO pickup_request_item (item_definition_id, pickup_request_id, quantity) VALUES
((SELECT item_definition_id FROM item_definitions WHERE item_name = 'Heavy Machinery Part'), (SELECT pickup_request_id FROM pickup_requests WHERE original_external_order_id = 'ACME-ORDER-001'), 3000),
((SELECT item_definition_id FROM item_definitions WHERE item_name = 'Pallet of Goods'), (SELECT pickup_request_id FROM pickup_requests WHERE original_external_order_id = 'ACME-ORDER-001'), 2000),
((SELECT item_definition_id FROM item_definitions WHERE item_name = 'Small Parcel'), (SELECT pickup_request_id FROM pickup_requests WHERE original_external_order_id = 'BETA-ORDER-002'), 100),
((SELECT item_definition_id FROM item_definitions WHERE item_name = 'Electronics Box'), (SELECT pickup_request_id FROM pickup_requests WHERE original_external_order_id = 'BETA-ORDER-002'), 50),
((SELECT item_definition_id FROM item_definitions WHERE item_name = 'Industrial Chemicals'), (SELECT pickup_request_id FROM pickup_requests WHERE original_external_order_id = 'ACME-ORDER-003'), 6000);

-- Insert data into shipment_status (updated with new names)
INSERT INTO shipment_status (name) VALUES
('PENDING'),
('PICKED_UP'),
('DELIVERED');

-- Insert data into shipments
-- Note: The original script used 'Delivered' and 'Pending' which are now 'DELIVERED' and 'PENDING'.
-- Also, 'Dispatched' is no longer a status, using 'PICKED_UP' instead.
INSERT INTO shipments (dispatch_date, vehicle_id, shipment_status_id) VALUES
('2024-06-02', (SELECT vehicle_id FROM vehicle WHERE vehicle_type_id = (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'LARGE') AND is_active = TRUE LIMIT 1), (SELECT shipment_status_id FROM shipment_status WHERE name = 'DELIVERED')),
('2024-06-02', (SELECT vehicle_id FROM vehicle WHERE vehicle_type_id = (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'MEDIUM') AND is_active = TRUE LIMIT 1), (SELECT shipment_status_id FROM shipment_status WHERE name = 'PENDING')),
('2024-06-04', (SELECT vehicle_id FROM vehicle WHERE vehicle_type_id = (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'SMALL') AND is_active = TRUE LIMIT 1), (SELECT shipment_status_id FROM shipment_status WHERE name = 'PICKED_UP'));

-- Insert data into shipment_item_details
INSERT INTO shipment_item_details (shipment_id, pickup_request_item_id, quantity_transported) VALUES
((SELECT shipment_id FROM shipments WHERE dispatch_date = '2024-06-02' AND vehicle_id = (SELECT vehicle_id FROM vehicle WHERE vehicle_type_id = (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'LARGE') AND is_active = TRUE LIMIT 1) AND shipment_status_id = (SELECT shipment_status_id FROM shipment_status WHERE name = 'DELIVERED') LIMIT 1), (SELECT pickup_request_item_id FROM pickup_request_item WHERE pickup_request_id = (SELECT pickup_request_id FROM pickup_requests WHERE original_external_order_id = 'ACME-ORDER-001') AND item_definition_id = (SELECT item_definition_id FROM item_definitions WHERE item_name = 'Heavy Machinery Part')), 3000),
((SELECT shipment_id FROM shipments WHERE dispatch_date = '2024-06-02' AND vehicle_id = (SELECT vehicle_id FROM vehicle WHERE vehicle_type_id = (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'LARGE') AND is_active = TRUE LIMIT 1) AND shipment_status_id = (SELECT shipment_status_id FROM shipment_status WHERE name = 'DELIVERED') LIMIT 1), (SELECT pickup_request_item_id FROM pickup_request_item WHERE pickup_request_id = (SELECT pickup_request_id FROM pickup_requests WHERE original_external_order_id = 'ACME-ORDER-001') AND item_definition_id = (SELECT item_definition_id FROM item_definitions WHERE item_name = 'Pallet of Goods')), 2000),
((SELECT shipment_id FROM shipments WHERE dispatch_date = '2024-06-02' AND vehicle_id = (SELECT vehicle_id FROM vehicle WHERE vehicle_type_id = (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'MEDIUM') AND is_active = TRUE LIMIT 1) AND shipment_status_id = (SELECT shipment_status_id FROM shipment_status WHERE name = 'PENDING') LIMIT 1), (SELECT pickup_request_item_id FROM pickup_request_item WHERE pickup_request_id = (SELECT pickup_request_id FROM pickup_requests WHERE original_external_order_id = 'BETA-ORDER-002') AND item_definition_id = (SELECT item_definition_id FROM item_definitions WHERE item_name = 'Small Parcel')), 100);

-- Insert data into bank_transactions_ledger (updated with new transaction categories and company references)
INSERT INTO bank_transactions_ledger (commercial_bank_transaction_id, payment_reference_id, transaction_category_id, amount, transaction_date, transaction_status_id, related_pickup_request_id, related_loan_id, related_thoh_order_id) VALUES
('BANK-TXN-001', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', (SELECT transaction_category_id FROM transaction_category WHERE name = 'PAYMENT_RECEIVED'), 500.00, '2024-06-02', (SELECT transaction_status_id FROM transaction_status WHERE status = 'Completed'), (SELECT pickup_request_id FROM pickup_requests WHERE original_external_order_id = 'ACME-ORDER-001'), NULL, NULL),
('BANK-TXN-002', 'b2c3d4e5-f6a7-8901-2345-67890abcdef0', (SELECT transaction_category_id FROM transaction_category WHERE name = 'EXPENSE'), 75.50, '2024-06-03', (SELECT transaction_status_id FROM transaction_status WHERE status = 'Completed'), NULL, NULL, NULL),
('BANK-TXN-003', 'c3d4e5f6-a7b8-9012-3456-7890abcdef01', (SELECT transaction_category_id FROM transaction_category WHERE name = 'PAYMENT_RECEIVED'), 150.00, '2024-06-02', (SELECT transaction_status_id FROM transaction_status WHERE status = 'Pending'), (SELECT pickup_request_id FROM pickup_requests WHERE original_external_order_id = 'BETA-ORDER-002'), NULL, NULL),
('BANK-TXN-004', 'd4e5f6a7-b8c9-0123-4567-890abcdef012', (SELECT transaction_category_id FROM transaction_category WHERE name = 'EXPENSE'), 200.00, '2024-06-04', (SELECT transaction_status_id FROM transaction_status WHERE status = 'Completed'), NULL, NULL, NULL);

COMMIT;