CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  landmark TEXT,
  email_verified_at TIMESTAMPTZ,
  session_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTPs are stored as keyed digests, never plaintext. Challenges are single-use,
-- short-lived, and rate-limited by both address and a privacy-preserving IP hash.
CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),
  code_hash TEXT NOT NULL,
  request_ip_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_states (
  id TEXT PRIMARY KEY,
  state_hash TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  return_to TEXT NOT NULL DEFAULT '/account',
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  provider_subject TEXT NOT NULL,
  provider_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_subject),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  measurement TEXT,
  weight TEXT,
  colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  customizable BOOLEAN NOT NULL DEFAULT FALSE,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_focal_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  badge TEXT,
  bestseller BOOLEAN NOT NULL DEFAULT FALSE,
  stock_quantity INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  landmark TEXT,
  delivery_zone TEXT NOT NULL CHECK (delivery_zone IN ('fct', 'outside_fct', 'test')),
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  delivery_fee INTEGER NOT NULL CHECK (delivery_fee >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'payment_pending'
    CHECK (status IN ('pending', 'payment_pending', 'payment_expired', 'paid', 'paid_after_cancel_review', 'processing', 'shipped', 'dispatched', 'delivered', 'refund_pending', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'review', 'refund_pending', 'refunded')),
  payment_mode TEXT NOT NULL DEFAULT 'live' CHECK (payment_mode IN ('test', 'live')),
  paystack_reference TEXT UNIQUE,
  paystack_access_code TEXT,
  paystack_transaction_id TEXT,
  payment_channel TEXT,
  payment_gateway_response TEXT,
  paid_at TIMESTAMPTZ,
  paystack_payload JSONB,
  refund_id TEXT,
  refund_status TEXT,
  refund_previous_status TEXT,
  refund_payload JSONB,
  refunded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  paid_after_cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT,
  image_url TEXT,
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total INTEGER NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  access_code TEXT,
  payment_mode TEXT NOT NULL DEFAULT 'live' CHECK (payment_mode IN ('test', 'live')),
  status TEXT NOT NULL DEFAULT 'pending',
  local_status TEXT NOT NULL DEFAULT 'active'
    CHECK (local_status IN ('active', 'cancelled_by_customer', 'cancelled_by_owner', 'expired', 'superseded', 'closed', 'review_required')),
  transaction_id TEXT,
  channel TEXT,
  gateway_response TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  paid_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uploaded media lives in Vercel Blob; this table is the catalogue of it.
-- `crops` maps an image-context id (see src/utils/imageContexts.js) to
-- { x, y, zoom }, so one upload can be framed differently for each shape the
-- site renders it at without ever storing a second copy of the file.
CREATE TABLE IF NOT EXISTS image_assets (
  url TEXT PRIMARY KEY,
  pathname TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt TEXT,
  crops JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Named, owner-managed slots for imagery that is part of the page design rather
-- than the catalogue. A missing or empty row renders a graceful placeholder.
CREATE TABLE IF NOT EXISTS site_assets (
  key TEXT PRIMARY KEY,
  url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_assets (key, url) VALUES
  ('home-hero-video', NULL),
  ('home-brand-story', NULL),
  ('home-category-najma', NULL),
  ('home-category-sleeves', NULL),
  ('home-category-accessories', NULL),
  ('about-hero', NULL),
  ('about-craft', NULL),
  ('account-hero', NULL),
  ('brand-logo', NULL),
  ('og-default', NULL)
ON CONFLICT (key) DO NOTHING;

-- Owner-curated page settings that are not images: currently which products
-- the landing carousel shows, and in what order.
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES ('homeCarousel', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS image_assets_created_idx ON image_assets(created_at DESC);

-- Existing password accounts predate email verification and are grandfathered
-- as verified. The temporary default backfills only when the column is first
-- added; it is dropped immediately so every future password signup starts
-- unverified when email delivery is enabled.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ALTER COLUMN email_verified_at DROP DEFAULT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_previous_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_payload JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_after_cancel_at TIMESTAMPTZ;
-- Orders placed from a preview deployment run against Paystack test keys and
-- share this database with the live shop. Recording the mode keeps play money
-- out of the owner's revenue and out of the stock counts.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'live';
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'live';
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS local_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_mode_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_mode_check
  CHECK (payment_mode IN ('test', 'live'));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'payment_pending', 'payment_expired', 'paid', 'paid_after_cancel_review', 'processing', 'shipped', 'dispatched', 'delivered', 'refund_pending', 'cancelled'));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'review', 'refund_pending', 'refunded'));
