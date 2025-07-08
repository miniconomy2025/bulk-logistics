BEGIN;

DROP TABLE IF EXISTS bank_transactions_ledger;

DROP TABLE IF EXISTS loans;

DROP TABLE IF EXISTS pickup_request_item;

DROP TABLE IF EXISTS shipments;

DROP TABLE IF EXISTS shipment_status;

DROP TABLE IF EXISTS pickup_requests;

DROP TABLE IF EXISTS vehicle;

DROP TABLE IF EXISTS vehicle_type;

DROP TABLE IF EXISTS item_definitions;

DROP TABLE IF EXISTS company;

DROP TABLE IF EXISTS transaction_status;

DROP TABLE IF EXISTS transaction_category;

DROP TABLE IF EXISTS capacity_type;

CREATE TABLE
  capacity_type (
    capacity_type_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
  );

CREATE TABLE
  transaction_category (
    transaction_category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
  );

CREATE TABLE
  transaction_status (
    transaction_status_id SERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL UNIQUE
  );

CREATE TABLE
  company (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL UNIQUE,
    company_url VARCHAR(255) NOT NULL UNIQUE,
    certificate_identifier VARCHAR(255) UNIQUE,
    bank_account_number VARCHAR(50) UNIQUE
  );

CREATE TABLE
  item_definitions (
    item_definition_id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL UNIQUE,
    capacity_type_id INTEGER NOT NULL REFERENCES capacity_type (capacity_type_id) ON UPDATE CASCADE ON DELETE RESTRICT
  );

CREATE TABLE
  vehicle_type (
    vehicle_type_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    capacity_type_id INTEGER NOT NULL REFERENCES capacity_type (capacity_type_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    maximum_capacity INTEGER NOT NULL,
    max_pickups_per_day INTEGER NOT NULL,
    max_dropoffs_per_day INTEGER NOT NULL
  );

CREATE TABLE
  vehicle (
    vehicle_id SERIAL PRIMARY KEY,
    is_active BOOLEAN NOT NULL,
    daily_operational_cost NUMERIC(10, 2) NOT NULL,
    vehicle_type_id INTEGER NOT NULL REFERENCES vehicle_type (vehicle_type_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    purchase_date DATE NOT NULL
  );

CREATE TABLE
  pickup_requests (
    pickup_request_id SERIAL PRIMARY KEY,
    requesting_company_id INTEGER NOT NULL REFERENCES company (company_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    origin_company_id INTEGER NOT NULL REFERENCES company (company_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    destination_company_id INTEGER NOT NULL REFERENCES company (company_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    original_external_order_id VARCHAR(255) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL,
    request_date DATE NOT NULL,
    completion_date DATE
  );

CREATE TABLE
  shipment_status (
    shipment_status_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
  );

CREATE TABLE
  shipments (
    shipment_id SERIAL PRIMARY KEY,
    dispatch_date DATE NOT NULL,
    vehicle_id INTEGER NOT NULL REFERENCES vehicle (vehicle_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    shipment_status_id INTEGER NOT NULL REFERENCES shipment_status (shipment_status_id) ON UPDATE CASCADE ON DELETE RESTRICT
  );

CREATE TABLE
  pickup_request_item (
    pickup_request_item_id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES shipments (shipment_id) ON UPDATE CASCADE ON DELETE CASCADE,
    item_definition_id INTEGER NOT NULL REFERENCES item_definitions (item_definition_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    pickup_request_id INTEGER NOT NULL REFERENCES pickup_requests (pickup_request_id) ON UPDATE CASCADE ON DELETE CASCADE,
    quantity INTEGER NOT NULL
  );

CREATE TABLE
  loans (
    loan_id SERIAL PRIMARY KEY,
    loan_number VARCHAR(16) NOT NULL UNIQUE,
    interest_rate NUMERIC(8, 5) NOT NULL,
    loan_amount NUMERIC(15, 2) NOT NULL
  );

CREATE TABLE
  bank_transactions_ledger (
    transaction_ledger_id SERIAL PRIMARY KEY,
    commercial_bank_transaction_id VARCHAR(100) UNIQUE,
    payment_reference_id UUID,
    transaction_category_id INTEGER NOT NULL REFERENCES transaction_category (transaction_category_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_status_id INTEGER NOT NULL REFERENCES transaction_status (transaction_status_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    related_pickup_request_id INTEGER REFERENCES pickup_requests (pickup_request_id) ON UPDATE CASCADE ON DELETE SET NULL,
    loan_id INTEGER REFERENCES loans (loan_id) ON UPDATE CASCADE ON DELETE SET NULL,
    related_thoh_order_id VARCHAR(255)
  );

COMMIT;