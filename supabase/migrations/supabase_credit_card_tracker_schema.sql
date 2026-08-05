-- ============================================================================
-- Credit Card Annual Payment Tracker (SFT / AIS) Schema
-- ============================================================================
-- Tracks how much the user PAID toward each credit card bill, per month, per
-- financial year (Apr - Mar), against the statutory SFT-006 reporting limits.
--
-- Domain note: the INR 10,00,000 limit applies PER REPORTING ENTITY (per card
-- issuer), aggregating that issuer's cards only - not per card, and not across
-- banks. Cash payments toward card bills carry a separate INR 1,00,000 limit.
-- That is why cc_issuers exists as its own table: it is the unit of reporting.
--
-- Idempotent - safe to re-run in the SQL editor.
-- ============================================================================

-- ============================================================================
-- 1. ISSUERS (the reporting entity)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cc_issuers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    name text NOT NULL,
    color text,
    "sortOrder" integer NOT NULL DEFAULT 0,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT cc_issuers_pkey PRIMARY KEY (id),
    CONSTRAINT cc_issuers_userid_fkey FOREIGN KEY ("userId")
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT cc_issuers_name_not_blank CHECK (length(btrim(name)) > 0),
    -- Restricted to design-system chart tokens; a raw hex would break in one
    -- of the two colour schemes.
    CONSTRAINT cc_issuers_color_token CHECK (
        color IS NULL OR color = ANY (ARRAY['chart-1'::text, 'chart-2'::text, 'chart-3'::text,
                                            'chart-4'::text, 'chart-5'::text])
    )
);

-- Case-insensitive uniqueness must be an expression index; a table-level
-- UNIQUE constraint cannot take lower().
CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_issuers_user_name
    ON public.cc_issuers("userId", lower(name));

