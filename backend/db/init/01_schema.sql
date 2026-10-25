-- ==========================================
-- POZHI PHOTOGRAPHY STUDIO - DATABASE SCHEMA (PLAIN POSTGRESQL)
--
-- GENERATED FILE - do not edit by hand.
-- Source: backend/pozhi_schema.sql, converted for a self-hosted PostgreSQL
-- server. Differences from the Supabase version:
--   * profiles is the identity table; its id no longer references auth.users,
--     and it carries password_hash / google_sub itself.
--   * Row Level Security and all policies are dropped. They relied on
--     auth.uid(), which does not exist outside Supabase, and are redundant
--     now that the Express backend is the only database client.
--   * Grants to the anon / authenticated / service_role roles are dropped.
--   * Adds the session and token tables Supabase Auth used to provide.
--
-- The Postgres Docker image runs every .sql in this directory, in filename
-- order, the first time the data volume is created.
-- ==========================================

-- 1. RESET & EXTENSIONS
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT ALL ON SCHEMA public TO public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- 2. USER PROFILES & AUTHENTICATION
-- ==========================================

CREATE TABLE public.profiles (
  -- Identity lives here now. Supabase's auth.users is gone, so this table owns
  -- the credential columns as well as the profile ones.
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text DEFAULT 'customer' NOT NULL, -- Added to support RBAC (admin/customer)
  avatar_url text, -- Added for consistency with implementation details

  -- Credentials (replaces auth.users)
  -- password_hash is NULL for accounts that only ever signed in with Google
  -- or a passkey; at least one sign-in method must exist for a usable account.
  password_hash text,
  google_sub text UNIQUE,             -- Google OAuth "sub" claim
  
  -- Account Status
  is_active boolean DEFAULT true,
  is_banned boolean DEFAULT false, -- Explicit ban flag
  is_email_verified boolean DEFAULT false,
  is_phone_verified boolean DEFAULT false,
  
  -- Security
  failed_login_attempts integer DEFAULT 0,
  last_failed_login timestamp with time zone,
  account_locked_until timestamp with time zone,
  
  -- Activity
  last_login_at timestamp with time zone,
  last_active_at timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT valid_role CHECK (role IN ('customer', 'admin', 'moderator'))
);

-- ==========================================
-- 2.1 PASSKEY CREDENTIALS (WEBAUTHN/FIDO2)
-- ==========================================

CREATE TABLE public.passkey_credentials (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- WebAuthn Credential Data
  credential_id text UNIQUE NOT NULL,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,

  -- Credential Metadata
  transports text[],
  device_type text NOT NULL DEFAULT 'singleDevice',
  backed_up boolean NOT NULL DEFAULT false,
  aaguid text,

  -- User-Friendly
  friendly_name text NOT NULL DEFAULT 'My Passkey',

  -- Lifecycle
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT valid_device_type CHECK (device_type IN ('singleDevice', 'multiDevice'))
);

-- ==========================================
-- 2.2 SECURITY LOGGING (CRITICAL FOR MONITORING)
-- ==========================================

CREATE TABLE public.security_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type text NOT NULL, -- 'login_failed', 'signup_success', etc.
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address text NOT NULL,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical', 'warning')) DEFAULT 'low',
  blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for security monitoring
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_security_events_severity ON security_events(severity);

-- ==========================================
-- 3. SERVICE PRICING TABLES (FRONTEND DYNAMIC)
-- ==========================================

