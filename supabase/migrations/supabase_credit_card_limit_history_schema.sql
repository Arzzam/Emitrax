-- ============================================================================
-- Credit Card Limit History Schema
-- ============================================================================
-- A credit limit is not a property of a card, it is a property of a card AT A
-- TIME. Banks raise limits routinely, and cc_cards."creditLimit" holds only the
-- latest one.
--
-- Without history, one limit increase silently restates every earlier month's
-- utilisation - and restates it DOWNWARD, which is the dangerous direction. A
-- card that genuinely ran at 70% last April would render as 44% after a limit
-- bump, with nothing on screen to say the figure had moved.
--
-- This is the same rule the bill tracker already enforces with per-row
-- "statementDate" / "dueDate": the historical record keeps what was actually in
-- force. This script applies that rule to the limit.
--
-- cc_cards."creditLimit" is DELIBERATELY KEPT, and keeps its meaning: the
-- CURRENT limit. It is a denormalised cache of "the latest change as of today",
-- maintained by the app on every history write, so aggregateBillsByIssuer and
-- the existing bill summary gauge keep working untouched.
--
-- Idempotent - safe to re-run in the SQL editor.
-- ============================================================================

-- ============================================================================
-- 1. LIMIT CHANGES (one row per card per effective date)
-- ============================================================================
-- "effectiveFrom" is a REAL DATE, not a month bucket. Every other date column
-- in the cc_* family is pinned to the 1st with a CHECK; this one deliberately
-- is not, because a limit changes on the day the bank changed it.
--
-- The EARLIEST row for a card is treated by the app as the limit in force for
-- everything before it too - see §5.2 of
-- context/plan/credit-card-management-and-utilisation-plan.md. Otherwise a user
-- who records only "raised to 4L on 1 Sep" would blank Apr-Aug entirely.
--
-- A future-dated row is allowed: it applies from its date, affects no past
-- month, and does not touch the current limit on cc_cards.

CREATE TABLE IF NOT EXISTS public.cc_card_limit_changes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "cardId" uuid NOT NULL,
    "effectiveFrom" date NOT NULL,
    "creditLimit" numeric(14, 2) NOT NULL,
    note text,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT cc_card_limit_changes_pkey PRIMARY KEY (id),
    CONSTRAINT cc_card_limit_changes_userid_fkey FOREIGN KEY ("userId")
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT cc_card_limit_changes_cardid_fkey FOREIGN KEY ("cardId")
        REFERENCES public.cc_cards(id) ON DELETE CASCADE,
    -- Guards the divide in the utilisation calc at the source. The app guards
    -- too, but a limit of 0 must never be storable in the first place.
    CONSTRAINT cc_card_limit_changes_limit_positive
        CHECK ("creditLimit" > 0),
    -- Upsert conflict target. Two changes on one date are one change.
    CONSTRAINT cc_card_limit_changes_unique_card_effective_from
        UNIQUE ("cardId", "effectiveFrom")
);

COMMENT ON TABLE public.cc_card_limit_changes IS
    'Dated credit-limit history per card. The earliest row is treated as the limit in force for all earlier dates. cc_cards."creditLimit" remains the current limit.';
COMMENT ON COLUMN public.cc_card_limit_changes."effectiveFrom" IS
    'The date the limit took effect. A real date, NOT a month bucket - unlike every other date column in the cc_* family.';
COMMENT ON COLUMN public.cc_card_limit_changes."creditLimit" IS
    'The limit from "effectiveFrom" onward, until superseded by a later row. Constrains outstanding at a point in time, never an annual total.';

CREATE INDEX IF NOT EXISTS idx_cc_card_limit_changes_card_effective_from
    ON public.cc_card_limit_changes("cardId", "effectiveFrom");
CREATE INDEX IF NOT EXISTS idx_cc_card_limit_changes_user_id
    ON public.cc_card_limit_changes("userId");

-- ============================================================================
-- 2. UPDATED AT TRIGGER
-- ============================================================================
-- Reuses the shared function from supabase_credit_card_tracker_schema.sql.

DROP TRIGGER IF EXISTS trg_cc_card_limit_changes_updated_at ON public.cc_card_limit_changes;
CREATE TRIGGER trg_cc_card_limit_changes_updated_at
    BEFORE UPDATE ON public.cc_card_limit_changes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_cc_updated_at();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
-- Identical shape to cc_bill_entries: own userId AND ownership of the parent
-- card, so a row can never be attached to another user's card.

ALTER TABLE public.cc_card_limit_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own card limit changes" ON public.cc_card_limit_changes;
CREATE POLICY "Users can view own card limit changes"
    ON public.cc_card_limit_changes
    FOR SELECT
    USING ("userId" = auth.uid());

DROP POLICY IF EXISTS "Users can insert own card limit changes" ON public.cc_card_limit_changes;
CREATE POLICY "Users can insert own card limit changes"
    ON public.cc_card_limit_changes
    FOR INSERT
    WITH CHECK (
        "userId" = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cc_cards c
            WHERE c.id = cc_card_limit_changes."cardId"
            AND c."userId" = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own card limit changes" ON public.cc_card_limit_changes;
CREATE POLICY "Users can update own card limit changes"
    ON public.cc_card_limit_changes
    FOR UPDATE
    USING ("userId" = auth.uid())
    WITH CHECK (
        "userId" = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cc_cards c
            WHERE c.id = cc_card_limit_changes."cardId"
            AND c."userId" = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own card limit changes" ON public.cc_card_limit_changes;
CREATE POLICY "Users can delete own card limit changes"
    ON public.cc_card_limit_changes
    FOR DELETE
    USING ("userId" = auth.uid());

-- ============================================================================
-- 4. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_card_limit_changes TO authenticated;

-- ============================================================================
-- 5. BACKFILL
-- ============================================================================
-- Every card that already carries a limit gets an opening history row, dated
-- from when the card record was created.
--
-- Load-bearing: without it, every pre-existing card resolves to "no limit" the
-- moment the app reads history instead of the column, and the whole utilisation
-- view comes up empty for existing data.
--
-- ON CONFLICT DO NOTHING makes the re-run a no-op, and specifically will not
-- overwrite a limit the user has since corrected by hand.

INSERT INTO public.cc_card_limit_changes ("userId", "cardId", "effectiveFrom", "creditLimit", note)
SELECT
    c."userId",
    c.id,
    COALESCE(c."createdAt"::date, CURRENT_DATE),
    c."creditLimit",
    'Opening limit (backfilled)'
FROM public.cc_cards c
WHERE c."creditLimit" IS NOT NULL
ON CONFLICT ("cardId", "effectiveFrom") DO NOTHING;

-- ============================================================================
-- 6. VERIFY
-- ============================================================================
-- Expected: one row per card holding a limit, and every "creditLimit" on
-- cc_cards matching the latest change at or before today.
--
--   SELECT c.name, c."creditLimit" AS current_limit,
--          l."effectiveFrom", l."creditLimit" AS history_limit
--   FROM public.cc_cards c
--   LEFT JOIN public.cc_card_limit_changes l ON l."cardId" = c.id
--   ORDER BY c.name, l."effectiveFrom";
