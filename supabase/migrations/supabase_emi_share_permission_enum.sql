-- ============================================================================
-- emiShares.permission → Postgres enum
-- ============================================================================
-- Replaces the text + CHECK constraint with public.emi_share_permission
-- ('read' | 'write') so `supabase gen types` emits a real Enum instead of
-- `permission: string`.
--
-- Postgres refuses ALTER COLUMN ... TYPE while any RLS policy references
-- the column (even transitively, through an EXISTS subquery on emiShares).
-- All 10 such policies are dropped here and recreated with identical
-- bodies immediately after the conversion — the 'write' string literal in
-- each policy auto-coerces to the new enum type, so behavior is unchanged.
--
-- Safe to re-run. Paste into the Supabase SQL editor, then regenerate:
--
--   npx --yes supabase gen types typescript --project-id vjenpyxjyotbcckxgfal --schema public > src/supabase/supabase.types.ts
-- ============================================================================

-- 1. Enum type ----------------------------------------------------------------

DO $$
BEGIN
    CREATE TYPE public.emi_share_permission AS ENUM ('read', 'write');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.emi_share_permission IS
    'Access level for emiShares: read (view only) or write (can edit).';

-- 2. Drop policies that depend on emiShares.permission ------------------------
-- (directly, or transitively via an EXISTS subquery joining emiShares)

DROP POLICY IF EXISTS "Users can update own EMIs or shared EMIs with write permission" ON public.emis;

DROP POLICY IF EXISTS "Users can insert schedules for accessible EMIs" ON public."amortizationSchedules";
DROP POLICY IF EXISTS "Users can update schedules for accessible EMIs" ON public."amortizationSchedules";
DROP POLICY IF EXISTS "Users can delete schedules for accessible EMIs" ON public."amortizationSchedules";

DROP POLICY IF EXISTS "Users can insert scenarios for owned or write-shared EMIs" ON public.loan_scenarios;
DROP POLICY IF EXISTS "Users can update scenarios for owned or write-shared EMIs" ON public.loan_scenarios;
DROP POLICY IF EXISTS "Users can delete scenarios for owned or write-shared EMIs" ON public.loan_scenarios;

DROP POLICY IF EXISTS "Users can insert breakdowns for writable scenarios" ON public.loan_scenario_breakdowns;
DROP POLICY IF EXISTS "Users can update breakdowns for writable scenarios" ON public.loan_scenario_breakdowns;
DROP POLICY IF EXISTS "Users can delete breakdowns for writable scenarios" ON public.loan_scenario_breakdowns;

-- 3. Drop the old CHECK constraint (name can vary) ----------------------------

DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT con.conname
    INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'emiShares'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%permission%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format(
            'ALTER TABLE public."emiShares" DROP CONSTRAINT %I',
            constraint_name
        );
    END IF;
END $$;

-- 4. Convert the column if it is still text -----------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'emiShares'
          AND column_name = 'permission'
          AND udt_name = 'text'
    ) THEN
        -- Reject unexpected values before the cast (enum only allows read/write).
        IF EXISTS (
            SELECT 1
            FROM public."emiShares"
            WHERE permission IS DISTINCT FROM 'read'
              AND permission IS DISTINCT FROM 'write'
        ) THEN
            RAISE EXCEPTION
                'emiShares.permission contains values other than read/write; clean them before converting to enum';
        END IF;

        ALTER TABLE public."emiShares"
            ALTER COLUMN permission TYPE public.emi_share_permission
            USING permission::public.emi_share_permission;
    END IF;
END $$;

COMMENT ON COLUMN public."emiShares".permission IS
    'Access level: read (view only) or write (can edit). Stored as emi_share_permission enum.';

-- 5. Recreate the policies dropped in step 2 -----------------------------------
-- Bodies are byte-for-byte identical to supabase_shared_emi_schema.sql /
-- supabase_loan_scenarios_schema.sql; the 'write' literal auto-coerces to
-- emi_share_permission.

CREATE POLICY "Users can update own EMIs or shared EMIs with write permission"
    ON public.emis
    FOR UPDATE
    USING (
        "userId" = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public."emiShares"
            WHERE "emiShares"."emiId" = emis.id
            AND "emiShares"."sharedWithUserId" = auth.uid()
            AND "emiShares".permission = 'write'
        )
    )
    WITH CHECK (
        "userId" = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public."emiShares"
            WHERE "emiShares"."emiId" = emis.id
            AND "emiShares"."sharedWithUserId" = auth.uid()
            AND "emiShares".permission = 'write'
        )
    );

CREATE POLICY "Users can insert schedules for accessible EMIs"
    ON public."amortizationSchedules"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.emis
            WHERE emis.id = public."amortizationSchedules"."emiId"
            AND (
                emis."userId" = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public."emiShares"
                    WHERE "emiShares"."emiId" = emis.id
                    AND "emiShares"."sharedWithUserId" = auth.uid()
                    AND "emiShares".permission = 'write'
                )
            )
        )
    );

CREATE POLICY "Users can update schedules for accessible EMIs"
    ON public."amortizationSchedules"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.emis
            WHERE emis.id = public."amortizationSchedules"."emiId"
            AND (
                emis."userId" = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public."emiShares"
                    WHERE "emiShares"."emiId" = emis.id
                    AND "emiShares"."sharedWithUserId" = auth.uid()
                    AND "emiShares".permission = 'write'
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.emis
            WHERE emis.id = public."amortizationSchedules"."emiId"
            AND (
                emis."userId" = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public."emiShares"
                    WHERE "emiShares"."emiId" = emis.id
                    AND "emiShares"."sharedWithUserId" = auth.uid()
                    AND "emiShares".permission = 'write'
                )
            )
        )
    );

CREATE POLICY "Users can delete schedules for accessible EMIs"
    ON public."amortizationSchedules"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.emis
            WHERE emis.id = public."amortizationSchedules"."emiId"
            AND (
                emis."userId" = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public."emiShares"
                    WHERE "emiShares"."emiId" = emis.id
                    AND "emiShares"."sharedWithUserId" = auth.uid()
                    AND "emiShares".permission = 'write'
                )
            )
        )
    );

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
