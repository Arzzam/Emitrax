-- ============================================================================
-- Credit Card Bill / Statement Tracker Schema
-- ============================================================================
-- Tracks what each card BILLED, per month, per financial year (Apr - Mar),
-- alongside the existing payment tracker (cc_payment_entries).
--
-- Domain note: a bill is filed under the month its STATEMENT WAS GENERATED.
-- A statement generated 15 Aug covering 16 Jul - 15 Aug belongs to Aug, and is
-- normally settled by a payment in Sep. Bill month N therefore maps to payment
-- month N+1 in the general case - the two tables must NEVER be joined on their
-- month columns, which is why this one is "statementMonth" and not
-- "periodMonth".
--
-- Bills and payments are NOT directly comparable: a revolved balance is billed
-- again next month with interest, so twelve bills do not sum to annual spend.
--
-- Idempotent - safe to re-run in the SQL editor.
-- ============================================================================

-- ============================================================================
-- 1. BILLING CYCLE FIELDS ON CARDS (additive)
-- ============================================================================
-- Defaults only. Every bill row stores its own dates, because banks change
-- cycle dates mid-year and historical rows must keep the dates that were
-- actually in force.

ALTER TABLE public.cc_cards
    ADD COLUMN IF NOT EXISTS "statementDay" integer;

ALTER TABLE public.cc_cards
    ADD COLUMN IF NOT EXISTS "dueDay" integer;

ALTER TABLE public.cc_cards
    ADD COLUMN IF NOT EXISTS "creditLimit" numeric(14, 2);

COMMENT ON COLUMN public.cc_cards."statementDay" IS
    'Day of month the statement is generated (1-31). Clamped to the month length by the app.';
COMMENT ON COLUMN public.cc_cards."dueDay" IS
    'Day of month the payment is due (1-31). When dueDay <= statementDay the due date falls in the FOLLOWING month.';
COMMENT ON COLUMN public.cc_cards."creditLimit" IS
    'Total credit limit. Informational only - it constrains outstanding at a point in time, never an annual total.';

-- ADD CONSTRAINT has no IF NOT EXISTS, so drop-then-add is the idempotent form.
ALTER TABLE public.cc_cards DROP CONSTRAINT IF EXISTS cc_cards_statement_day_range;
ALTER TABLE public.cc_cards ADD CONSTRAINT cc_cards_statement_day_range
    CHECK ("statementDay" IS NULL OR ("statementDay" >= 1 AND "statementDay" <= 31));

ALTER TABLE public.cc_cards DROP CONSTRAINT IF EXISTS cc_cards_due_day_range;
ALTER TABLE public.cc_cards ADD CONSTRAINT cc_cards_due_day_range
    CHECK ("dueDay" IS NULL OR ("dueDay" >= 1 AND "dueDay" <= 31));

ALTER TABLE public.cc_cards DROP CONSTRAINT IF EXISTS cc_cards_credit_limit_positive;
ALTER TABLE public.cc_cards ADD CONSTRAINT cc_cards_credit_limit_positive
    CHECK ("creditLimit" IS NULL OR "creditLimit" > 0);

-- ============================================================================
-- 2. BILL ENTRIES (one row per card per statement month)
-- ============================================================================
-- Three distinct states, deliberately:
--   row absent                          -> not entered yet
--   status = 'no_statement'             -> the bank generated no statement
--   status = 'issued', "totalDue" = 0   -> a statement was generated, for zero
--
-- A 'no_statement' row carries information and is therefore NEVER deleted as
-- "empty", unlike a cleared 'issued' row.
--
-- "totalDue" may be NEGATIVE: an overpayment or a large refund produces a
-- genuine credit-balance statement.
--
-- There is deliberately NO constraint that "statementDate" falls inside
-- "statementMonth". Banks sometimes label a 1-Aug statement as July's, and the
-- grid has no per-cell error surface - so that is a UI warning instead.

