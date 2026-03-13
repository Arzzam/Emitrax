-- ============================================================================
-- Account Profile + Preferences Schema
-- ============================================================================
-- Adds user-facing account fields and private user preferences.
-- Safe to run multiple times.
-- ============================================================================

-- Keep share/discovery profile table lightweight and public-safe
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS display_name text;

-- Private account preferences (owner-only access)
CREATE TABLE IF NOT EXISTS public.user_account_preferences (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    phone text,
    avatar_url text,
    locale text NOT NULL DEFAULT 'en-IN',
    currency text NOT NULL DEFAULT 'INR',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_account_preferences_currency_code CHECK (currency ~ '^[A-Z]{3}$')
);

ALTER TABLE public.user_account_preferences
DROP COLUMN IF EXISTS dashboard_filters;

ALTER TABLE public.user_account_preferences
DROP COLUMN IF EXISTS timezone;

-- Helpful index for regional preference lookups/reporting in future
CREATE INDEX IF NOT EXISTS idx_user_account_preferences_currency ON public.user_account_preferences (currency);

-- Ensure policies are enforced
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own account preferences" ON public.user_account_preferences;
CREATE POLICY "Users can view own account preferences"
    ON public.user_account_preferences
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own account preferences" ON public.user_account_preferences;
CREATE POLICY "Users can insert own account preferences"
    ON public.user_account_preferences
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own account preferences" ON public.user_account_preferences;
CREATE POLICY "Users can update own account preferences"
    ON public.user_account_preferences
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_user_account_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_account_preferences_updated_at ON public.user_account_preferences;
CREATE TRIGGER update_user_account_preferences_updated_at
    BEFORE UPDATE ON public.user_account_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_account_preferences_updated_at();