ALTER TABLE payment_attempts DROP CONSTRAINT IF EXISTS payment_attempts_local_status_check;
ALTER TABLE payment_attempts ADD CONSTRAINT payment_attempts_local_status_check
  CHECK (local_status IN ('active', 'cancelled_by_customer', 'cancelled_by_owner', 'expired', 'superseded', 'closed', 'review_required'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_delivery_zone_check;

UPDATE users SET state = 'FCT', updated_at = NOW()
WHERE state IS NOT NULL AND (LOWER(state) LIKE '%abuja%' OR LOWER(state) LIKE '%federal capital%' OR LOWER(state) = 'fct');
UPDATE orders SET
  state = CASE
    WHEN delivery_zone = 'abuja'
      OR LOWER(state) LIKE '%abuja%'
      OR LOWER(state) LIKE '%federal capital%'
      OR LOWER(state) = 'fct'
    THEN 'FCT'
    ELSE state
  END,
  delivery_zone = CASE
    WHEN delivery_zone = 'abuja' THEN 'fct'
    WHEN delivery_zone = 'lagos' THEN 'outside_fct'
    ELSE delivery_zone
  END,
  status = CASE
    WHEN payment_status IN ('pending', 'failed', 'review')
      AND status IN ('paid', 'processing', 'shipped', 'dispatched', 'delivered')
    THEN 'payment_pending'
    ELSE status
  END,
  updated_at = NOW();

ALTER TABLE orders ADD CONSTRAINT orders_delivery_zone_check
  CHECK (delivery_zone IN ('fct', 'outside_fct', 'test'));

INSERT INTO payment_attempts (
  id, order_id, reference, access_code, status, transaction_id, channel,
  gateway_response, amount, currency, paid_at, payload, created_at, updated_at
)
SELECT
  'legacy-' || id, id, paystack_reference, paystack_access_code, payment_status,
  paystack_transaction_id, payment_channel, payment_gateway_response, total,
  currency, paid_at, paystack_payload, created_at, updated_at
FROM orders
WHERE paystack_reference IS NOT NULL
ON CONFLICT (reference) DO NOTHING;

-- Existing rows predate the split between Paystack's gateway status and the
-- site's local lifecycle. Close terminal attempts and preserve a customer's
-- cancellation without overwriting the raw gateway result.
UPDATE payment_attempts AS attempt
SET local_status = CASE
      WHEN attempt.status IN ('success', 'failed', 'abandoned', 'reversed') THEN 'closed'
      WHEN orders.status = 'cancelled' THEN 'cancelled_by_customer'
      ELSE attempt.local_status
    END,
    closed_at = CASE
      WHEN attempt.status IN ('success', 'failed', 'abandoned', 'reversed')
      THEN COALESCE(attempt.closed_at, attempt.updated_at)
      WHEN orders.status = 'cancelled'
      THEN COALESCE(attempt.closed_at, orders.cancelled_at, attempt.updated_at)
      ELSE attempt.closed_at
    END
FROM orders
WHERE orders.id = attempt.order_id
  AND attempt.local_status = 'active';

-- Correct the timestamp on terminal attempts backfilled by an older version of
-- this migration, which could have borrowed the order's later cancellation
-- time instead of the attempt's own last gateway update.
UPDATE payment_attempts
SET closed_at = updated_at
WHERE local_status = 'closed'
  AND status IN ('success', 'failed', 'abandoned', 'reversed')
  AND closed_at > updated_at + INTERVAL '1 second';

CREATE INDEX IF NOT EXISTS products_collection_idx ON products(collection_id, sort_order);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_reference_idx ON orders(paystack_reference);
CREATE INDEX IF NOT EXISTS payment_attempts_order_idx ON payment_attempts(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_attempts_reconcile_idx
  ON payment_attempts(payment_mode, created_at)
  WHERE local_status = 'active';
CREATE INDEX IF NOT EXISTS payment_attempts_gateway_watch_idx
  ON payment_attempts(payment_mode, created_at)
  WHERE local_status IN ('active', 'cancelled_by_customer', 'cancelled_by_owner');
CREATE INDEX IF NOT EXISTS payment_attempts_reconcile_due_idx
  ON payment_attempts(payment_mode, updated_at)
  WHERE local_status IN ('active', 'cancelled_by_customer', 'cancelled_by_owner');
CREATE INDEX IF NOT EXISTS orders_payment_mode_idx ON orders(payment_mode, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_challenges_lookup_idx
  ON auth_challenges(email, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_challenges_ip_idx
  ON auth_challenges(request_ip_hash, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS oauth_states_expiry_idx ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS auth_accounts_user_idx ON auth_accounts(user_id);
