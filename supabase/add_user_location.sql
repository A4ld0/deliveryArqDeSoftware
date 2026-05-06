-- Add location columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
