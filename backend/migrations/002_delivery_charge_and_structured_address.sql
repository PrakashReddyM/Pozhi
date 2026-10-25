-- ==========================================
-- Migration 001
-- E3: per-order delivery charge
-- E4: structured delivery address
--
-- Safe to re-run. Apply via Supabase Dashboard > SQL Editor
-- (see backend/DATABASE_DEPLOYMENT.md).
-- ==========================================

-- ------------------------------------------
-- E3: delivery charge
-- Resolved server-side in orders.controller.ts (createOrder):
-- item subtotal > 199 -> 0, otherwise 30. Gift wrap does not
-- count towards the threshold.
-- ------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_charge decimal(10,2) NOT NULL DEFAULT 0;

-- ------------------------------------------
-- E4: structured delivery address
-- delivery_address is kept and still holds the concatenated string so the
-- admin portal and WhatsApp templates keep working unchanged.
-- ------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS address_house    text,
  ADD COLUMN IF NOT EXISTS address_street   text,
  ADD COLUMN IF NOT EXISTS address_landmark text,
  ADD COLUMN IF NOT EXISTS address_city     text,
  ADD COLUMN IF NOT EXISTS address_state    text,
  ADD COLUMN IF NOT EXISTS address_pincode  text;

-- Nullable so orders placed before this migration stay valid.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_address_pincode_format'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_address_pincode_format
      CHECK (address_pincode IS NULL OR address_pincode ~ '^[1-9][0-9]{5}$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_address_pincode
  ON public.orders(address_pincode);
