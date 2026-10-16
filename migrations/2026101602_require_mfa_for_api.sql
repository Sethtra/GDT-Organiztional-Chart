-- Two-step sign-in (MFA) is required for every account.
-- A PostgREST pre-request hook runs before every API request and rejects any
-- signed-in session that has not passed an authenticator code (AAL2). It
-- covers every table and RPC in one place; SECURITY DEFINER functions cannot
-- bypass it because the check runs before the request reaches them.
-- Anonymous visitors (public charts, access requests) and the service role
-- are unaffected.
--
-- Emergency switch-off (SQL Editor), if sign-in is ever blocked by mistake:
--   ALTER ROLE authenticator RESET pgrst.db_pre_request;
--   NOTIFY pgrst, 'reload config';
--
-- Not covered: Supabase Storage uploads (separate service). Its policies still
-- require is_hr_admin() or chart ownership.

BEGIN;

CREATE OR REPLACE FUNCTION public.require_mfa_for_api()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  claims JSONB := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::JSONB,
    '{}'::JSONB
  );
BEGIN
  IF claims ->> 'role' = 'authenticated'
    AND coalesce(claims ->> 'aal', 'aal1') <> 'aal2'
  THEN
    RAISE EXCEPTION 'Two-step sign-in is required'
      USING ERRCODE = '42501',
        HINT = 'Complete two-step sign-in with your authenticator app, then retry.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.require_mfa_for_api() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.require_mfa_for_api()
  TO anon, authenticated, service_role;

ALTER ROLE authenticator SET pgrst.db_pre_request TO 'public.require_mfa_for_api';
NOTIFY pgrst, 'reload config';

COMMIT;
