-- ============================================================================
-- Backfill totalLoan to include one-time processing fee charges
-- ============================================================================
-- Safe to run multiple times.
-- ============================================================================

UPDATE public.emis
SET "totalLoan" = ROUND(
    principal::numeric
    + "totalInterest"::numeric
    + COALESCE("totalGST", 0)::numeric
    + COALESCE("processingFee", 0)::numeric
    + CASE
        WHEN COALESCE("processingFee", 0) > 0 AND COALESCE("processingFeeGst", 0) > 0
        THEN ROUND(COALESCE("processingFee", 0) * COALESCE("processingFeeGst", 0) / 100, 2)
        ELSE 0
      END,
    2
)
WHERE COALESCE("processingFee", 0) > 0;
