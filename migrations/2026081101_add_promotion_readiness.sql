-- Admin-only promotion readiness derived from active skills and the single
-- active job-title level immediately above each officer's current title.
-- Requires 2026073001_add_department_scoped_skill_requirements.sql and
-- 2026080401_add_staff_photo.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_promotion_readiness(
  target_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  readiness JSONB;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  WITH staff_context AS (
    SELECT
      staff.id AS staff_id,
      coalesce(staff.employee_id, staff.staff_id) AS employee_id,
      staff.name,
      staff.name_en,
      staff.photo_url,
      current_title.id AS current_title_id,
      current_title.name AS current_title_name,
      current_title.name_en AS current_title_name_en,
      current_title.rank_order AS current_rank_order,
      current_title.position_scope AS current_position_scope,
      next_title.id AS target_title_id,
      next_title.name AS target_title_name,
      next_title.name_en AS target_title_name_en,
      next_title.rank_order AS target_rank_order,
      next_title.position_scope AS target_position_scope,
      coalesce(current_position.org_unit_id, placement.org_unit_id)
        AS department_id,
      coalesce(current_unit.name, placement_unit.name) AS department_name,
      coalesce(current_position.office_id, placement.office_id) AS office_id,
      coalesce(current_office.name, placement_office.name) AS office_name
    FROM public.staff AS staff
    LEFT JOIN public.job_titles AS current_title
      ON current_title.id = staff.job_title_id
    LEFT JOIN LATERAL (
      SELECT title.*
      FROM public.job_titles AS title
      WHERE title.is_active
        AND current_title.rank_order IS NOT NULL
        AND title.rank_order < current_title.rank_order
      ORDER BY title.rank_order DESC, title.name
      LIMIT 1
    ) AS next_title ON true
    LEFT JOIN LATERAL (
      SELECT position.org_unit_id, position.office_id
      FROM public.position_assignments AS assignment
      JOIN public.positions AS position ON position.id = assignment.position_id
      WHERE assignment.staff_id = staff.id
        AND assignment.end_date IS NULL
      ORDER BY assignment.created_at DESC
      LIMIT 1
    ) AS current_position ON true
    LEFT JOIN public.staff_placements AS placement
      ON placement.staff_id = staff.id
    LEFT JOIN public.org_units AS current_unit
      ON current_unit.id = current_position.org_unit_id
    LEFT JOIN public.org_units AS placement_unit
      ON placement_unit.id = placement.org_unit_id
    LEFT JOIN public.org_offices AS current_office
      ON current_office.id = current_position.office_id
    LEFT JOIN public.org_offices AS placement_office
      ON placement_office.id = placement.office_id
    WHERE staff.status = 'active'
      AND (target_staff_id IS NULL OR staff.id = target_staff_id)
  ), evaluated AS (
    SELECT
      context.*,
      coalesce(requirements.required_skill_count, 0) AS required_skill_count,
      coalesce(requirements.met_skill_count, 0) AS met_skill_count
    FROM staff_context AS context
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE requirement.is_required)::INTEGER
          AS required_skill_count,
        count(*) FILTER (
          WHERE requirement.is_required
            AND current_skill.proficiency >= requirement.minimum_proficiency
        )::INTEGER AS met_skill_count
      FROM public.job_title_skill_requirements AS requirement
      LEFT JOIN public.staff_skill_history AS current_skill
        ON current_skill.staff_id = context.staff_id
        AND current_skill.skill_id = requirement.skill_id
        AND current_skill.effective_to IS NULL
      WHERE requirement.job_title_id = context.target_title_id
        AND (
          (
            context.department_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.job_title_skill_requirements AS scoped_requirement
              WHERE scoped_requirement.job_title_id = context.target_title_id
                AND scoped_requirement.org_unit_id = context.department_id
            )
            AND requirement.org_unit_id = context.department_id
          )
          OR (
            NOT EXISTS (
              SELECT 1
              FROM public.job_title_skill_requirements AS scoped_requirement
              WHERE scoped_requirement.job_title_id = context.target_title_id
                AND scoped_requirement.org_unit_id = context.department_id
                AND context.department_id IS NOT NULL
            )
            AND requirement.org_unit_id IS NULL
          )
        )
    ) AS requirements ON true
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'staffId', evaluated.staff_id,
        'employeeId', evaluated.employee_id,
        'name', evaluated.name,
        'nameEn', evaluated.name_en,
        'photoUrl', evaluated.photo_url,
        'departmentName', evaluated.department_name,
        'officeName', evaluated.office_name,
        'currentJobTitle', CASE
          WHEN evaluated.current_title_id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'id', evaluated.current_title_id,
            'name', evaluated.current_title_name,
            'nameEn', evaluated.current_title_name_en,
            'rankOrder', evaluated.current_rank_order,
            'positionScope', evaluated.current_position_scope
          )
        END,
        'targetJobTitle', CASE
          WHEN evaluated.target_title_id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'id', evaluated.target_title_id,
            'name', evaluated.target_title_name,
            'nameEn', evaluated.target_title_name_en,
            'rankOrder', evaluated.target_rank_order,
            'positionScope', evaluated.target_position_scope
          )
        END,
        'requiredSkillCount', evaluated.required_skill_count,
        'metSkillCount', evaluated.met_skill_count,
        'status', CASE
          WHEN evaluated.current_title_id IS NULL THEN 'no_current_title'
          WHEN evaluated.target_title_id IS NULL THEN 'no_next_title'
          WHEN evaluated.required_skill_count = 0 THEN 'not_configured'
          WHEN evaluated.met_skill_count = evaluated.required_skill_count
            THEN 'ready'
          ELSE 'not_ready'
        END
      )
      ORDER BY
        CASE
          WHEN evaluated.required_skill_count > 0
            AND evaluated.met_skill_count = evaluated.required_skill_count
            THEN 0
          ELSE 1
        END,
        evaluated.current_rank_order,
        evaluated.name
    ),
    '[]'::jsonb
  )
  INTO readiness
  FROM evaluated;

  RETURN readiness;
END;
$$;

REVOKE ALL ON FUNCTION public.get_promotion_readiness(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_promotion_readiness(UUID)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
