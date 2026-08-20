-- Add delete RPC operations for Job Architecture (job titles, skills, requirements)
-- Requires 2026073001_add_department_scoped_skill_requirements.sql and
-- 2026081102_remove_legacy_skill_rpc_overloads.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_job_title(
  target_job_title_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF target_job_title_id IS NULL THEN
    RAISE EXCEPTION 'Target job title ID is required'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.staff
    WHERE job_title_id = target_job_title_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete job title because it is currently assigned to one or more staff members'
      USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.positions
    WHERE job_title_id = target_job_title_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete job title because it is referenced by chart position nodes'
      USING ERRCODE = '23503';
  END IF;

  -- Remove associated requirements first
  DELETE FROM public.job_title_skill_requirements
  WHERE job_title_id = target_job_title_id;

  DELETE FROM public.job_titles
  WHERE id = target_job_title_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job title not found'
      USING ERRCODE = 'P0002';
  END IF;

END;
$$;

CREATE OR REPLACE FUNCTION public.remove_job_title_skill_requirement(
  target_job_title_id UUID,
  target_skill_id UUID,
  target_org_unit_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF target_job_title_id IS NULL OR target_skill_id IS NULL THEN
    RAISE EXCEPTION 'Job title ID and Skill ID are required'
      USING ERRCODE = '22023';
  END IF;

  IF target_org_unit_id IS NULL THEN
    DELETE FROM public.job_title_skill_requirements
    WHERE job_title_id = target_job_title_id
      AND skill_id = target_skill_id
      AND org_unit_id IS NULL;
  ELSE
    DELETE FROM public.job_title_skill_requirements
    WHERE job_title_id = target_job_title_id
      AND skill_id = target_skill_id
      AND org_unit_id = target_org_unit_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job title skill requirement not found'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_skill_catalog_item(
  target_skill_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF target_skill_id IS NULL THEN
    RAISE EXCEPTION 'Target skill ID is required'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.staff_skills
    WHERE skill_id = target_skill_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete skill because it is currently recorded on staff profile(s)'
      USING ERRCODE = '23503';
  END IF;

  -- Remove any job requirements referencing this skill
  DELETE FROM public.job_title_skill_requirements
  WHERE skill_id = target_skill_id;

  DELETE FROM public.skills
  WHERE id = target_skill_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Skill catalog item not found'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_job_title(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_job_title(UUID)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.remove_job_title_skill_requirement(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_job_title_skill_requirement(UUID, UUID, UUID)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_skill_catalog_item(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_skill_catalog_item(UUID)
  TO authenticated, service_role;

-- Ensure approved English name and code exist for Trainee Officer
UPDATE public.job_titles
SET
  name_en = 'Trainee Officer',
  code = COALESCE(NULLIF(code, ''), 'TRAINEE_OFFICER')
WHERE name = 'មន្ត្រីកម្មសិក្សា' AND (name_en IS NULL OR name_en = '');

NOTIFY pgrst, 'reload schema';

COMMIT;