-- ============================================================================
-- 2. CARDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cc_cards (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "issuerId" uuid NOT NULL,
    name text NOT NULL,
    last4 text,
    "isActive" boolean NOT NULL DEFAULT true,
    "sortOrder" integer NOT NULL DEFAULT 0,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT cc_cards_pkey PRIMARY KEY (id),
    CONSTRAINT cc_cards_userid_fkey FOREIGN KEY ("userId")
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT cc_cards_issuerid_fkey FOREIGN KEY ("issuerId")
        REFERENCES public.cc_issuers(id) ON DELETE CASCADE,
    CONSTRAINT cc_cards_name_not_blank CHECK (length(btrim(name)) > 0),
    CONSTRAINT cc_cards_last4_format CHECK (last4 IS NULL OR last4 ~ '^[0-9]{4}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_cards_issuer_name
    ON public.cc_cards("issuerId", lower(name));
CREATE INDEX IF NOT EXISTS idx_cc_cards_user_id ON public.cc_cards("userId");

-- ============================================================================
-- 3. PAYMENT ENTRIES (one row per card per month)
-- ============================================================================
-- "periodMonth" is the sole source of truth for which financial year an entry
-- belongs to. A financial year is a half-open range query served by
-- idx_cc_payment_entries_user_period; storing a derived financialYear column
-- here would only introduce drift when a period is corrected.

CREATE TABLE IF NOT EXISTS public.cc_payment_entries (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "cardId" uuid NOT NULL,
    "periodMonth" date NOT NULL,
    amount numeric(14, 2) NOT NULL DEFAULT 0,
    "cashAmount" numeric(14, 2) NOT NULL DEFAULT 0,
    note text,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT cc_payment_entries_pkey PRIMARY KEY (id),
    CONSTRAINT cc_payment_entries_userid_fkey FOREIGN KEY ("userId")
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT cc_payment_entries_cardid_fkey FOREIGN KEY ("cardId")
        REFERENCES public.cc_cards(id) ON DELETE CASCADE,
    CONSTRAINT cc_payment_entries_period_is_first_of_month
        CHECK (EXTRACT(DAY FROM "periodMonth") = 1),
    CONSTRAINT cc_payment_entries_amount_non_negative CHECK (amount >= 0),
    CONSTRAINT cc_payment_entries_cash_within_amount
        CHECK ("cashAmount" >= 0 AND "cashAmount" <= amount),
    -- Upsert conflict target for the grid's per-cell save.
    CONSTRAINT cc_payment_entries_unique_card_period UNIQUE ("cardId", "periodMonth")
);

CREATE INDEX IF NOT EXISTS idx_cc_payment_entries_user_period
    ON public.cc_payment_entries("userId", "periodMonth");
CREATE INDEX IF NOT EXISTS idx_cc_payment_entries_card_id
    ON public.cc_payment_entries("cardId");

-- ============================================================================
-- 4. TRACKER YEARS (per-FY notes and thresholds)
-- ============================================================================
-- Rows are created on demand by the app (idempotent upsert) the first time a
-- financial year receives an entry or a note. Thresholds are statutory and
-- render read-only in the UI; they live here so a limit change is data rather
-- than a deploy.

CREATE TABLE IF NOT EXISTS public.cc_tracker_years (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "financialYear" text NOT NULL,
    notes text,
    "thresholdAmount" numeric(14, 2) NOT NULL DEFAULT 1000000,
    "cashThresholdAmount" numeric(14, 2) NOT NULL DEFAULT 100000,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT cc_tracker_years_pkey PRIMARY KEY (id),
    CONSTRAINT cc_tracker_years_userid_fkey FOREIGN KEY ("userId")
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT cc_tracker_years_fy_format CHECK ("financialYear" ~ '^[0-9]{4}-[0-9]{2}$'),
    CONSTRAINT cc_tracker_years_threshold_positive CHECK ("thresholdAmount" > 0),
    CONSTRAINT cc_tracker_years_cash_threshold_positive CHECK ("cashThresholdAmount" > 0),
    CONSTRAINT cc_tracker_years_unique_user_year UNIQUE ("userId", "financialYear")
);

-- ============================================================================
-- 5. UPDATED AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_cc_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cc_issuers_updated_at ON public.cc_issuers;
CREATE TRIGGER trg_cc_issuers_updated_at
    BEFORE UPDATE ON public.cc_issuers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_cc_updated_at();

DROP TRIGGER IF EXISTS trg_cc_cards_updated_at ON public.cc_cards;
CREATE TRIGGER trg_cc_cards_updated_at
    BEFORE UPDATE ON public.cc_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.set_cc_updated_at();

DROP TRIGGER IF EXISTS trg_cc_payment_entries_updated_at ON public.cc_payment_entries;
CREATE TRIGGER trg_cc_payment_entries_updated_at
    BEFORE UPDATE ON public.cc_payment_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_cc_updated_at();

DROP TRIGGER IF EXISTS trg_cc_tracker_years_updated_at ON public.cc_tracker_years;
CREATE TRIGGER trg_cc_tracker_years_updated_at
    BEFORE UPDATE ON public.cc_tracker_years
    FOR EACH ROW
    EXECUTE FUNCTION public.set_cc_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================
-- Child tables assert ownership of the PARENT row as well as their own userId.
-- Without that, a user could attach their card to another user's issuer and
-- pollute that user's aggregate.

ALTER TABLE public.cc_issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_payment_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_tracker_years ENABLE ROW LEVEL SECURITY;

-- --- cc_issuers -------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own card issuers" ON public.cc_issuers;
CREATE POLICY "Users can view own card issuers"
    ON public.cc_issuers
    FOR SELECT
    USING ("userId" = auth.uid());

DROP POLICY IF EXISTS "Users can insert own card issuers" ON public.cc_issuers;
CREATE POLICY "Users can insert own card issuers"
    ON public.cc_issuers
    FOR INSERT
    WITH CHECK ("userId" = auth.uid());

DROP POLICY IF EXISTS "Users can update own card issuers" ON public.cc_issuers;
CREATE POLICY "Users can update own card issuers"
    ON public.cc_issuers
    FOR UPDATE
    USING ("userId" = auth.uid())
    WITH CHECK ("userId" = auth.uid());

DROP POLICY IF EXISTS "Users can delete own card issuers" ON public.cc_issuers;
CREATE POLICY "Users can delete own card issuers"
    ON public.cc_issuers
    FOR DELETE
    USING ("userId" = auth.uid());

-- --- cc_cards ---------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own cards" ON public.cc_cards;
CREATE POLICY "Users can view own cards"
    ON public.cc_cards
    FOR SELECT
    USING ("userId" = auth.uid());

DROP POLICY IF EXISTS "Users can insert own cards" ON public.cc_cards;
CREATE POLICY "Users can insert own cards"
    ON public.cc_cards
    FOR INSERT
    WITH CHECK (
        "userId" = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cc_issuers i
            WHERE i.id = cc_cards."issuerId"
            AND i."userId" = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own cards" ON public.cc_cards;
CREATE POLICY "Users can update own cards"
    ON public.cc_cards
    FOR UPDATE
    USING ("userId" = auth.uid())
    WITH CHECK (
        "userId" = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cc_issuers i
            WHERE i.id = cc_cards."issuerId"
            AND i."userId" = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own cards" ON public.cc_cards;
CREATE POLICY "Users can delete own cards"
    ON public.cc_cards
    FOR DELETE
    USING ("userId" = auth.uid());

-- --- cc_payment_entries -----------------------------------------------------

DROP POLICY IF EXISTS "Users can view own payment entries" ON public.cc_payment_entries;
CREATE POLICY "Users can view own payment entries"
    ON public.cc_payment_entries
    FOR SELECT
    USING ("userId" = auth.uid());

DROP POLICY IF EXISTS "Users can insert own payment entries" ON public.cc_payment_entries;
CREATE POLICY "Users can insert own payment entries"
    ON public.cc_payment_entries
    FOR INSERT
    WITH CHECK (
        "userId" = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cc_cards c
            WHERE c.id = cc_payment_entries."cardId"
            AND c."userId" = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own payment entries" ON public.cc_payment_entries;
CREATE POLICY "Users can update own payment entries"
    ON public.cc_payment_entries
    FOR UPDATE
    USING ("userId" = auth.uid())
    WITH CHECK (
        "userId" = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cc_cards c
            WHERE c.id = cc_payment_entries."cardId"
            AND c."userId" = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own payment entries" ON public.cc_payment_entries;
CREATE POLICY "Users can delete own payment entries"
    ON public.cc_payment_entries
    FOR DELETE
    USING ("userId" = auth.uid());

-- --- cc_tracker_years -------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own tracker years" ON public.cc_tracker_years;
CREATE POLICY "Users can view own tracker years"
    ON public.cc_tracker_years
    FOR SELECT
    USING ("userId" = auth.uid());

DROP POLICY IF EXISTS "Users can insert own tracker years" ON public.cc_tracker_years;
CREATE POLICY "Users can insert own tracker years"
    ON public.cc_tracker_years
    FOR INSERT
    WITH CHECK ("userId" = auth.uid());

DROP POLICY IF EXISTS "Users can update own tracker years" ON public.cc_tracker_years;
CREATE POLICY "Users can update own tracker years"
    ON public.cc_tracker_years
    FOR UPDATE
    USING ("userId" = auth.uid())
    WITH CHECK ("userId" = auth.uid());

DROP POLICY IF EXISTS "Users can delete own tracker years" ON public.cc_tracker_years;
CREATE POLICY "Users can delete own tracker years"
    ON public.cc_tracker_years
    FOR DELETE
    USING ("userId" = auth.uid());

-- ============================================================================
-- 7. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_issuers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_payment_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cc_tracker_years TO authenticated;
