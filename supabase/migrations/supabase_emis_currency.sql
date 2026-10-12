-- ============================================================================
-- Per-EMI Currency
-- ============================================================================
-- Until now every amount was read in the ACCOUNT currency, so changing that
-- setting relabelled every loan. A USD education loan next to an INR home
-- loan could not be represented. Each EMI now carries its own currency.
--
-- Existing EMIs are STAMPED with their owner's current account currency
-- (INR when the owner never saved preferences) - exactly what they display
-- today, so nothing on screen changes. From then on the account currency only
-- picks the default for NEW EMIs and the dashboard's first tab; changing it no
-- longer relabels existing loans.
--
-- A BEFORE INSERT trigger fills a missing currency from the owner's account
-- currency, so a client that predates this column (an open tab on the old
-- build) still writes the right value instead of a blanket 'INR'.
--
-- Idempotent - safe to re-run in the SQL editor.
-- See context/plan/per-emi-currency-plan.md.
-- ============================================================================

-- ============================================================================
-- 1. COLUMN + BACKFILL
-- ============================================================================

ALTER TABLE public.emis
ADD COLUMN IF NOT EXISTS currency text;

-- Only rows still missing a currency, so a re-run never overwrites a currency
-- the user has since chosen.
UPDATE public.emis e
SET currency = COALESCE(
    (SELECT p.currency FROM public.user_account_preferences p WHERE p.user_id = e."userId"),
    'INR'
)
WHERE e.currency IS NULL;

-- ============================================================================
-- 2. DEFAULT FROM THE OWNER'S ACCOUNT CURRENCY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_emi_default_currency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.currency IS NULL THEN
        NEW.currency := COALESCE(
            (SELECT p.currency FROM public.user_account_preferences p WHERE p.user_id = NEW."userId"),
            'INR'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emis_default_currency ON public.emis;
CREATE TRIGGER trg_emis_default_currency
    BEFORE INSERT ON public.emis
    FOR EACH ROW
    EXECUTE FUNCTION public.set_emi_default_currency();

-- ============================================================================
-- 3. CONSTRAINTS
-- ============================================================================
-- Same shape as user_account_preferences.currency. NOT NULL is safe: the
-- backfill above filled every row and the trigger fills every new one.

ALTER TABLE public.emis
ALTER COLUMN currency SET NOT NULL;

ALTER TABLE public.emis
DROP CONSTRAINT IF EXISTS emis_currency_code;
ALTER TABLE public.emis
ADD CONSTRAINT emis_currency_code CHECK (currency ~ '^[A-Z]{3}$');

COMMENT ON COLUMN public.emis.currency IS
    'ISO 4217 code this loan is denominated in. Fixed per EMI; editing it relabels the amounts, never converts them. Defaults to the owner''s account currency.';

-- ============================================================================
-- 4. VERIFY
-- ============================================================================
-- Expected: no NULLs, and each EMI's currency equal to its owner's account
-- currency (INR where the owner has no preferences row).
--
--   SELECT e.currency, COUNT(*) AS emis,
--          COUNT(*) FILTER (WHERE e.currency <> COALESCE(p.currency, 'INR')) AS differs_from_account
--   FROM public.emis e
--   LEFT JOIN public.user_account_preferences p ON p.user_id = e."userId"
--   GROUP BY e.currency;
