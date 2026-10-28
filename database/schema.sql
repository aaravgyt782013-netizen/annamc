-- Run this file in the Neon SQL Editor before deploying the API.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS staff_users (
  email text PRIMARY KEY,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('store_manager','support')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS login_attempts (
  attempt_key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  first_attempt timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_paise integer NOT NULL CHECK (price_paise >= 0),
  target_server text NOT NULL CHECK (target_server IN ('lifesteal','practice','both')),
  rank_group text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minecraft_username varchar(16) NOT NULL,
  target_server text NOT NULL CHECK (target_server IN ('lifesteal','practice')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  currency char(3) NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled','refunded')),
  payment_provider text,
  provider_order_id text UNIQUE,
  provider_payment_id text UNIQUE,
  payment_verified_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'not_ready' CHECK (delivery_status IN ('not_ready','queued','delivered','failed')),
  delivery_id text UNIQUE,
  support_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status, delivery_status);
CREATE INDEX IF NOT EXISTS products_active_sort_idx ON products(active, sort_order);
CREATE INDEX IF NOT EXISTS announcements_public_idx ON announcements(active, starts_at, ends_at);

-- Editable admin-managed voting links/configuration (no secret vote tokens stored here).
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS network_status (
  status_key text PRIMARY KEY,
  status_value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
