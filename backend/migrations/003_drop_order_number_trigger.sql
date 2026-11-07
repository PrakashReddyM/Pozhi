-- ==========================================
-- Migration 003
-- Remove the database-side order_number generator.
--
-- The trigger overwrote every inserted order_number with
-- 'POZHI-YYYYMMDD-XXXXXX', while the application generates
-- 'LOS-YYYYMMDD-XXXX' and validateOrderNumber() accepts only the LOS- form.
-- Two generators competing for one column meant the number the API returned
-- could never pass the app's own validation.
--
-- The application keeps ownership: its format is the one already baked into
-- the WhatsApp templates and the order-tracking lookups.
--
-- Safe to re-run. Already reflected in db/init/01_schema.sql for fresh databases.
-- ==========================================

DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
DROP FUNCTION IF EXISTS public.generate_order_number();
