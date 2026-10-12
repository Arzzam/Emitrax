-- ============================================================================
-- Money Columns: 3 Decimal Places
-- ============================================================================
-- Kuwaiti dinar, Bahraini dinar and Omani rial have 3 minor units (1 KWD =
-- 1000 fils). A numeric(_, 2) column silently rounds the third decimal away,
-- so before those currencies can be offered, every money column an EMI or a
-- scenario writes must hold 3.
--
-- FORWARD-ONLY AND NON-DESTRUCTIVE: widening the scale keeps every existing
-- value exactly (100.50 becomes 100.500). Only new writes can use the third
-- decimal. Precision grows 14 -> 15 / stays 15 so the integer range is not cut:
-- numeric(14,3) would allow one integer digit fewer than numeric(14,2).
--
-- NOT TOUCHED, deliberately:
--   - emis.principal / emi / totalLoan / totalInterest / totalGST /
--     remainingBalance and every "amortizationSchedules" amount are already
--     unconstrained `numeric` - they hold any scale today.
--   - cc_* tables: the credit-card module is India-only (INR, 2 decimals).
--   - Rates and percentages (gst, processingFeeGst, splitPercentage,
--     foreclosureCharge*Rate) are not money.
--
-- Checked before writing (2026-10-12): no views or RLS policies depend on these
-- columns, so ALTER COLUMN TYPE needs no drop/recreate. Tables are small; the
-- rewrite is instant.
--
-- Idempotent - each column is altered only while its scale is not 3.
-- See context/plan/currency-and-number-formatting-plan.md, Phase 6.
-- ============================================================================

DO $$
DECLARE
    target record;
BEGIN
    FOR target IN
        SELECT * FROM (VALUES
            ('emis',                     'processingFee',            15),
            ('emiSplits',                'splitAmount',              15),
            ('loan_scenarios',           'foreclosureChargeAmount',  15),
            ('loan_scenarios',           'outstandingPrincipal',     15),
            ('loan_scenarios',           'accruedInterest',          15),
            ('loan_scenarios',           'accruedGst',               15),
            ('loan_scenarios',           'foreclosureCharges',       15),
            ('loan_scenarios',           'foreclosureChargeGst',     15),
            ('loan_scenarios',           'totalPayoff',              15),
            ('loan_scenarios',           'paidToDate',               15),
            ('loan_scenarios',           'baselineRemainingOutflow', 15),
            ('loan_scenarios',           'baselineTotalOutflow',     15),
            ('loan_scenarios',           'foreclosureTotalOutflow',  15),
            ('loan_scenarios',           'interestSaved',            15),
            ('loan_scenarios',           'gstSaved',                 15),
            ('loan_scenarios',           'netSavings',               15),
            ('loan_scenario_breakdowns', 'amount',                   15)
        ) AS t(table_name, column_name, target_precision)
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = target.table_name
              AND c.column_name = target.column_name
              AND c.numeric_scale IS DISTINCT FROM 3
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.%I ALTER COLUMN %I TYPE numeric(%s, 3)',
                target.table_name, target.column_name, target.target_precision
            );
            RAISE NOTICE 'Widened %.% to numeric(%, 3)', target.table_name, target.column_name, target.target_precision;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- VERIFY
-- ============================================================================
-- Expected: 17 rows, every one numeric_scale = 3 and numeric_precision = 15.
--
--   SELECT table_name, column_name, numeric_precision, numeric_scale
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND (table_name, column_name) IN (
--         ('emis', 'processingFee'), ('emiSplits', 'splitAmount'),
--         ('loan_scenario_breakdowns', 'amount')
--     )
--      OR (table_schema = 'public' AND table_name = 'loan_scenarios'
--          AND data_type = 'numeric' AND column_name NOT LIKE '%Rate')
--   ORDER BY table_name, column_name;
