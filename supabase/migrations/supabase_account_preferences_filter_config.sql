-- ============================================================================
-- Add filter_config to user_account_preferences
-- ============================================================================
-- Store as text: JSON.stringify on write, JSON.parse on read (best practice).
-- Safe to run multiple times.
-- ============================================================================

ALTER TABLE public.user_account_preferences
ADD COLUMN IF NOT EXISTS filter_config text DEFAULT NULL;

COMMENT ON COLUMN public.user_account_preferences.filter_config IS 'JSON string of advanced filter state (stringify on write, parse on read).';
