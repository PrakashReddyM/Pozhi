-- ==========================================
-- Migration 002
-- H2: multi-image upload for Mini Albums & Photo Copies
--
-- Adds a join table so an order_item can carry an ordered set of uploads
-- instead of just the single legacy user_upload_id FK. Additive only —
-- order_items.user_upload_id is untouched (kept pointing at image #1) for
-- backward compatibility with any code still reading it directly.
--
-- Safe to re-run. Apply via Supabase Dashboard > SQL Editor
-- (see backend/DATABASE_DEPLOYMENT.md).
-- ==========================================

CREATE TABLE IF NOT EXISTS public.order_item_uploads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE NOT NULL,
  user_upload_id uuid REFERENCES public.user_uploads(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_position CHECK (position >= 0),
  CONSTRAINT uq_order_item_upload_position UNIQUE (order_item_id, position)
);

CREATE INDEX IF NOT EXISTS idx_order_item_uploads_order_item_id ON public.order_item_uploads(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_uploads_user_upload_id ON public.order_item_uploads(user_upload_id);

ALTER TABLE public.order_item_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own order item uploads" ON public.order_item_uploads;
CREATE POLICY "Users view own order item uploads"
ON public.order_item_uploads FOR SELECT
USING (
  order_item_id IN (
    SELECT oi.id FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.user_id = auth.uid()
  )
);

GRANT ALL ON public.order_item_uploads TO authenticated;
