-- ============================================================================
-- Shared EMI Feature Schema
-- ============================================================================
-- This schema adds the shared EMI functionality to the existing Emitrax database.
-- It creates the emiShares table and sets up Row Level Security policies.
-- 
-- Run this in your Supabase SQL Editor after your existing tables are created.
-- ============================================================================

-- ============================================================================
-- 1. EMI SHARES TABLE
-- ============================================================================
-- Junction table for sharing EMIs between users
-- Tracks which users have access to which EMIs and their permission levels

CREATE TABLE IF NOT EXISTS public."emiShares" (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "emiId" uuid NOT NULL,
    "sharedWithUserId" uuid NOT NULL,
    permission text NOT NULL CHECK (permission = ANY (ARRAY['read'::text, 'write'::text])),
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT emiShares_pkey PRIMARY KEY (id),
    CONSTRAINT emiShares_emiid_fkey FOREIGN KEY ("emiId") REFERENCES public.emis(id) ON DELETE CASCADE,
    CONSTRAINT emiShares_sharedwithuserid_fkey FOREIGN KEY ("sharedWithUserId") REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT emiShares_createdby_fkey FOREIGN KEY ("createdBy") REFERENCES auth.users(id),
    CONSTRAINT emiShares_unique_share UNIQUE ("emiId", "sharedWithUserId"),
    CONSTRAINT emiShares_no_self_share CHECK ("sharedWithUserId" != "createdBy")
);

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_emiShares_emi_id ON public."emiShares"("emiId");
CREATE INDEX IF NOT EXISTS idx_emiShares_user_id ON public."emiShares"("sharedWithUserId");
CREATE INDEX IF NOT EXISTS idx_emiShares_created_by ON public."emiShares"("createdBy");
CREATE INDEX IF NOT EXISTS idx_emiShares_permission ON public."emiShares"("emiId", permission);

-- ============================================================================
-- 3. HELPER FUNCTIONS (Must be created before RLS policies to avoid recursion)
-- ============================================================================

-- Function to check if user owns an EMI (bypasses RLS to avoid infinite recursion)
-- This function uses SECURITY DEFINER to bypass RLS when checking ownership
-- SET search_path is used to ensure we access the table directly without RLS
CREATE OR REPLACE FUNCTION public.check_emi_ownership(emi_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Use SECURITY DEFINER to bypass RLS and check ownership directly
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

-- ============================================================================
-- 4. USER PROFILES TABLE
-- ============================================================================
-- Note: You already have a user_profiles table (see DB_schema.sql).
-- The functions below will use user_profiles.email for email-based sharing.
-- If your user_profiles table structure differs, update the functions accordingly.

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on emiShares table
ALTER TABLE public."emiShares" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR EMIS TABLE
-- ============================================================================
-- Update existing emis table policies to include shared access

-- Drop existing policies if they exist (adjust names as needed)
DROP POLICY IF EXISTS "Users can view own EMIs" ON public.emis;
DROP POLICY IF EXISTS "Users can view own EMIs or shared EMIs" ON public.emis;

-- Policy: Users can view their own EMIs or EMIs shared with them
CREATE POLICY "Users can view own EMIs or shared EMIs"
    ON public.emis
    FOR SELECT
    USING (
        "userId" = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public."emiShares"
            WHERE "emiShares"."emiId" = emis.id
            AND "emiShares"."sharedWithUserId" = auth.uid()
        )
    );

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update own EMIs" ON public.emis;
DROP POLICY IF EXISTS "Users can update own EMIs or shared EMIs with write permission" ON public.emis;

-- Policy: Users can update their own EMIs or EMIs shared with write permission
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

-- Policy: Only owners can delete EMIs (keep existing or create new)
DROP POLICY IF EXISTS "Users can delete own EMIs" ON public.emis;
DROP POLICY IF EXISTS "Only owners can delete EMIs" ON public.emis;

CREATE POLICY "Only owners can delete EMIs"
    ON public.emis
    FOR DELETE
    USING ("userId" = auth.uid());

-- Policy: Only owners can insert EMIs (keep existing or create new)
DROP POLICY IF EXISTS "Users can insert own EMIs" ON public.emis;

CREATE POLICY "Users can insert own EMIs"
    ON public.emis
    FOR INSERT
    WITH CHECK ("userId" = auth.uid());

-- ============================================================================
-- RLS POLICIES FOR AMORTIZATION SCHEDULES TABLE
-- ============================================================================
-- Update existing amortizationSchedules table policies to include shared access

-- Policy: Users can view schedules for EMIs they own or that are shared with them
DROP POLICY IF EXISTS "Users can view schedules for accessible EMIs" ON public."amortizationSchedules";

