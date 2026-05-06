-- Adds tip_amount, delivery_latitude and delivery_longitude to orders.
-- Run this if your database was created from 00_schema.sql and
-- these columns are not yet present.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tip_amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_latitude  NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(9, 6);