CREATE TABLE IF NOT EXISTS public.cc_bill_entries (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "cardId" uuid NOT NULL,
    "statementMonth" date NOT NULL,
    status text NOT NULL DEFAULT 'issued',
    "totalDue" numeric(14, 2),
    "minimumDue" numeric(14, 2),
    "statementDate" date,
    "dueDate" date,
    note text,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT cc_bill_entries_pkey PRIMARY KEY (id),
    CONSTRAINT cc_bill_entries_userid_fkey FOREIGN KEY ("userId")
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT cc_bill_entries_cardid_fkey FOREIGN KEY ("cardId")
        REFERENCES public.cc_cards(id) ON DELETE CASCADE,
    CONSTRAINT cc_bill_entries_statement_month_is_first_of_month
        CHECK (EXTRACT(DAY FROM "statementMonth") = 1),
    CONSTRAINT cc_bill_entries_status_valid
        CHECK (status = ANY (ARRAY['issued'::text, 'no_statement'::text])),
    -- Keeps the status and the amounts from ever disagreeing.
    CONSTRAINT cc_bill_entries_status_matches_amounts CHECK (
        (status = 'issued' AND "totalDue" IS NOT NULL)
        OR (status = 'no_statement' AND "totalDue" IS NULL AND "minimumDue" IS NULL)
    ),
    -- GREATEST ignores NULLs, so a credit-balance statement caps the minimum at 0.
    CONSTRAINT cc_bill_entries_minimum_within_total CHECK (
        "minimumDue" IS NULL
        OR ("minimumDue" >= 0 AND "minimumDue" <= GREATEST("totalDue", 0::numeric))
    ),
    CONSTRAINT cc_bill_entries_dates_ordered CHECK (
        "statementDate" IS NULL OR "dueDate" IS NULL OR "dueDate" >= "statementDate"
    ),
    -- Upsert conflict target for the grid's per-cell save.
    CONSTRAINT cc_bill_entries_unique_card_statement_month
        UNIQUE ("cardId", "statementMonth")
);

COMMENT ON COLUMN public.cc_bill_entries."statementMonth" IS
    'First day of the month the STATEMENT WAS GENERATED. Offset by one month from cc_payment_entries."periodMonth" in the general case - never join the two on their month columns.';
COMMENT ON COLUMN public.cc_bill_entries."totalDue" IS
    'Statement total as printed. NULL only when status is no_statement. May be negative (credit balance).';

CREATE INDEX IF NOT EXISTS idx_cc_bill_entries_user_statement_month
    ON public.cc_bill_entries("userId", "statementMonth");
CREATE INDEX IF NOT EXISTS idx_cc_bill_entries_card_id
    ON public.cc_bill_entries("cardId");

-- ============================================================================
-- 3. UPDATED AT TRIGGER
-- ============================================================================
-- Reuses the shared function from supabase_credit_card_tracker_schema.sql.

DROP TRIGGER IF EXISTS trg_cc_bill_entries_updated_at ON public.cc_bill_entries;
CREATE TRIGGER trg_cc_bill_entries_updated_at
    BEFORE UPDATE ON public.cc_bill_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_cc_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================
-- Identical shape to cc_payment_entries: own userId AND ownership of the parent
-- card, so a row can never be attached to another user's card.

ALTER TABLE public.cc_bill_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bill entries" ON public.cc_bill_entries;
CREATE POLICY "Users can view own bill entries"
    ON public.cc_bill_entries
    FOR SELECT
    USING ("userId" = auth.uid());

DROP POLICY IF EXISTS "Users can insert own bill entries" ON public.cc_bill_entries;
CREATE POLICY "Users can insert own bill entries"
    ON public.cc_bill_entries
    FOR INSERT
    WITH CHECK (
        "userId" = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cc_cards c
            WHERE c.id = cc_bill_entries."cardId"
            AND c."userId" = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own bill entries" ON public.cc_bill_entries;
CREATE POLICY "Users can update own bill entries"
    ON public.cc_bill_entries
    FOR UPDATE
    USING ("userId" = auth.uid())
    WITH CHECK (
        "userId" = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cc_cards c
            WHERE c.id = cc_bill_entries."cardId"
            AND c."userId" = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own bill entries" ON public.cc_bill_entries;
CREATE POLICY "Users can delete own bill entries"
    ON public.cc_bill_entries
    FOR DELETE
    USING ("userId" = auth.uid());

-- ============================================================================
-- 5. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_bill_entries TO authenticated;
