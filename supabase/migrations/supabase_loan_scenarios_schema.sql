-- ============================================================================
-- Loan Foreclosure Scenarios Schema
-- ============================================================================
-- Persisted what-if foreclosure simulations linked to emis.
-- RLS mirrors owner + emiShares (read / write) semantics.
-- ============================================================================

-- ============================================================================
-- 1. LOAN SCENARIOS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.loan_scenarios (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "emiId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    name text NOT NULL,
    "scenarioType" text NOT NULL DEFAULT 'foreclosure'
        CHECK ("scenarioType" = ANY (ARRAY['foreclosure'::text])),
    "simulationDate" date NOT NULL,
    "foreclosureChargeRate" numeric(10, 4) NOT NULL DEFAULT 0
        CHECK ("foreclosureChargeRate" >= 0 AND "foreclosureChargeRate" <= 100),
    "foreclosureChargeAmount" numeric(14, 2) NOT NULL DEFAULT 0
        CHECK ("foreclosureChargeAmount" >= 0),
    "foreclosureChargeGstRate" numeric(10, 4) NOT NULL DEFAULT 0
        CHECK ("foreclosureChargeGstRate" >= 0 AND "foreclosureChargeGstRate" <= 100),
    "includeNextInstallmentInterest" boolean NOT NULL DEFAULT false,
    "outstandingPrincipal" numeric(14, 2) NOT NULL DEFAULT 0,
    "accruedInterest" numeric(14, 2) NOT NULL DEFAULT 0,
    "accruedGst" numeric(14, 2) NOT NULL DEFAULT 0,
    "foreclosureCharges" numeric(14, 2) NOT NULL DEFAULT 0,
    "foreclosureChargeGst" numeric(14, 2) NOT NULL DEFAULT 0,
    "totalPayoff" numeric(14, 2) NOT NULL DEFAULT 0,
    "paidToDate" numeric(14, 2) NOT NULL DEFAULT 0,
    "baselineRemainingOutflow" numeric(14, 2) NOT NULL DEFAULT 0,
    "baselineTotalOutflow" numeric(14, 2) NOT NULL DEFAULT 0,
    "foreclosureTotalOutflow" numeric(14, 2) NOT NULL DEFAULT 0,
    "interestSaved" numeric(14, 2) NOT NULL DEFAULT 0,
    "gstSaved" numeric(14, 2) NOT NULL DEFAULT 0,
    "netSavings" numeric(14, 2) NOT NULL DEFAULT 0,
    "monthsSaved" integer NOT NULL DEFAULT 0,
    "confidence" text NOT NULL DEFAULT 'estimated'
        CHECK ("confidence" = ANY (ARRAY['exact'::text, 'estimated'::text])),
    notes text,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT loan_scenarios_pkey PRIMARY KEY (id),
    CONSTRAINT loan_scenarios_emiid_fkey FOREIGN KEY ("emiId")
        REFERENCES public.emis(id) ON DELETE CASCADE,
    CONSTRAINT loan_scenarios_userid_fkey FOREIGN KEY ("userId")
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. LOAN SCENARIO BREAKDOWNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.loan_scenario_breakdowns (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "scenarioId" uuid NOT NULL,
    component text NOT NULL,
    label text NOT NULL,
    amount numeric(14, 2) NOT NULL DEFAULT 0,
    "sortOrder" integer NOT NULL DEFAULT 0,
    "createdAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT loan_scenario_breakdowns_pkey PRIMARY KEY (id),
    CONSTRAINT loan_scenario_breakdowns_scenarioid_fkey FOREIGN KEY ("scenarioId")
        REFERENCES public.loan_scenarios(id) ON DELETE CASCADE,
    CONSTRAINT loan_scenario_breakdowns_unique_component UNIQUE ("scenarioId", component)
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_loan_scenarios_emi_id ON public.loan_scenarios("emiId");
CREATE INDEX IF NOT EXISTS idx_loan_scenarios_user_id ON public.loan_scenarios("userId");
CREATE INDEX IF NOT EXISTS idx_loan_scenarios_emi_created
    ON public.loan_scenarios("emiId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_loan_scenario_breakdowns_scenario_id
    ON public.loan_scenario_breakdowns("scenarioId");

-- ============================================================================
-- 4. UPDATED AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_loan_scenarios_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loan_scenarios_updated_at ON public.loan_scenarios;
CREATE TRIGGER trg_loan_scenarios_updated_at
    BEFORE UPDATE ON public.loan_scenarios
    FOR EACH ROW
    EXECUTE FUNCTION public.set_loan_scenarios_updated_at();

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.loan_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_scenario_breakdowns ENABLE ROW LEVEL SECURITY;

-- Helpers reuse check_emi_ownership from shared EMI schema when present.
-- Access also allowed via emiShares (read for SELECT, write for INSERT/UPDATE/DELETE).

DROP POLICY IF EXISTS "Users can view scenarios for accessible EMIs" ON public.loan_scenarios;
CREATE POLICY "Users can view scenarios for accessible EMIs"
    ON public.loan_scenarios
    FOR SELECT
    USING (
        "userId" = auth.uid()
        OR public.check_emi_ownership("emiId", auth.uid())
        OR EXISTS (
            SELECT 1 FROM public."emiShares"
            WHERE "emiShares"."emiId" = loan_scenarios."emiId"
            AND "emiShares"."sharedWithUserId" = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert scenarios for owned or write-shared EMIs" ON public.loan_scenarios;
CREATE POLICY "Users can insert scenarios for owned or write-shared EMIs"
    ON public.loan_scenarios
    FOR INSERT
    WITH CHECK (
        "userId" = auth.uid()
        AND (
            public.check_emi_ownership("emiId", auth.uid())
            OR EXISTS (
                SELECT 1 FROM public."emiShares"
                WHERE "emiShares"."emiId" = loan_scenarios."emiId"
                AND "emiShares"."sharedWithUserId" = auth.uid()
                AND "emiShares".permission = 'write'
            )
        )
    );

DROP POLICY IF EXISTS "Users can update scenarios for owned or write-shared EMIs" ON public.loan_scenarios;
CREATE POLICY "Users can update scenarios for owned or write-shared EMIs"
    ON public.loan_scenarios
    FOR UPDATE
    USING (
        public.check_emi_ownership("emiId", auth.uid())
        OR EXISTS (
            SELECT 1 FROM public."emiShares"
            WHERE "emiShares"."emiId" = loan_scenarios."emiId"
            AND "emiShares"."sharedWithUserId" = auth.uid()
            AND "emiShares".permission = 'write'
        )
    )
    WITH CHECK (
        public.check_emi_ownership("emiId", auth.uid())
        OR EXISTS (
            SELECT 1 FROM public."emiShares"
            WHERE "emiShares"."emiId" = loan_scenarios."emiId"
            AND "emiShares"."sharedWithUserId" = auth.uid()
            AND "emiShares".permission = 'write'
        )
    );

DROP POLICY IF EXISTS "Users can delete scenarios for owned or write-shared EMIs" ON public.loan_scenarios;
CREATE POLICY "Users can delete scenarios for owned or write-shared EMIs"
    ON public.loan_scenarios
    FOR DELETE
    USING (
        public.check_emi_ownership("emiId", auth.uid())
        OR EXISTS (
            SELECT 1 FROM public."emiShares"
            WHERE "emiShares"."emiId" = loan_scenarios."emiId"
            AND "emiShares"."sharedWithUserId" = auth.uid()
            AND "emiShares".permission = 'write'
        )
    );

-- Breakdowns inherit access from parent scenario

DROP POLICY IF EXISTS "Users can view breakdowns for accessible scenarios" ON public.loan_scenario_breakdowns;
CREATE POLICY "Users can view breakdowns for accessible scenarios"
    ON public.loan_scenario_breakdowns
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.loan_scenarios
            WHERE loan_scenarios.id = loan_scenario_breakdowns."scenarioId"
            AND (
                loan_scenarios."userId" = auth.uid()
                OR public.check_emi_ownership(loan_scenarios."emiId", auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public."emiShares"
                    WHERE "emiShares"."emiId" = loan_scenarios."emiId"
                    AND "emiShares"."sharedWithUserId" = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert breakdowns for writable scenarios" ON public.loan_scenario_breakdowns;
CREATE POLICY "Users can insert breakdowns for writable scenarios"
    ON public.loan_scenario_breakdowns
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.loan_scenarios
            WHERE loan_scenarios.id = loan_scenario_breakdowns."scenarioId"
            AND (
                public.check_emi_ownership(loan_scenarios."emiId", auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public."emiShares"
                    WHERE "emiShares"."emiId" = loan_scenarios."emiId"
                    AND "emiShares"."sharedWithUserId" = auth.uid()
                    AND "emiShares".permission = 'write'
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can update breakdowns for writable scenarios" ON public.loan_scenario_breakdowns;
CREATE POLICY "Users can update breakdowns for writable scenarios"
    ON public.loan_scenario_breakdowns
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.loan_scenarios
            WHERE loan_scenarios.id = loan_scenario_breakdowns."scenarioId"
            AND (
                public.check_emi_ownership(loan_scenarios."emiId", auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public."emiShares"
                    WHERE "emiShares"."emiId" = loan_scenarios."emiId"
                    AND "emiShares"."sharedWithUserId" = auth.uid()
                    AND "emiShares".permission = 'write'
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.loan_scenarios
            WHERE loan_scenarios.id = loan_scenario_breakdowns."scenarioId"
            AND (
                public.check_emi_ownership(loan_scenarios."emiId", auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public."emiShares"
                    WHERE "emiShares"."emiId" = loan_scenarios."emiId"
                    AND "emiShares"."sharedWithUserId" = auth.uid()
                    AND "emiShares".permission = 'write'
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete breakdowns for writable scenarios" ON public.loan_scenario_breakdowns;
CREATE POLICY "Users can delete breakdowns for writable scenarios"
    ON public.loan_scenario_breakdowns
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.loan_scenarios
            WHERE loan_scenarios.id = loan_scenario_breakdowns."scenarioId"
            AND (
                public.check_emi_ownership(loan_scenarios."emiId", auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public."emiShares"
                    WHERE "emiShares"."emiId" = loan_scenarios."emiId"
                    AND "emiShares"."sharedWithUserId" = auth.uid()
                    AND "emiShares".permission = 'write'
                )
            )
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_scenarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_scenario_breakdowns TO authenticated;
