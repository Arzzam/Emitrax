-- ============================================================================
-- Loan scenarios: separate flat charges + next-installment interest option
-- ============================================================================
-- Run after supabase_loan_scenarios_schema.sql if that migration was already applied.
-- Fresh installs can rely on the updated base schema; this remains safe (IF NOT EXISTS).
-- ============================================================================

ALTER TABLE public.loan_scenarios
    ADD COLUMN IF NOT EXISTS "includeNextInstallmentInterest" boolean NOT NULL DEFAULT false;
