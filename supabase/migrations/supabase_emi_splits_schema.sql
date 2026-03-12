-- ============================================================================
-- EMI Split Feature Schema
-- ============================================================================
-- This schema adds the EMI split functionality to track financial responsibility
-- between multiple people, including support for external (non-registered) participants.
-- 
-- Run this in your Supabase SQL Editor after your existing tables are created.
-- ============================================================================

-- ============================================================================
-- 1. EMI SPLITS TABLE
-- ============================================================================
-- Tracks how an EMI is split between multiple people
-- Supports both registered users (userId) and external participants (email/name)

CREATE TABLE IF NOT EXISTS public."emiSplits" (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "emiId" uuid NOT NULL,
    "userId" uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for external participants
    "participantName" text, -- Name for external participants (when userId is null)
    "participantEmail" text, -- Email for external participants (when userId is null)
    "splitPercentage" numeric(5, 2) NOT NULL CHECK ("splitPercentage" > 0 AND "splitPercentage" <= 100),
    "splitAmount" numeric(15, 2), -- Calculated: EMI * splitPercentage / 100
    "isExternal" boolean NOT NULL DEFAULT false, -- True if participant is not a registered user
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT emiSplits_pkey PRIMARY KEY (id),
    CONSTRAINT emiSplits_emiid_fkey FOREIGN KEY ("emiId") REFERENCES public.emis(id) ON DELETE CASCADE,
    CONSTRAINT emiSplits_createdby_fkey FOREIGN KEY ("createdBy") REFERENCES auth.users(id),
    -- Ensure either userId exists (registered) OR name/email exists (external)
    CONSTRAINT emiSplits_user_or_external CHECK (
        ("userId" IS NOT NULL AND "isExternal" = false) OR 
        (
            "userId" IS NULL
            AND "isExternal" = true
            AND (
                "participantEmail" IS NOT NULL
                OR "participantName" IS NOT NULL
            )
        )
    ),
    CONSTRAINT emiSplits_percentage_valid CHECK ("splitPercentage" > 0 AND "splitPercentage" <= 100)
);

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_emiSplits_emi_id ON public."emiSplits"("emiId");
CREATE INDEX IF NOT EXISTS idx_emiSplits_user_id ON public."emiSplits"("userId") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emiSplits_participant_email ON public."emiSplits"("participantEmail") WHERE "participantEmail" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emiSplits_is_external ON public."emiSplits"("isExternal");

-- ============================================================================
-- 2.1. PARTIAL UNIQUE INDEXES (for conditional uniqueness)
-- ============================================================================

-- Unique constraint for registered users: one split per user per EMI
CREATE UNIQUE INDEX IF NOT EXISTS idx_emiSplits_unique_user_per_emi 
    ON public."emiSplits"("emiId", "userId") 
    WHERE "userId" IS NOT NULL;

-- Unique constraint for external participants: one split per email per EMI
CREATE UNIQUE INDEX IF NOT EXISTS idx_emiSplits_unique_external_per_emi 
    ON public."emiSplits"("emiId", "participantEmail") 
    WHERE "participantEmail" IS NOT NULL;

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user owns an EMI (reuse from shared EMI feature)
-- This should already exist, but we'll create it if it doesn't
CREATE OR REPLACE FUNCTION public.check_emi_ownership(emi_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.emis
        WHERE emis.id = emi_id
        AND emis."userId" = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_emi_ownership(uuid, uuid) TO authenticated;

-- Function to validate splits sum to 100%
CREATE OR REPLACE FUNCTION public.validate_splits_total(emi_id uuid)
RETURNS boolean AS $$
DECLARE
    total_percentage numeric;
BEGIN
    SELECT COALESCE(SUM("splitPercentage"), 0) INTO total_percentage
    FROM public."emiSplits"
    WHERE "emiId" = emi_id;
    
    -- Allow small tolerance for rounding (99.99% - 100.01%)
    RETURN total_percentage >= 99.99 AND total_percentage <= 100.01;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.validate_splits_total(uuid) TO authenticated;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on emiSplits table
ALTER TABLE public."emiSplits" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view splits for EMIs they own or are part of
-- Note: External participants (isExternal = true) are only visible to EMI owner
CREATE POLICY "Users can view their splits"
    ON public."emiSplits"
    FOR SELECT
    USING (
        -- User is a registered participant
        ("userId" = auth.uid() AND "isExternal" = false) OR
        -- User owns the EMI (can see all splits including external)
        public.check_emi_ownership("emiId", auth.uid())
    );

-- Policy: Only EMI owners can create splits
CREATE POLICY "Only owners can create splits"
    ON public."emiSplits"
    FOR INSERT
    WITH CHECK (
        public.check_emi_ownership("emiId", auth.uid())
        AND "createdBy" = auth.uid()
    );

-- Policy: Only EMI owners can update splits
CREATE POLICY "Only owners can update splits"
    ON public."emiSplits"
    FOR UPDATE
    USING (
        public.check_emi_ownership("emiId", auth.uid())
    )
    WITH CHECK (
        public.check_emi_ownership("emiId", auth.uid())
    );

-- Policy: Only EMI owners can delete splits
CREATE POLICY "Only owners can delete splits"
    ON public."emiSplits"
    FOR DELETE
    USING (
        public.check_emi_ownership("emiId", auth.uid())
    );

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Function to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION public.update_emiSplits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updatedAt on emiSplits table
DROP TRIGGER IF EXISTS update_emiSplits_updated_at ON public."emiSplits";
CREATE TRIGGER update_emiSplits_updated_at
    BEFORE UPDATE ON public."emiSplits"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_emiSplits_updated_at();

-- Function to calculate and update splitAmount when splitPercentage changes
CREATE OR REPLACE FUNCTION public.calculate_split_amount()
RETURNS TRIGGER AS $$
DECLARE
    emi_amount numeric;
BEGIN
    -- Get the EMI amount
    SELECT emi INTO emi_amount
    FROM public.emis
    WHERE id = NEW."emiId";
    
    -- Calculate split amount
    NEW."splitAmount" = (emi_amount * NEW."splitPercentage") / 100;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate splitAmount
DROP TRIGGER IF EXISTS calculate_emiSplits_amount ON public."emiSplits";
CREATE TRIGGER calculate_emiSplits_amount
    BEFORE INSERT OR UPDATE ON public."emiSplits"
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_split_amount();

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public."emiSplits" IS 'Tracks how EMIs are split between multiple people. Supports both registered users and external participants.';
COMMENT ON COLUMN public."emiSplits"."emiId" IS 'Reference to the EMI being split.';
COMMENT ON COLUMN public."emiSplits"."userId" IS 'Registered user ID (null for external participants).';
COMMENT ON COLUMN public."emiSplits"."participantName" IS 'Name of external participant (only for non-registered users).';
COMMENT ON COLUMN public."emiSplits"."participantEmail" IS 'Email of external participant (optional if participantName is provided).';
COMMENT ON COLUMN public."emiSplits"."splitPercentage" IS 'Percentage of EMI this person is responsible for (0-100).';
COMMENT ON COLUMN public."emiSplits"."splitAmount" IS 'Calculated monthly amount this person owes (EMI * percentage / 100).';
COMMENT ON COLUMN public."emiSplits"."isExternal" IS 'True if participant is not a registered user in the app.';
COMMENT ON COLUMN public."emiSplits"."createdBy" IS 'User who created the split (usually the EMI owner).';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