-- 3.1 PASSPHOTO PRICING
CREATE TABLE public.passphoto_categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id text UNIQUE NOT NULL,  -- 'passport', 'visa', 'stamp'
  label text NOT NULL,               -- 'Passport Size'
  columns integer NOT NULL,          -- Grid layout
  rows integer NOT NULL,
  aspect_label text NOT NULL,        -- '35 × 45 mm'
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.passphoto_packs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id uuid REFERENCES public.passphoto_categories(id) ON DELETE CASCADE NOT NULL,
  pack_id text UNIQUE NOT NULL,      -- 'p-8', 'v-6', etc.
  label text NOT NULL,                -- '8 + 2 Copies'
  copies integer NOT NULL,
  price decimal(10,2) NOT NULL,
  description text,                   -- Optional: 'Combo Pack'
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3.2 PHOTO COPIES PRICING
CREATE TABLE public.photocopies_single (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  option_id text UNIQUE NOT NULL,     -- 'single-6x4'
  size_label text NOT NULL,           -- '6 × 4 inches'
  size_key text NOT NULL,             -- '6x4'
  copies_text text NOT NULL,          -- '2 Copies Pack'
  price decimal(10,2) NOT NULL,
  aspect_ratio text NOT NULL,         -- '6/4'
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.photocopies_set (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  set_id text UNIQUE NOT NULL,        -- 'set-6x4'
  size_label text NOT NULL,           -- '6 × 4 inches (Set of 2)'
  size_key text NOT NULL,             -- '6x4'
  price_per_piece decimal(10,2) NOT NULL,
  aspect_ratio text NOT NULL,
  copies_per_unit integer NOT NULL,   -- CRITICAL: 1 unit = 2 copies
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.3 FRAMES PRICING
CREATE TABLE public.frame_materials (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  material_id text UNIQUE NOT NULL,   -- 'glass', 'lamination'
  label text NOT NULL,                -- 'Glass Frame'
  description text NOT NULL,          -- 'Glossy Finish'
  display_order integer NOT NULL,
  is_active boolean DEFAULT true
);

CREATE TABLE public.frame_sizes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  size_id text UNIQUE NOT NULL,       -- '4x6', '12x10', etc.
  size_label text NOT NULL,           -- '4 × 6 inches'
  dimensions text NOT NULL,           -- '4x6'
  price decimal(10,2) NOT NULL,       -- Same for both materials
  aspect_ratio text NOT NULL,         -- '2/3'
  orientation text NOT NULL,          -- 'portrait' or 'landscape'
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  CONSTRAINT valid_orientation CHECK (orientation IN ('portrait', 'landscape'))
);

-- 3.4 ALBUM PRICING
CREATE TABLE public.album_capacities (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  capacity_id text UNIQUE NOT NULL,   -- 'alb-40', 'alb-60', etc.
  label text NOT NULL,                -- '40 Images'
  images integer NOT NULL,            -- 40, 60, 80, 100
  price decimal(10,2) NOT NULL,
  display_order integer NOT NULL,
  is_active boolean DEFAULT true
);

-- 3.5 SNAP N' PRINT PRICING
CREATE TABLE public.snapnprint_categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id text UNIQUE NOT NULL,   -- 'individual', 'family'
  label text NOT NULL,                 -- 'Individual'
  description text,                    -- '1 Person'
  display_order integer NOT NULL,
  is_active boolean DEFAULT true
);

CREATE TABLE public.snapnprint_packages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id uuid REFERENCES public.snapnprint_categories(id) ON DELETE CASCADE NOT NULL,
  package_id text UNIQUE NOT NULL,    -- 'ind-16', 'fam-8'
  label text NOT NULL,                -- '16 Copies'
  price decimal(10,2) NOT NULL,
  display_order integer NOT NULL,
  is_active boolean DEFAULT true
);

-- ==========================================
-- 4. SMART STORAGE (SUPABASE + CLOUDFLARE R2)
-- ==========================================

CREATE TABLE public.user_uploads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- SMART STORAGE LOGIC
  storage_provider text NOT NULL,     -- 'supabase' or 'cloudflare_r2'
  storage_url text NOT NULL,          -- The accessible URL
  storage_path text NOT NULL,         -- Internal bucket path
  
  -- FILE METADATA
  original_filename text NOT NULL,
  sanitized_filename text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL,    -- Original size
  
  -- IMAGE SPECIFICATIONS
  width integer,
  height integer,
  aspect_ratio decimal(10,6),
  
  -- PROCESSING
  processing_status text DEFAULT 'pending',
  is_approved boolean DEFAULT false,
  
  -- ANALYTICS & LIFECYCLE
  used_in_orders integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT valid_storage CHECK (storage_provider IN ('supabase', 'cloudflare_r2')),
  CONSTRAINT valid_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Storage usage tracking per user
