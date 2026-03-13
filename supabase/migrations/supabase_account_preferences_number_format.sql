-- ============================================================================
-- Add number_format to user_account_preferences
-- ============================================================================
-- Safe to run multiple times.
-- ============================================================================

ALTER TABLE public.user_account_preferences
ADD COLUMN IF NOT EXISTS number_format text NOT NULL DEFAULT 'exact';

ALTER TABLE public.user_account_preferences
DROP CONSTRAINT IF EXISTS user_account_preferences_number_format_check;

ALTER TABLE public.user_account_preferences
ADD CONSTRAINT user_account_preferences_number_format_check
CHECK (number_format IN ('exact', 'compact_short', 'compact_long'));
