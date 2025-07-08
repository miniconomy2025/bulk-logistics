BEGIN;

CREATE TYPE money_direction_enum AS ENUM ('in', 'out');

ALTER TABLE IF EXISTS transaction_category ADD COLUMN money_direction money_direction_enum;

COMMIT;