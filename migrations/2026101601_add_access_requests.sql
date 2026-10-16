-- Access requests replace public self-registration.
-- Visitors submit their name, work email, and employee ID through
-- submit_access_request(); they cannot read or change the table directly.
-- HR administrators review requests. Approval is completed by the
-- approve-access-request Edge Function, which sends the Supabase invitation
-- with the service role and then marks the request approved.
-- Requires 2026072701_add_hr_admin_rbac.sql and 2026072702_secure_global_staff_directory.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL
    CHECK (length(trim(full_name)) BETWEEN 1 AND 200),
  email TEXT NOT NULL
    CHECK (
      email = lower(trim(email))
      AND length(email) <= 320
      AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ),
  employee_id TEXT NOT NULL
    CHECK (length(trim(employee_id)) BETWEEN 1 AND 64),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note TEXT
    CHECK (review_note IS NULL OR length(review_note) <= 500),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One open request per email address.
CREATE UNIQUE INDEX IF NOT EXISTS access_requests_one_pending_per_email_idx
  ON public.access_requests (email)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS access_requests_status_created_idx
  ON public.access_requests (status, created_at DESC);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.access_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.access_requests TO service_role;

-- ── Public submission ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_access_request(
  full_name_value TEXT,
  email_value TEXT,
  employee_id_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_name TEXT := trim(coalesce(full_name_value, ''));
  normalized_email TEXT := lower(trim(coalesce(email_value, '')));
  normalized_employee_id TEXT := trim(coalesce(employee_id_value, ''));
BEGIN
  IF length(normalized_name) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Enter your full name.'
      USING ERRCODE = '22023';
  END IF;

  IF length(normalized_email) > 320
    OR normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  THEN
    RAISE EXCEPTION 'Enter a valid work email address.'
      USING ERRCODE = '22023';
  END IF;

  IF length(normalized_employee_id) NOT BETWEEN 1 AND 64 THEN
    RAISE EXCEPTION 'Enter your employee ID.'
      USING ERRCODE = '22023';
  END IF;

  -- Anonymous callers can reach this function, so cap the intake rate.
  IF (
    SELECT count(*)
    FROM public.access_requests AS request
    WHERE request.created_at > now() - INTERVAL '1 hour'
  ) >= 30 THEN
    RAISE EXCEPTION 'Too many access requests right now. Please try again later.'
      USING ERRCODE = '54000';
  END IF;

  -- A repeat submission while a request is open is accepted silently, so the
  -- form never reveals whether an address is already in the queue.
  INSERT INTO public.access_requests (full_name, email, employee_id)
  VALUES (normalized_name, normalized_email, normalized_employee_id)
  ON CONFLICT (email) WHERE status = 'pending' DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_access_request(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_access_request(TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;

-- ── HR review ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_access_requests(
  status_filter TEXT DEFAULT 'pending'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF status_filter NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Unknown access request status'
      USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', request.id,
        'fullName', request.full_name,
        'email', request.email,
        'employeeId', request.employee_id,
        'status', request.status,
        'reviewNote', request.review_note,
        'reviewedAt', request.reviewed_at,
        'createdAt', request.created_at,
        'matchedStaff', (
          SELECT jsonb_build_object(
            'id', staff.id,
            'name', staff.name,
            'nameEn', staff.name_en,
            'status', staff.status
          )
          FROM public.staff AS staff
          WHERE lower(staff.employee_id) = lower(request.employee_id)
          ORDER BY staff.created_at
          LIMIT 1
        ),
        'accountStatus', coalesce((
          SELECT CASE
            WHEN account.email_confirmed_at IS NOT NULL THEN 'active'
            ELSE 'invited'
          END
          FROM auth.users AS account
          WHERE lower(account.email) = request.email
          LIMIT 1
        ), 'none')
      )
      ORDER BY request.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO result
  FROM (
    SELECT *
    FROM public.access_requests AS candidate
    WHERE candidate.status = status_filter
    ORDER BY candidate.created_at DESC
    LIMIT 200
  ) AS request;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_access_request(
  target_request_id UUID,
  note_value TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF length(coalesce(note_value, '')) > 500 THEN
    RAISE EXCEPTION 'Keep the note under 500 characters.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.access_requests
  SET
    status = 'rejected',
    review_note = nullif(trim(note_value), ''),
    reviewed_by = (SELECT auth.uid()),
    reviewed_at = now()
  WHERE id = target_request_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This request was already reviewed or no longer exists.'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.list_access_requests(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_access_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_access_requests(TEXT)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_access_request(UUID, TEXT)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
