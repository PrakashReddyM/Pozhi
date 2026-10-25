-- Migration 004: Add addresses table
-- Addresses were referenced in users.service.ts but never existed in the
-- original Supabase schema (dead code pointing at a missing table).
-- This migration creates the table fresh for the self-hosted PostgreSQL setup.

CREATE TABLE IF NOT EXISTS public.addresses (
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

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- At most one default address per user; partial so inactive rows do not count.
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default
  ON public.addresses(user_id) WHERE is_default AND is_active;

CREATE OR REPLACE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
