ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS driver_latitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS driver_longitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS driver_accuracy NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;
