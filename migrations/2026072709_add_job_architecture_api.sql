-- HR-managed job titles, skill requirements, and auditable fit evaluation.
-- Requires 2026072708_add_profile_and_skill_api.sql.

BEGIN;

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
            'skill', jsonb_build_object(
              'id', skill.id,
              'name', skill.name,
              'description', skill.description,
              'isActive', skill.is_active
            ),
            'minimumProficiency', requirement.minimum_proficiency,
            'isRequired', requirement.is_required
          )
          ORDER BY skill.name
        )
        FROM public.job_title_skill_requirements AS requirement
        JOIN public.skills AS skill ON skill.id = requirement.skill_id
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

CREATE OR REPLACE FUNCTION public.save_job_title(
  target_job_title_id UUID,
  code_value TEXT,
  name_value TEXT,
  name_en_value TEXT,
  rank_order_value INTEGER,
  position_scope_value TEXT,
  is_active_value BOOLEAN DEFAULT true
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
  IF nullif(trim(name_value), '') IS NULL THEN
    RAISE EXCEPTION 'Job title name is required'
      USING ERRCODE = '22023';
  END IF;
  IF rank_order_value NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Rank order must be between 1 and 1000'
      USING ERRCODE = '22023';
  END IF;
  IF position_scope_value NOT IN (
    'individual', 'office', 'department', 'organization'
  ) THEN
    RAISE EXCEPTION 'Invalid position scope'
      USING ERRCODE = '22023';
  END IF;

  IF target_job_title_id IS NULL THEN
    INSERT INTO public.job_titles (
      code,
      name,
      name_en,
      rank_order,
      position_scope,
      is_active,
      created_by,
      updated_by
    )
    VALUES (
      nullif(trim(code_value), ''),
      trim(name_value),
      nullif(trim(name_en_value), ''),
      rank_order_value,
      position_scope_value,
      is_active_value,
      (SELECT auth.uid()),
      (SELECT auth.uid())
    )
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.job_titles
    SET
      code = nullif(trim(code_value), ''),
      name = trim(name_value),
      name_en = nullif(trim(name_en_value), ''),
      rank_order = rank_order_value,
      position_scope = position_scope_value,
      is_active = is_active_value,
      updated_by = (SELECT auth.uid()),
      updated_at = now()
    WHERE id = target_job_title_id
    RETURNING id INTO saved_id;
  END IF;

  IF saved_id IS NULL THEN
    RAISE EXCEPTION 'Job title not found'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN saved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_job_title_skill_requirement(
  target_job_title_id UUID,
  target_skill_id UUID,
  minimum_proficiency_value SMALLINT,
  is_required_value BOOLEAN DEFAULT true
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
    minimum_proficiency,
    is_required,
    created_by,
    updated_by
  )
  VALUES (
    target_job_title_id,
    target_skill_id,
    minimum_proficiency_value,
    is_required_value,
    (SELECT auth.uid()),
    (SELECT auth.uid())
  )
  ON CONFLICT (job_title_id, skill_id) DO UPDATE
  SET
    minimum_proficiency = EXCLUDED.minimum_proficiency,
    is_required = EXCLUDED.is_required,
    updated_by = (SELECT auth.uid()),
    updated_at = now()
  RETURNING id INTO saved_id;

  RETURN saved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_staff_job_fit(
  target_staff_id UUID,
  target_job_title_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  evaluation JSONB;
BEGIN
  IF NOT public.can_view_staff_profile(target_staff_id)
    AND NOT public.is_hr_admin()
  THEN
    RAISE EXCEPTION 'Not authorized to evaluate this staff member'
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'staffId', target_staff_id,
    'jobTitleId', target_job_title_id,
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
  WHERE requirement.job_title_id = target_job_title_id;

  RETURN coalesce(evaluation, jsonb_build_object(
    'staffId', target_staff_id,
    'jobTitleId', target_job_title_id,
    'isFit', true,
    'requirements', '[]'::jsonb
  ));
END;
$$;

REVOKE ALL ON FUNCTION public.get_job_architecture() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_job_title(
  UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_job_title_skill_requirement(
  UUID, UUID, SMALLINT, BOOLEAN
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.evaluate_staff_job_fit(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_job_architecture()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_job_title(
  UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_job_title_skill_requirement(
  UUID, UUID, SMALLINT, BOOLEAN
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_staff_job_fit(UUID, UUID)
  TO authenticated, service_role;

COMMIT;
