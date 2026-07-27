-- Reusable job titles and validated Department -> Office -> Reporting Position
-- hierarchy. Existing position rows remain valid because new references are
-- nullable until the HR/editor reconciliation flow assigns them.
-- Requires 2026072702_secure_global_staff_directory.sql.

BEGIN;

ALTER TABLE public.org_units ADD COLUMN IF NOT EXISTS parent_id UUID
  REFERENCES public.org_units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS org_units_parent_idx
  ON public.org_units (parent_id);

CREATE TABLE IF NOT EXISTS public.job_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  name_en TEXT,
  rank_order INTEGER NOT NULL DEFAULT 100
    CHECK (rank_order BETWEEN 1 AND 1000),
  position_scope TEXT NOT NULL DEFAULT 'individual'
    CHECK (
      position_scope IN (
        'individual',
        'office',
        'department',
        'organization'
      )
    ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS job_titles_code_uidx
  ON public.job_titles (lower(code))
  WHERE code IS NOT NULL AND length(trim(code)) > 0;
CREATE UNIQUE INDEX IF NOT EXISTS job_titles_name_uidx
  ON public.job_titles (lower(name));

DROP TRIGGER IF EXISTS job_titles_set_updated_at ON public.job_titles;
CREATE TRIGGER job_titles_set_updated_at
  BEFORE UPDATE ON public.job_titles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS job_title_id UUID
  REFERENCES public.job_titles(id) ON DELETE RESTRICT;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS org_unit_id UUID
  REFERENCES public.org_units(id) ON DELETE RESTRICT;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS office_id UUID
  REFERENCES public.org_offices(id) ON DELETE RESTRICT;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS reports_to_position_id UUID
  REFERENCES public.positions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS positions_job_title_idx
  ON public.positions (job_title_id);
CREATE INDEX IF NOT EXISTS positions_org_office_idx
  ON public.positions (org_unit_id, office_id);
CREATE INDEX IF NOT EXISTS positions_reports_to_idx
  ON public.positions (reports_to_position_id);

CREATE OR REPLACE FUNCTION public.validate_position_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  current_scope TEXT;
  current_rank INTEGER;
  supervisor_scope TEXT;
  supervisor_rank INTEGER;
  supervisor_unit UUID;
  supervisor_office UUID;
  expected_parent_unit UUID;
BEGIN
  IF NEW.office_id IS NOT NULL THEN
    IF NEW.org_unit_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.org_offices AS office
      WHERE office.id = NEW.office_id
        AND office.unit_id = NEW.org_unit_id
    ) THEN
      RAISE EXCEPTION 'Selected office does not belong to selected department'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.reports_to_position_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.reports_to_position_id = NEW.id THEN
    RAISE EXCEPTION 'A position cannot report to itself'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    WITH RECURSIVE supervisors AS (
      SELECT position.id, position.reports_to_position_id
      FROM public.positions AS position
      WHERE position.id = NEW.reports_to_position_id
      UNION ALL
      SELECT parent.id, parent.reports_to_position_id
      FROM public.positions AS parent
      JOIN supervisors
        ON parent.id = supervisors.reports_to_position_id
    )
    SELECT 1 FROM supervisors WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Reporting hierarchy cannot contain a cycle'
      USING ERRCODE = '23514';
  END IF;

  SELECT title.position_scope, title.rank_order
  INTO current_scope, current_rank
  FROM public.job_titles AS title
  WHERE title.id = NEW.job_title_id;

  SELECT
    title.position_scope,
    title.rank_order,
    supervisor.org_unit_id,
    supervisor.office_id
  INTO
    supervisor_scope,
    supervisor_rank,
    supervisor_unit,
    supervisor_office
  FROM public.positions AS supervisor
  LEFT JOIN public.job_titles AS title
    ON title.id = supervisor.job_title_id
  WHERE supervisor.id = NEW.reports_to_position_id
    AND supervisor.chart_id = NEW.chart_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reporting position must belong to the same chart'
      USING ERRCODE = '23514';
  END IF;

  -- Legacy positions may not yet have job-title metadata. Preserve them until
  -- the reconciliation UI assigns complete hierarchy references.
  IF current_scope IS NULL OR supervisor_scope IS NULL THEN
    RETURN NEW;
  END IF;

  IF supervisor_rank >= current_rank THEN
    RAISE EXCEPTION 'Reporting position must have a higher job rank'
      USING ERRCODE = '23514';
  END IF;

  IF current_scope = 'individual' THEN
    IF NEW.office_id IS NULL OR supervisor_office IS DISTINCT FROM NEW.office_id
    THEN
      RAISE EXCEPTION 'Individual positions must report within their office'
        USING ERRCODE = '23514';
    END IF;
  ELSIF current_scope = 'office' THEN
    IF supervisor_unit IS DISTINCT FROM NEW.org_unit_id
      OR supervisor_scope NOT IN ('department', 'organization')
    THEN
      RAISE EXCEPTION
        'Office leadership must report to department or organization leadership'
        USING ERRCODE = '23514';
    END IF;
  ELSIF current_scope = 'department' THEN
    SELECT unit.parent_id
    INTO expected_parent_unit
    FROM public.org_units AS unit
    WHERE unit.id = NEW.org_unit_id;

    IF supervisor_scope <> 'organization'
      OR (
        expected_parent_unit IS NOT NULL
        AND supervisor_unit IS DISTINCT FROM expected_parent_unit
      )
    THEN
      RAISE EXCEPTION
        'Department leadership must report to parent organization leadership'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS positions_validate_hierarchy ON public.positions;
CREATE TRIGGER positions_validate_hierarchy
  BEFORE INSERT OR UPDATE OF
    chart_id,
    job_title_id,
    org_unit_id,
    office_id,
    reports_to_position_id
  ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.validate_position_hierarchy();

ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read job titles"
  ON public.job_titles;
DROP POLICY IF EXISTS "HR administrators create job titles"
  ON public.job_titles;
DROP POLICY IF EXISTS "HR administrators update job titles"
  ON public.job_titles;

CREATE POLICY "Authenticated users read job titles"
  ON public.job_titles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "HR administrators create job titles"
  ON public.job_titles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "HR administrators update job titles"
  ON public.job_titles
  FOR UPDATE TO authenticated
  USING (public.is_hr_admin())
  WITH CHECK (public.is_hr_admin());

GRANT SELECT, INSERT, UPDATE ON TABLE public.job_titles TO authenticated;
GRANT ALL ON TABLE public.job_titles TO service_role;

COMMIT;
