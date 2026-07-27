-- Secure, GDT-wide staff directory and privacy-safe chart reads.
-- This migration preserves all existing staff, chart, node, edge, position,
-- and assignment rows. Legacy owner_id and staff_id columns remain available
-- for reconciliation during the later cleanup dry run.
-- Requires 2026072701_add_hr_admin_rbac.sql.

BEGIN;

ALTER TABLE public.staff ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS age SMALLINT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS gender TEXT
  NOT NULL DEFAULT 'unspecified';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS status TEXT
  NOT NULL DEFAULT 'active';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS created_by UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS updated_by UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.staff
SET employee_id = NULLIF(trim(staff_id), '')
WHERE employee_id IS NULL
  AND NULLIF(trim(staff_id), '') IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_age_range_check'
      AND conrelid = 'public.staff'::regclass
  ) THEN
    ALTER TABLE public.staff
      ADD CONSTRAINT staff_age_range_check
      CHECK (age IS NULL OR age BETWEEN 0 AND 120) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_gender_check'
      AND conrelid = 'public.staff'::regclass
  ) THEN
    ALTER TABLE public.staff
      ADD CONSTRAINT staff_gender_check
      CHECK (gender IN ('female', 'male', 'other', 'unspecified')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_status_check'
      AND conrelid = 'public.staff'::regclass
  ) THEN
    ALTER TABLE public.staff
      ADD CONSTRAINT staff_status_check
      CHECK (status IN ('active', 'archived')) NOT VALID;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS staff_employee_id_lookup_idx
  ON public.staff (lower(employee_id))
  WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS staff_email_lookup_idx
  ON public.staff (lower(email))
  WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS staff_status_name_idx
  ON public.staff (status, name, name_en);

CREATE TABLE IF NOT EXISTS public.staff_sensitive (
  staff_id UUID PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
  national_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_sensitive_national_id_uidx
  ON public.staff_sensitive (lower(national_id))
  WHERE national_id IS NOT NULL AND length(trim(national_id)) > 0;

DROP TRIGGER IF EXISTS staff_sensitive_set_updated_at
  ON public.staff_sensitive;
CREATE TRIGGER staff_sensitive_set_updated_at
  BEFORE UPDATE ON public.staff_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.has_accepted_chart_membership(
  target_chart_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.charts AS chart
      WHERE chart.id = target_chart_id
        AND (
          chart.owner_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.chart_shares AS share
            WHERE share.chart_id = chart.id
              AND lower(share.shared_email) =
                lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
              AND share.status = 'accepted'
          )
        )
    );
$$;