CREATE TABLE public.storage_metrics (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  supabase_storage_used bigint DEFAULT 0,
  cloudflare_storage_used bigint DEFAULT 0,
  total_storage_used bigint DEFAULT 0,
  total_files integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 5. ORDERS & BOOKINGS
-- ==========================================

CREATE TABLE public.orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  
  -- Order Details
  service_type text NOT NULL,         -- 'PassPhoto', 'PhotoCopies', 'Frames', 'Album', 'SnapnPrint'
  total_amount decimal(10,2) NOT NULL,
  gift_wrap boolean DEFAULT false,
  gift_wrap_charge decimal(10,2) DEFAULT 30.00,
  delivery_charge decimal(10,2) NOT NULL DEFAULT 0,   -- Free above the threshold, resolved server-side
  
  -- Customer Information
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text,              -- Concatenated form of the address_* fields below
  address_house text,
  address_street text,
  address_landmark text,
  address_city text,
  address_state text,
  address_pincode text,
  event_date date,                    -- For Snap n' Print bookings
  
  -- Payment
  payment_status text DEFAULT 'pending',
  payment_method text,                -- 'upi', 'card', etc.
  upi_transaction_id text,
  
  -- Status
  order_status text NOT NULL DEFAULT 'pending',

  -- Fulfilment (accepted by updateOrderStatusSchema)
  tracking_number text,
  courier_service text,
  internal_notes text,
  cancellation_reason text,

  -- Customer feedback (written by submitFeedback)
  feedback_rating integer CHECK (feedback_rating IS NULL OR feedback_rating BETWEEN 1 AND 5),
  feedback_comment text,

  -- Metadata
  ip_address inet,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT valid_service CHECK (service_type IN ('PassPhoto', 'PhotoCopies', 'Frames', 'Album', 'SnapnPrint')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  CONSTRAINT valid_order_status CHECK (order_status IN ('pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled')),
  CONSTRAINT orders_address_pincode_format CHECK (address_pincode IS NULL OR address_pincode ~ '^[1-9][0-9]{5}$')
);

CREATE TABLE public.order_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  
  -- Service-Specific References
  passphoto_pack_id uuid REFERENCES public.passphoto_packs(id),
  photocopies_single_id uuid REFERENCES public.photocopies_single(id),
  photocopies_set_id uuid REFERENCES public.photocopies_set(id),
  frame_size_id uuid REFERENCES public.frame_sizes(id),
  frame_material text,                -- 'glass' or 'lamination'
  album_capacity_id uuid REFERENCES public.album_capacities(id),
  snapnprint_package_id uuid REFERENCES public.snapnprint_packages(id),
  
  -- Uploaded Images (if applicable)
  user_upload_id uuid REFERENCES public.user_uploads(id),
  
  -- Pricing Snapshot (at time of order)
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  
  -- Item Details (JSON snapshot)
  item_details jsonb NOT NULL,        -- Store full product details at order time
  
  created_at timestamp with time zone DEFAULT now()
);

-- 5.1 Order Item Uploads (multi-image support — H2)
-- One row per image attached to an order_item, ordered by `position`.
-- order_items.user_upload_id is kept pointing at image #1 for backward
-- compatibility with code that only ever read the single-upload FK.
CREATE TABLE public.order_item_uploads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE NOT NULL,
  user_upload_id uuid REFERENCES public.user_uploads(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_position CHECK (position >= 0),
  CONSTRAINT uq_order_item_upload_position UNIQUE (order_item_id, position)
);

-- ==========================================
-- 6. ADDITIONAL FEATURES
-- ==========================================

-- 6.1 Gift Wrap Settings (Admin Configurable)
CREATE TABLE public.settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default gift wrap price
INSERT INTO public.settings (setting_key, setting_value, description) VALUES
('gift_wrap_price', '30', 'Gift wrapping charge in rupees');

-- 6.2 Audit Logs
CREATE TABLE public.audit_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 7. FUNCTIONS & TRIGGERS
-- ==========================================

-- 7.1 Order Number Generator - REMOVED
-- order_number is generated by the application (createOrder), in the
-- 'LOS-YYYYMMDD-XXXX' form that validateOrderNumber() expects. A BEFORE INSERT
-- trigger used to overwrite it with a different 'POZHI-' format, so the number
-- the API returned never matched the format the rest of the code validated.

-- 7.2 Storage Metrics Update
CREATE OR REPLACE FUNCTION update_storage_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO storage_metrics (
    user_id, 
    supabase_storage_used, 
    cloudflare_storage_used, 
    total_storage_used, 
    total_files
  )
  SELECT 
    NEW.user_id,
    COALESCE(SUM(CASE WHEN storage_provider = 'supabase' THEN file_size_bytes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN storage_provider = 'cloudflare_r2' THEN file_size_bytes ELSE 0 END), 0),
    COALESCE(SUM(file_size_bytes), 0),
    COUNT(*)
  FROM user_uploads
  WHERE user_id = NEW.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    supabase_storage_used = EXCLUDED.supabase_storage_used,
    cloudflare_storage_used = EXCLUDED.cloudflare_storage_used,
    total_storage_used = EXCLUDED.total_storage_used,
    total_files = EXCLUDED.total_files,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_storage_on_upload