CREATE POLICY "Users can view schedules for accessible EMIs"
    ON public."amortizationSchedules"
    FOR SELECT
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
                )
            )
        )
    );

-- Policy: Users can insert schedules for EMIs they own or have write access to
DROP POLICY IF EXISTS "Users can insert schedules for accessible EMIs" ON public."amortizationSchedules";

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

-- Policy: Users can update schedules for EMIs they own or have write access to
DROP POLICY IF EXISTS "Users can update schedules for accessible EMIs" ON public."amortizationSchedules";

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

-- Policy: Users can delete schedules for EMIs they own or have write access to
DROP POLICY IF EXISTS "Users can delete schedules for accessible EMIs" ON public."amortizationSchedules";

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

-- ============================================================================
-- RLS POLICIES FOR EMI SHARES TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view shares they are involved in" ON public."emiShares";
DROP POLICY IF EXISTS "Only EMI owners can create shares" ON public."emiShares";
DROP POLICY IF EXISTS "Only EMI owners can update shares" ON public."emiShares";
DROP POLICY IF EXISTS "Only EMI owners can delete shares" ON public."emiShares";

-- Policy: Users can view shares where they are the recipient, creator, or EMI owner
-- Uses helper function to avoid infinite recursion with emis SELECT policy
CREATE POLICY "Users can view shares they are involved in"
    ON public."emiShares"
    FOR SELECT
    USING (
        "sharedWithUserId" = auth.uid() OR
        "createdBy" = auth.uid() OR
        public.check_emi_ownership("emiShares"."emiId", auth.uid())
    );

-- Policy: Only EMI owners can create shares
CREATE POLICY "Only EMI owners can create shares"
    ON public."emiShares"
    FOR INSERT
    WITH CHECK (
        public.check_emi_ownership("emiShares"."emiId", auth.uid())
        AND "createdBy" = auth.uid()
    );

-- Policy: Only EMI owners can update shares
CREATE POLICY "Only EMI owners can update shares"
    ON public."emiShares"
    FOR UPDATE
    USING (
        public.check_emi_ownership("emiShares"."emiId", auth.uid())
    )
    WITH CHECK (
        public.check_emi_ownership("emiShares"."emiId", auth.uid())
    );

-- Policy: Only EMI owners can delete shares
CREATE POLICY "Only EMI owners can delete shares"
    ON public."emiShares"
    FOR DELETE
    USING (
        public.check_emi_ownership("emiShares"."emiId", auth.uid())
    );

-- ============================================================================
-- RLS POLICIES FOR USER_PROFILES TABLE
-- ============================================================================
-- Note: If your user_profiles table already has RLS policies, you may need to
-- update them to allow viewing all profiles for email-based sharing.
-- The following policies ensure users can view all profiles for sharing functionality.

-- Policy: Users can view all profiles (needed for email-based sharing)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles"
    ON public.user_profiles
    FOR SELECT
    USING (true);

-- Policy: Users can insert their own profile (if not already exists)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- Policy: Users can update their own profile (if not already exists)
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- 6. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically update updatedAt timestamp on emis table
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updatedAt on emis table
DROP TRIGGER IF EXISTS update_emis_updated_at ON public.emis;
CREATE TRIGGER update_emis_updated_at
    BEFORE UPDATE ON public.emis
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create/update user_profiles on user signup
-- Note: This assumes your user_profiles table has an email column.
-- If your user_profiles structure differs, modify this function accordingly.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO UPDATE SET email = NEW.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create/update user_profiles when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to get user ID by email (for sharing by email)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS uuid AS $$
DECLARE
    user_id uuid;
BEGIN
    -- First try user_profiles table
    SELECT id INTO user_id
    FROM public.user_profiles
    WHERE email = LOWER(TRIM(user_email))
    LIMIT 1;
    
    -- If not found, try auth.users (requires SECURITY DEFINER)
    IF user_id IS NULL THEN
        SELECT id INTO user_id
        FROM auth.users
        WHERE email = LOWER(TRIM(user_email))
        LIMIT 1;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public."emiShares" IS 'Junction table for sharing EMIs between users. Tracks access permissions (read/write).';
COMMENT ON COLUMN public."emiShares"."emiId" IS 'Reference to the EMI being shared.';
COMMENT ON COLUMN public."emiShares"."sharedWithUserId" IS 'User receiving the share. Cannot be the same as EMI owner.';
COMMENT ON COLUMN public."emiShares".permission IS 'Access level: read (view only) or write (can edit).';
COMMENT ON COLUMN public."emiShares"."createdBy" IS 'User who created the share (usually the EMI owner).';

COMMENT ON FUNCTION public.get_user_id_by_email(TEXT) IS 'Helper function to get user ID by email for sharing functionality. Uses user_profiles table.';
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function to automatically create/update user_profiles when a new user signs up.';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
