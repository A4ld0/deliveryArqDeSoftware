-- Apply this script on existing databases where `products.image_url` does not exist yet.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_url TEXT;