AFTER INSERT OR UPDATE OR DELETE ON user_uploads
FOR EACH ROW EXECUTE FUNCTION update_storage_metrics();

-- 7.3 Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- 8. INDEXES (PERFORMANCE)
-- ==========================================

-- Core indexes
CREATE INDEX idx_uploads_user_id ON user_uploads(user_id);
CREATE INDEX idx_uploads_storage_provider ON user_uploads(storage_provider);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_item_uploads_order_item_id ON order_item_uploads(order_item_id);
CREATE INDEX idx_order_item_uploads_user_upload_id ON order_item_uploads(user_upload_id);

-- Passkey indexes
CREATE INDEX idx_passkey_user_id ON passkey_credentials(user_id);
CREATE INDEX idx_passkey_credential_id ON passkey_credentials(credential_id);

-- Pricing table indexes
CREATE INDEX idx_passphoto_packs_category ON passphoto_packs(category_id);
CREATE INDEX idx_snapnprint_packages_category ON snapnprint_packages(category_id);

-- ==========================================
-- 10. SEED DATA (INITIAL PRICING)
-- ==========================================

-- PassPhoto Categories
INSERT INTO passphoto_categories (category_id, label, columns, rows, aspect_label, display_order) VALUES
('passport', 'Passport Size', 4, 2, '35 × 45 mm', 1),
('visa', 'Visa Size', 3, 2, '51 × 51 mm', 2),
('stamp', 'Stamp Size', 4, 2, '25 × 30 mm', 3);

-- PassPhoto Packs
INSERT INTO passphoto_packs (category_id, pack_id, label, copies, price, display_order) VALUES
((SELECT id FROM passphoto_categories WHERE category_id = 'passport'), 'p-8', '8 + 2 Copies', 10, 120.00, 1),
((SELECT id FROM passphoto_categories WHERE category_id = 'passport'), 'p-16', '16 Copies', 16, 189.00, 2),
((SELECT id FROM passphoto_categories WHERE category_id = 'passport'), 'p-24', '24 Copies', 24, 239.00, 3),
((SELECT id FROM passphoto_categories WHERE category_id = 'passport'), 'p-32', '32 Copies', 32, 349.00, 4),
((SELECT id FROM passphoto_categories WHERE category_id = 'passport'), 'p-64', '64 Copies', 64, 499.00, 5),
((SELECT id FROM passphoto_categories WHERE category_id = 'visa'), 'v-6', '6 Copies', 6, 120.00, 1),
((SELECT id FROM passphoto_categories WHERE category_id = 'visa'), 'v-12', '12 Copies', 12, 199.00, 2),
((SELECT id FROM passphoto_categories WHERE category_id = 'stamp'), 's-8', '8 Copies', 8, 99.00, 1),
((SELECT id FROM passphoto_categories WHERE category_id = 'stamp'), 's-16', '16 Copies', 16, 159.00, 2),
((SELECT id FROM passphoto_categories WHERE category_id = 'stamp'), 's-combo', 'Combo Pack', 10, 120.00, 3);

-- PhotoCopies Single
INSERT INTO photocopies_single (option_id, size_label, size_key, copies_text, price, aspect_ratio, display_order) VALUES
('single-6x4', '6 × 4 inches', '6x4', '2 Copies Pack', 100.00, '6/4', 1),
('single-6x8', '6 × 8 inches', '6x8', '1 Copy', 100.00, '6/8', 2),
('single-8x12', '8 × 12 inches', '8x12', '1 Large Copy', 200.00, '8/12', 3);

-- PhotoCopies Set
INSERT INTO photocopies_set (set_id, size_label, size_key, price_per_piece, aspect_ratio, copies_per_unit, display_order) VALUES
('set-6x4', '6 × 4 inches (Set of 2)', '6x4', 99.00, '6/4', 2, 1),
('set-6x8', '6 × 8 inches', '6x8', 99.00, '6/8', 1, 2);

-- Frame Materials
INSERT INTO frame_materials (material_id, label, description, display_order) VALUES
('glass', 'Glass Frame', 'Glossy Finish', 1),
('lamination', 'Lamination Frame', 'Matte Finish', 2);

