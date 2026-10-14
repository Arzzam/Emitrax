-- ============================================================================
-- Public EMI Share Links
-- ============================================================================
-- An EMI owner can create a link that shows the EMI's details and amortization
-- schedule to anyone holding it, without logging in. The link lives until the
-- owner revokes it.
--
-- RLS cannot express "whoever holds this token", so the anon role gets NO
-- access to emis / amortizationSchedules / emiShareLinks. Instead it may call
-- one SECURITY DEFINER function, get_public_emi(token), which validates the
-- token and returns an allow-listed JSON payload - never whole rows. Owner
-- id, notes, splits, shares and scenarios are not exposed.
--
-- Tokens are generated server-side (192 random bits) by a trigger, so a
-- client can neither pick a guessable token nor rewrite an existing one.
--
-- Idempotent - safe to re-run in the SQL editor.
-- See context/plan/emi-public-share-link-plan.md.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================================
-- 1. TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."emiShareLinks" (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    "emiId" uuid NOT NULL,
    token text NOT NULL,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "revokedAt" timestamp with time zone,
    CONSTRAINT emiShareLinks_pkey PRIMARY KEY (id),
    CONSTRAINT emiShareLinks_emiid_fkey FOREIGN KEY ("emiId") REFERENCES public.emis(id) ON DELETE CASCADE,
    CONSTRAINT emiShareLinks_createdby_fkey FOREIGN KEY ("createdBy") REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT emiShareLinks_token_key UNIQUE (token)
);

-- At most one live link per EMI. Revoked links stay as history.
CREATE UNIQUE INDEX IF NOT EXISTS idx_emiShareLinks_one_active
    ON public."emiShareLinks"("emiId")
    WHERE "revokedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_emiShareLinks_emi_id ON public."emiShareLinks"("emiId");

-- ============================================================================
-- 2. TOKEN TRIGGER
-- ============================================================================
-- Insert: always generate the token, ignoring any client value.
-- Update: token, emiId and createdBy are immutable; only revokedAt changes.