-- Public links are always read-only. Every write path that already depends on
-- can_edit_chart() (positions, versions, thumbnails, and legacy callers) now
-- requires ownership or an accepted edit invitation.
CREATE OR REPLACE FUNCTION public.can_edit_chart(target_chart_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.charts AS chart
    WHERE chart.id = target_chart_id
      AND (
        chart.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.chart_shares AS share
          WHERE share.chart_id = chart.id
            AND lower(share.shared_email) =
              lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
            AND share.status = 'accepted'
            AND share.access_level = 'edit'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_staff_profile(
  target_staff_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.is_hr_admin()
    OR EXISTS (
      SELECT 1
      FROM public.position_assignments AS assignment
      JOIN public.positions AS position
        ON position.id = assignment.position_id
      WHERE assignment.staff_id = target_staff_id
        AND public.has_accepted_chart_membership(position.chart_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.masked_staff_national_id(
  target_staff_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  raw_value TEXT;
  raw_length INTEGER;
BEGIN
  IF NOT public.can_view_staff_profile(target_staff_id) THEN
    RAISE EXCEPTION 'Not authorized to view this staff profile'
      USING ERRCODE = '42501';
  END IF;

  SELECT national_id
  INTO raw_value
  FROM public.staff_sensitive
  WHERE staff_id = target_staff_id;

  IF raw_value IS NULL OR length(trim(raw_value)) = 0 THEN
    RETURN NULL;
  END IF;

  raw_value := trim(raw_value);
  raw_length := length(raw_value);
  IF raw_length <= 4 THEN
    RETURN repeat('•', raw_length);
  END IF;
  RETURN repeat('•', raw_length - 4) || right(raw_value, 4);
END;
$$;

REVOKE ALL ON FUNCTION public.has_accepted_chart_membership(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_staff_profile(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.masked_staff_national_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_accepted_chart_membership(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_staff_profile(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.masked_staff_national_id(UUID)
  TO authenticated, service_role;

-- Direct chart-table reads are raw and therefore limited to owners and
-- accepted invitees. Public visitors use get_chart_for_viewer(), which strips
-- personal and relational HR fields from node JSON.
DROP POLICY IF EXISTS "View accessible charts" ON public.charts;
DROP POLICY IF EXISTS "Members read raw charts" ON public.charts;
CREATE POLICY "Members read raw charts"
  ON public.charts
  FOR SELECT
  TO authenticated
  USING (public.has_accepted_chart_membership(id));

DROP POLICY IF EXISTS "Edit permitted charts" ON public.charts;
DROP POLICY IF EXISTS "Invited editors update charts" ON public.charts;
CREATE POLICY "Invited editors update charts"
  ON public.charts
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.chart_shares AS share
      WHERE share.chart_id = charts.id
        AND lower(share.shared_email) =
          lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
        AND share.status = 'accepted'
        AND share.access_level = 'edit'
    )
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.chart_shares AS share
      WHERE share.chart_id = charts.id
        AND lower(share.shared_email) =
          lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
        AND share.status = 'accepted'
        AND share.access_level = 'edit'
    )
  );

CREATE OR REPLACE FUNCTION public.get_chart_for_viewer(
  target_chart_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  chart_record public.charts%ROWTYPE;
  safe_nodes JSONB;
  viewer_access TEXT;
BEGIN
  SELECT *
  INTO chart_record
  FROM public.charts
  WHERE id = target_chart_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL THEN
    IF chart_record.owner_id = (SELECT auth.uid()) THEN
      viewer_access := 'owner';
    ELSE
      SELECT share.access_level
      INTO viewer_access
      FROM public.chart_shares AS share
      WHERE share.chart_id = target_chart_id
        AND lower(share.shared_email) =
          lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
        AND share.status = 'accepted'
      ORDER BY share.created_at ASC
      LIMIT 1;
    END IF;
  END IF;

  IF viewer_access IS NOT NULL THEN
    RETURN to_jsonb(chart_record)
      || jsonb_build_object('viewer_access', viewer_access);
  END IF;

  IF NOT chart_record.is_public THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(
    jsonb_agg(
      (node - 'data')
      || jsonb_build_object(
        'data',
        coalesce(node -> 'data', '{}'::jsonb)
          - ARRAY[
              'nationalId',
              'national_id',
              'phone',
              'email',
              'address',
              'maritalStatus',
              'marital_status',
              'education',
              'skill',
              'skills',
              'history',
              'siblings',
              'age',
              'gender',
              'dbStaffId',
              'dbAssignmentId',
              'positionId'
            ]::text[]
      )
    ),
    '[]'::jsonb
  )
  INTO safe_nodes
  FROM jsonb_array_elements(coalesce(chart_record.nodes, '[]'::jsonb)) AS node;

  RETURN jsonb_build_object(
    'id', chart_record.id,
    'owner_id', NULL,
    'folder_id', NULL,
    'name', chart_record.name,
    'nodes', safe_nodes,
    'edges', chart_record.edges,
    'thumbnail_url', chart_record.thumbnail_url,
    'is_public', chart_record.is_public,
    'public_access_level', 'view',
    'created_at', chart_record.created_at,
    'updated_at', chart_record.updated_at,
    'viewer_access', 'public'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_chart_for_viewer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chart_for_viewer(UUID)
  TO anon, authenticated, service_role;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_sensitive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View staff through accessible positions" ON public.staff;
DROP POLICY IF EXISTS "Editors create staff" ON public.staff;
DROP POLICY IF EXISTS "Editors update staff" ON public.staff;
DROP POLICY IF EXISTS "Owners delete unreferenced staff" ON public.staff;
DROP POLICY IF EXISTS "Authorized members read assigned staff" ON public.staff;
DROP POLICY IF EXISTS "HR administrators create staff" ON public.staff;
DROP POLICY IF EXISTS "HR administrators update staff" ON public.staff;
DROP POLICY IF EXISTS "HR administrators archive staff" ON public.staff;

CREATE POLICY "Authorized members read assigned staff"
  ON public.staff
  FOR SELECT
  TO authenticated
  USING (public.can_view_staff_profile(id));

CREATE POLICY "HR administrators create staff"
  ON public.staff
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "HR administrators update staff"
  ON public.staff
  FOR UPDATE
  TO authenticated
  USING (public.is_hr_admin())
  WITH CHECK (public.is_hr_admin());

-- Staff records are archived through status; browser roles cannot hard-delete.
DROP POLICY IF EXISTS "HR administrators read sensitive staff"
  ON public.staff_sensitive;
DROP POLICY IF EXISTS "HR administrators create sensitive staff"
  ON public.staff_sensitive;
DROP POLICY IF EXISTS "HR administrators update sensitive staff"
  ON public.staff_sensitive;

CREATE POLICY "HR administrators read sensitive staff"
  ON public.staff_sensitive
  FOR SELECT
  TO authenticated
  USING (public.is_hr_admin());

CREATE POLICY "HR administrators create sensitive staff"
  ON public.staff_sensitive
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "HR administrators update sensitive staff"
  ON public.staff_sensitive
  FOR UPDATE
  TO authenticated
  USING (public.is_hr_admin())
  WITH CHECK (public.is_hr_admin());

REVOKE ALL ON TABLE public.staff FROM anon;
REVOKE ALL ON TABLE public.staff_sensitive FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff_sensitive TO authenticated;
GRANT ALL ON TABLE public.staff, public.staff_sensitive TO service_role;

-- Assignment history is profile data. Public visitors receive no direct rows.
DROP POLICY IF EXISTS "View assignments for accessible charts"
  ON public.position_assignments;
DROP POLICY IF EXISTS "Members read assignment history"
  ON public.position_assignments;
CREATE POLICY "Members read assignment history"
  ON public.position_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.is_hr_admin()
    OR EXISTS (
      SELECT 1
      FROM public.positions AS position
      WHERE position.id = position_assignments.position_id
        AND public.has_accepted_chart_membership(position.chart_id)
    )
  );

REVOKE ALL ON TABLE public.position_assignments FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.position_assignments
  TO authenticated;

COMMIT;