-- Frame Sizes
INSERT INTO frame_sizes (size_id, size_label, dimensions, price, aspect_ratio, orientation, display_order) VALUES
('4x6', '4 × 6 inches', '4x6', 149.00, '2/3', 'portrait', 1),
('6x8', '6 × 8 inches', '6x8', 249.00, '3/4', 'portrait', 2),
('8x12', '8 × 12 inches', '8x12', 449.00, '2/3', 'portrait', 3),
('12x10', '12 × 10 inches', '12x10', 449.00, '6/5', 'landscape', 4),
('10x15', '10 × 15 inches', '10x15', 549.00, '2/3', 'portrait', 5),
('12x15', '12 × 15 inches', '12x15', 649.00, '4/5', 'portrait', 6),
('12x18', '12 × 18 inches', '12x18', 849.00, '2/3', 'portrait', 7);

-- Album Capacities
INSERT INTO album_capacities (capacity_id, label, images, price, display_order) VALUES
('alb-40', '40 Images', 40, 1499.00, 1),
('alb-60', '60 Images', 60, 1999.00, 2),
('alb-80', '80 Images', 80, 2499.00, 3),
('alb-100', '100 Images', 100, 2999.00, 4);

-- Snap n' Print Categories
INSERT INTO snapnprint_categories (category_id, label, description, display_order) VALUES
('individual', 'Individual', '1 Person', 1),
('family', 'Family', '4 Members', 2);

-- Snap n' Print Packages
INSERT INTO snapnprint_packages (category_id, package_id, label, price, display_order) VALUES
((SELECT id FROM snapnprint_categories WHERE category_id = 'individual'), 'ind-16', '16 Copies', 319.00, 1),
((SELECT id FROM snapnprint_categories WHERE category_id = 'individual'), 'ind-24', '24 Copies', 419.00, 2),
((SELECT id FROM snapnprint_categories WHERE category_id = 'family'), 'fam-8', '8 Copies', 549.00, 1),
((SELECT id FROM snapnprint_categories WHERE category_id = 'family'), 'fam-16', '16 Copies', 799.00, 2);

-- ==========================================
-- 9. SESSIONS & AUTH TOKENS
-- Replaces what Supabase Auth managed for us. The backend issues a short-lived
-- access JWT plus one row here per long-lived refresh token, so a session can
-- be revoked server-side (log out, ban, password change).
-- ==========================================

CREATE TABLE public.refresh_tokens (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Only ever store a hash: a leaked table must not yield usable sessions.
  token_hash text UNIQUE NOT NULL,

  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,

  -- Context, for showing the customer their active sessions
  user_agent text,
  ip_address text,

  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_used_at timestamp with time zone
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Single-use tokens for email verification and password reset. Same rule:
-- hashed at rest, single use, short expiry.
CREATE TABLE public.auth_tokens (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  purpose text NOT NULL,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT valid_purpose CHECK (purpose IN ('email_verification', 'password_reset'))
);

CREATE INDEX idx_auth_tokens_user_purpose ON auth_tokens(user_id, purpose);
CREATE INDEX idx_auth_tokens_expires_at ON auth_tokens(expires_at);

-- WebAuthn registration/authentication challenges. Supabase was not holding
-- these for us, but they currently live in memory, which breaks across restarts
-- and across more than one backend process.
CREATE TABLE public.webauthn_challenges (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text,
  challenge text NOT NULL,
  purpose text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT valid_webauthn_purpose CHECK (purpose IN ('registration', 'authentication'))
);

CREATE INDEX idx_webauthn_challenges_expires_at ON webauthn_challenges(expires_at);

-- ==========================================
-- 10. SAVED ADDRESSES (address book)
-- Queried by api/users; soft-deleted via is_active.
-- ==========================================

CREATE TABLE public.addresses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  label text NOT NULL,                -- 'Home', 'Office'
  recipient_name text NOT NULL,
  phone text NOT NULL,

  street_line1 text NOT NULL,
  street_line2 text,
  landmark text,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  country text NOT NULL DEFAULT 'India',

  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,     -- soft delete

  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT addresses_zip_format CHECK (zip_code ~ '^[1-9][0-9]{5}$')
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
-- At most one default address per user; partial so inactive rows do not count.
CREATE UNIQUE INDEX idx_addresses_one_default
  ON addresses(user_id) WHERE is_default AND is_active;

CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
