-- Allow external EMI split participants to be identified by name only.
-- Safe to run multiple times.

ALTER TABLE public."emiSplits" DROP CONSTRAINT IF EXISTS emisplits_user_or_external;
ALTER TABLE public."emiSplits" DROP CONSTRAINT IF EXISTS "emiSplits_user_or_external";

ALTER TABLE public."emiSplits"
ADD CONSTRAINT emisplits_user_or_external CHECK (
    ("userId" IS NOT NULL AND "isExternal" = false)
    OR (
        "userId" IS NULL
        AND "isExternal" = true
        AND (
            "participantEmail" IS NOT NULL
            OR "participantName" IS NOT NULL
        )
    )
);

COMMENT ON COLUMN public."emiSplits"."participantEmail"
IS 'Email of external participant (optional if participantName is provided).';
