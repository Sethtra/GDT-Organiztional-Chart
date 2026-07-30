-- Scope minimum-skill requirements by job title + department, not job
-- title alone. The same job title (e.g. "Officer") can require different
-- skills depending on which department the position sits in (IT vs.
-- Finance). A NULL org_unit_id is kept as an organization-wide default so
-- existing requirements saved before this migration keep applying
-- everywhere, unless a department-specific row overrides them.
-- Requires 2026072704_add_skills_and_requirements.sql and
-- 2026072709_add_job_architecture_api.sql.
--
-- NOT YET APPLIED. Review, then apply through the project's normal
-- database-rollout process (docs/database-rollout.md) after a fresh
-- backup — do not run this directly against the live project.

BEGIN;

ALTER TABLE public.job_title_skill_requirements
  ADD COLUMN IF NOT EXISTS org_unit_id UUID
    REFERENCES public.org_units(id) ON DELETE CASCADE;

-- A (job_title, skill) pair may now have one organization-wide default
-- (org_unit_id IS NULL) plus at most one row per department.
DROP INDEX IF EXISTS public.job_title_skill_requirements_job_title_id_skill_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS
  job_title_skill_requirements_scope_uidx
  ON public.job_title_skill_requirements (
    job_title_id, skill_id, coalesce(org_unit_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE OR REPLACE FUNCTION public.get_job_architecture()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  architecture JSONB;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', title.id,
      'code', title.code,
      'name', title.name,
      'nameEn', title.name_en,
      'rankOrder', title.rank_order,
      'positionScope', title.position_scope,
      'isActive', title.is_active,
      'requirements', coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', requirement.id,
            'jobTitleId', requirement.job_title_id,
            'orgUnitId', requirement.org_unit_id,
            'orgUnitName', unit.name,
            'skill', jsonb_build_object(
              'id', skill.id,
              'name', skill.name,
              'description', skill.description,
              'isActive', skill.is_active
            ),
            'minimumProficiency', requirement.minimum_proficiency,
            'isRequired', requirement.is_required
          )
          ORDER BY unit.name NULLS FIRST, skill.name
        )
        FROM public.job_title_skill_requirements AS requirement
        JOIN public.skills AS skill ON skill.id = requirement.skill_id
        LEFT JOIN public.org_units AS unit ON unit.id = requirement.org_unit_id
        WHERE requirement.job_title_id = title.id
      ), '[]'::jsonb)
    )
    ORDER BY title.rank_order, title.name
  ), '[]'::jsonb)
  INTO architecture
  FROM public.job_titles AS title;

  RETURN architecture;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_job_title_skill_requirement(
  target_job_title_id UUID,
  target_skill_id UUID,
  minimum_proficiency_value SMALLINT,
  is_required_value BOOLEAN DEFAULT true,
  target_org_unit_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_id UUID;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;
  IF minimum_proficiency_value NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Minimum proficiency must be between 1 and 5'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.job_title_skill_requirements (
    job_title_id,
    skill_id,
    org_unit_id,
    minimum_proficiency,
    is_required,
    created_by,
    updated_by
  )
  VALUES (
    target_job_title_id,
    target_skill_id,
    target_org_unit_id,
    minimum_proficiency_value,
    is_required_value,
    (SELECT auth.uid()),
    (SELECT auth.uid())
  )
  ON CONFLICT (job_title_id, skill_id, coalesce(org_unit_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE
  SET
    minimum_proficiency = EXCLUDED.minimum_proficiency,
    is_required = EXCLUDED.is_required,
    updated_by = (SELECT auth.uid()),
    updated_at = now()
  RETURNING id INTO saved_id;

  RETURN saved_id;
END;
$$;

-- Evaluates fit against the department-specific requirements when the
-- target position's department has any; otherwise falls back to the
-- organization-wide (org_unit_id IS NULL) defaults for that job title.
CREATE OR REPLACE FUNCTION public.evaluate_staff_job_fit(
  target_staff_id UUID,
  target_job_title_id UUID,
  target_org_unit_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  evaluation JSONB;
  has_department_specific BOOLEAN;
BEGIN
  IF NOT public.can_view_staff_profile(target_staff_id)
    AND NOT public.is_hr_admin()
  THEN
    RAISE EXCEPTION 'Not authorized to evaluate this staff member'
      USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.job_title_skill_requirements
    WHERE job_title_id = target_job_title_id
      AND org_unit_id = target_org_unit_id
      AND target_org_unit_id IS NOT NULL
  ) INTO has_department_specific;

  SELECT jsonb_build_object(
    'staffId', target_staff_id,
    'jobTitleId', target_job_title_id,
    'orgUnitId', target_org_unit_id,
    'isFit', coalesce(bool_and(
      NOT requirement.is_required
      OR coalesce(current_skill.proficiency, 0) >=
        requirement.minimum_proficiency
    ), true),
    'requirements', coalesce(jsonb_agg(
      jsonb_build_object(
        'skillId', skill.id,
        'skillName', skill.name,
        'minimumProficiency', requirement.minimum_proficiency,
        'currentProficiency', current_skill.proficiency,
        'isRequired', requirement.is_required,
        'status', CASE
          WHEN current_skill.proficiency IS NULL THEN 'missing'
          WHEN current_skill.proficiency < requirement.minimum_proficiency
            THEN 'below'
          ELSE 'met'
        END
      )
      ORDER BY skill.name
    ), '[]'::jsonb)
  )
  INTO evaluation
  FROM public.job_title_skill_requirements AS requirement
  JOIN public.skills AS skill ON skill.id = requirement.skill_id
  LEFT JOIN LATERAL (
    SELECT history.proficiency
    FROM public.staff_skill_history AS history
    WHERE history.staff_id = target_staff_id
      AND history.skill_id = requirement.skill_id
      AND history.effective_to IS NULL
    ORDER BY history.effective_from DESC
    LIMIT 1
  ) AS current_skill ON true
  WHERE requirement.job_title_id = target_job_title_id
    AND (
      (has_department_specific AND requirement.org_unit_id = target_org_unit_id)
      OR (NOT has_department_specific AND requirement.org_unit_id IS NULL)
    );

  RETURN coalesce(evaluation, jsonb_build_object(
    'staffId', target_staff_id,
    'jobTitleId', target_job_title_id,
    'orgUnitId', target_org_unit_id,
    'isFit', true,
    'requirements', '[]'::jsonb
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.set_job_title_skill_requirement(
  UUID, UUID, SMALLINT, BOOLEAN, UUID
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.evaluate_staff_job_fit(UUID, UUID, UUID)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.set_job_title_skill_requirement(
  UUID, UUID, SMALLINT, BOOLEAN, UUID
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_staff_job_fit(UUID, UUID, UUID)
  TO authenticated, service_role;

COMMIT;
