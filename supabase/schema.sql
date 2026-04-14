-- Delivery Platform - Initial Schema
-- Compatible with Supabase Postgres

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('client', 'driver', 'restaurant', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'PENDING',
      'ACCEPTED',
      'REJECTED',
      'READY_FOR_PICKUP',
      'ASSIGNED',
      'IN_TRANSIT',
      'DELIVERED',
      'CANCELLED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
    CREATE TYPE incident_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role user_role NOT NULL,
  phone VARCHAR(30),
  address VARCHAR(250),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id UUID UNIQUE NOT NULL REFERENCES users(auth_user_id),
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255),
  address VARCHAR(250) NOT NULL,
  phone VARCHAR(30),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category VARCHAR(60),
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES users(auth_user_id),
  restaurant_id BIGINT NOT NULL REFERENCES restaurants(id),
  status order_status NOT NULL DEFAULT 'PENDING',
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee NUMERIC(10, 2) NOT NULL CHECK (delivery_fee >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  delivery_address VARCHAR(250) NOT NULL,
  cancellation_reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES users(auth_user_id),
  status order_status NOT NULL CHECK (status IN ('ASSIGNED', 'IN_TRANSIT', 'DELIVERED')),
  estimated_location VARCHAR(150),
  assigned_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(30) NOT NULL,
  payment_status VARCHAR(40) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS incidents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES users(auth_user_id),
  title VARCHAR(120) NOT NULL,
  description VARCHAR(500) NOT NULL,
  status incident_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  changed_by UUID REFERENCES users(auth_user_id),
  notes VARCHAR(255),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_restaurant_id ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_by ON incidents(reported_by);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_restaurants_updated_at ON restaurants;
CREATE TRIGGER trg_restaurants_updated_at
BEFORE UPDATE ON restaurants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_incidents_updated_at ON incidents;
CREATE TRIGGER trg_incidents_updated_at
BEFORE UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
