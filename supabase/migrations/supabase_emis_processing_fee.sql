-- ============================================================================
-- Add optional processing fee fields to emis
-- ============================================================================
-- Safe to run multiple times.
-- ============================================================================

ALTER TABLE public.emis
ADD COLUMN IF NOT EXISTS "processingFee" numeric(15, 2);

ALTER TABLE public.emis
ADD COLUMN IF NOT EXISTS "processingFeeGst" numeric(5, 2);

COMMENT ON COLUMN public.emis."processingFee" IS 'Optional one-time processing fee charged at loan origination.';
COMMENT ON COLUMN public.emis."processingFeeGst" IS 'Optional GST rate (%) applied to the one-time processing fee.';