CREATE OR REPLACE FUNCTION public.set_emi_share_link_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.token := rtrim(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
    ELSE
        NEW.token := OLD.token;
        NEW."emiId" := OLD."emiId";
        NEW."createdBy" := OLD."createdBy";
        NEW."createdAt" := OLD."createdAt";
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emiShareLinks_token ON public."emiShareLinks";
CREATE TRIGGER trg_emiShareLinks_token
    BEFORE INSERT OR UPDATE ON public."emiShareLinks"
    FOR EACH ROW
    EXECUTE FUNCTION public.set_emi_share_link_token();

-- ============================================================================
-- 3. RLS - owner only
-- ============================================================================
-- check_emi_ownership() comes from supabase_shared_emi_schema.sql. Users the
-- EMI is shared with (even with write) cannot create or revoke public links.

ALTER TABLE public."emiShareLinks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own EMI share links" ON public."emiShareLinks";
CREATE POLICY "Users can view own EMI share links"
    ON public."emiShareLinks"
    FOR SELECT
    TO authenticated
    USING (public.check_emi_ownership("emiId", auth.uid()));

DROP POLICY IF EXISTS "Users can insert own EMI share links" ON public."emiShareLinks";
CREATE POLICY "Users can insert own EMI share links"
    ON public."emiShareLinks"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        "createdBy" = auth.uid()
        AND public.check_emi_ownership("emiId", auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own EMI share links" ON public."emiShareLinks";
CREATE POLICY "Users can update own EMI share links"
    ON public."emiShareLinks"
    FOR UPDATE
    TO authenticated
    USING (public.check_emi_ownership("emiId", auth.uid()))
    WITH CHECK (public.check_emi_ownership("emiId", auth.uid()));

DROP POLICY IF EXISTS "Users can delete own EMI share links" ON public."emiShareLinks";
CREATE POLICY "Users can delete own EMI share links"
    ON public."emiShareLinks"
    FOR DELETE
    TO authenticated
    USING (public.check_emi_ownership("emiId", auth.uid()));

-- ============================================================================
-- 4. PUBLIC READ - get_public_emi(token)
-- ============================================================================
-- Returns NULL for an unknown or revoked token (no distinction, so a probe
-- learns nothing). Otherwise:
--   { emi: {...}, schedule: [...], format: { locale, numberFormat } }
-- format is the OWNER's number style, so the viewer sees the figures exactly
-- as the owner does. The EMI's own currency is inside emi.

CREATE OR REPLACE FUNCTION public.get_public_emi(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_emi_id uuid;
    v_result jsonb;
BEGIN
    IF p_token IS NULL OR length(p_token) < 32 THEN
        RETURN NULL;
    END IF;

    SELECT l."emiId" INTO v_emi_id
    FROM public."emiShareLinks" l
    WHERE l.token = p_token
      AND l."revokedAt" IS NULL;

    IF v_emi_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'emi', jsonb_build_object(
            'id', e.id,
            'itemName', e."itemName",
            'currency', e.currency,
            'principal', e.principal,
            'interestRate', e."interestRate",
            'interestDiscount', e."interestDiscount",
            'interestDiscountType', e."interestDiscountType",
            'tenure', e.tenure,
            'billDate', e."billDate",
            'endDate', e."endDate",
            'emi', e.emi,
            'totalLoan', e."totalLoan",
            'totalInterest', e."totalInterest",
            'gst', e.gst,
            'totalGST', e."totalGST",
            'processingFee', e."processingFee",
            'processingFeeGst', e."processingFeeGst",
            'totalPaidEMIs', e."totalPaidEMIs",
            'remainingBalance', e."remainingBalance",
            'remainingTenure', e."remainingTenure",
            'isCompleted', e."isCompleted",
            'tag', e.tag
        ),
        'schedule', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'month', s.month,
                'billDate', s."billDate",
                'emi', s.emi,
                'interest', s.interest,
                'principalPaid', s."principalPaid",
                'balance', s.balance,
                'gst', s.gst,
                'isPaid', s."isPaid"
            ) ORDER BY s.month)
            FROM public."amortizationSchedules" s
            WHERE s."emiId" = e.id
        ), '[]'::jsonb),
        'format', jsonb_build_object(
            'locale', COALESCE(p.locale, 'en-IN'),
            'numberFormat', COALESCE(p.number_format, 'exact')
        )
    )
    INTO v_result
    FROM public.emis e
    LEFT JOIN public.user_account_preferences p ON p.user_id = e."userId"
    WHERE e.id = v_emi_id;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_emi(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_emi(text) TO anon, authenticated;

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================

COMMENT ON TABLE public."emiShareLinks" IS
    'Public read-only links to one EMI. Token is server-generated; a link is live until revokedAt is set. At most one live link per EMI.';
COMMENT ON COLUMN public."emiShareLinks".token IS
    '192-bit random base64url token, set by trigger on insert and immutable afterwards.';
COMMENT ON FUNCTION public.get_public_emi(text) IS
    'Anon-callable. Returns an allow-listed EMI + schedule payload and the owner''s number style for a live token, else NULL.';

-- ============================================================================
-- 6. VERIFY
-- ============================================================================
-- a) Table, policies and trigger exist:
--
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'emiShareLinks';
--   -- expect 4 rows: SELECT / INSERT / UPDATE / DELETE
--
-- b) Token is generated and a client value is ignored (replace the ids with
--    one of your EMIs and your user id; runs as postgres, so RLS is bypassed):
--
--   INSERT INTO public."emiShareLinks" ("emiId", token, "createdBy")
--   VALUES ('<emi-id>', 'chosen-by-client', '<user-id>')
--   RETURNING token, length(token);
--   -- expect a random 32-char token, not 'chosen-by-client'
--
-- c) The RPC returns the payload, then NULL once revoked:
--
--   SELECT public.get_public_emi('<token from b>') -> 'emi' ->> 'itemName';
--   UPDATE public."emiShareLinks" SET "revokedAt" = now() WHERE token = '<token>';
--   SELECT public.get_public_emi('<token>');   -- expect NULL
--
-- d) anon cannot read the tables directly:
--
--   SET ROLE anon;
--   SELECT count(*) FROM public.emis;               -- expect 0
--   SELECT count(*) FROM public."emiShareLinks";    -- expect 0 or permission denied
--   RESET ROLE;
--
-- Clean up the test row afterwards:
--   DELETE FROM public."emiShareLinks" WHERE token = '<token>';
-- ============================================================================
