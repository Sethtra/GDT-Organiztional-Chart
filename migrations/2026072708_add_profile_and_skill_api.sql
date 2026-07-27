-- Privacy-aware profile projection plus temporal staff skill administration.
-- Requires 2026072707_add_position_assignment_api.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_staff_profile(
  target_staff_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile JSONB;
  hr_access BOOLEAN;
BEGIN
  IF NOT public.can_view_staff_profile(target_staff_id) THEN
    RAISE EXCEPTION 'Not authorized to view this staff profile'
      USING ERRCODE = '42501';
  END IF;

  hr_access := public.is_hr_admin();

  SELECT
    jsonb_build_object(
      'id', staff.id,
      'employeeId', coalesce(staff.employee_id, staff.staff_id),
      'name', staff.name,
      'nameEn', staff.name_en,
      'age', staff.age,
      'gender', staff.gender,
      'status', staff.status,
      'phone', staff.phone,
      'email', staff.email,
      'address', staff.address,
      'maritalStatus', coalesce(staff.marital_status, 'unspecified'),
      'education', staff.education,
      'currentPosition', (
        SELECT jsonb_build_object(
          'positionId', position.id,
          'chartId', position.chart_id,
          'nodeId', position.node_id,
          'title', coalesce(job_title.name, position.title, 'Untitled position'),
          'departmentId', position.org_unit_id,
          'departmentName', coalesce(unit.name, position.department),
          'officeId', position.office_id,
          'officeName', coalesce(office.name, position.office)
        )
        FROM public.position_assignments AS assignment
        JOIN public.positions AS position ON position.id = assignment.position_id
        LEFT JOIN public.job_titles AS job_title
          ON job_title.id = position.job_title_id
        LEFT JOIN public.org_units AS unit ON unit.id = position.org_unit_id
        LEFT JOIN public.org_offices AS office ON office.id = position.office_id
        WHERE assignment.staff_id = staff.id
          AND assignment.end_date IS NULL
        ORDER BY assignment.created_at DESC
        LIMIT 1
      ),
      'assignmentHistory', coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', assignment.id,
            'staffId', assignment.staff_id,
            'position', jsonb_build_object(
              'positionId', position.id,
              'chartId', position.chart_id,
              'nodeId', position.node_id,
              'title', coalesce(job_title.name, position.title, 'Untitled position'),
              'departmentId', position.org_unit_id,
              'departmentName', coalesce(unit.name, position.department),
              'officeId', position.office_id,
              'officeName', coalesce(office.name, position.office)
            ),
            'joinedDate', coalesce(assignment.start_date, assignment.created_at::DATE),
            'leftDate', assignment.end_date,
            'reason', assignment.change_reason,
            'notes', assignment.notes
          )
          ORDER BY
            (assignment.end_date IS NULL) DESC,
            assignment.end_date DESC,
            assignment.start_date DESC
        )
        FROM public.position_assignments AS assignment
        JOIN public.positions AS position ON position.id = assignment.position_id
        LEFT JOIN public.job_titles AS job_title
          ON job_title.id = position.job_title_id
        LEFT JOIN public.org_units AS unit ON unit.id = position.org_unit_id
        LEFT JOIN public.org_offices AS office ON office.id = position.office_id
        WHERE assignment.staff_id = staff.id
      ), '[]'::jsonb),
      'skills', coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', skill_record.id,
            'staffId', skill_record.staff_id,
            'skill', jsonb_build_object(
              'id', skill.id,
              'name', skill.name,
              'description', skill.description,
              'isActive', skill.is_active
            ),
            'proficiency', skill_record.proficiency,
            'effectiveFrom', skill_record.effective_from,
            'effectiveTo', skill_record.effective_to,
            'notes', skill_record.notes
          )
          ORDER BY
            (skill_record.effective_to IS NULL) DESC,
            skill.name,
            skill_record.effective_from DESC
        )
        FROM public.staff_skill_history AS skill_record
        JOIN public.skills AS skill ON skill.id = skill_record.skill_id
        WHERE skill_record.staff_id = staff.id
      ), '[]'::jsonb)
    )
    || CASE
      WHEN hr_access THEN jsonb_build_object(
        'access', 'hr',
        'nationalId', sensitive.national_id
      )
      ELSE jsonb_build_object(
        'access', 'invited',
        'nationalIdMasked', public.masked_staff_national_id(staff.id)
      )
    END
  INTO profile
  FROM public.staff AS staff
  LEFT JOIN public.staff_sensitive AS sensitive
    ON sensitive.staff_id = staff.id
  WHERE staff.id = target_staff_id;

  IF profile IS NULL THEN
    RAISE EXCEPTION 'Staff record not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_hr_skill_catalog()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  catalog JSONB;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', skill.id,
    'name', skill.name,
    'description', skill.description,
    'isActive', skill.is_active
  ) ORDER BY skill.name), '[]'::jsonb)
  INTO catalog
  FROM public.skills AS skill;

  RETURN catalog;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_skill_catalog_item(
  target_skill_id UUID,
  skill_name TEXT,
  skill_description TEXT,
  skill_is_active BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_skill_id UUID;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;
  IF nullif(trim(skill_name), '') IS NULL THEN
    RAISE EXCEPTION 'Skill name is required'
      USING ERRCODE = '22023';
  END IF;

  IF target_skill_id IS NULL THEN
    INSERT INTO public.skills (
      name, description, is_active, created_by, updated_by
    )
    VALUES (
      trim(skill_name),
      nullif(trim(skill_description), ''),
      skill_is_active,
      (SELECT auth.uid()),
      (SELECT auth.uid())
    )
    RETURNING id INTO saved_skill_id;
  ELSE
    UPDATE public.skills
    SET
      name = trim(skill_name),
      description = nullif(trim(skill_description), ''),
      is_active = skill_is_active,
      updated_by = (SELECT auth.uid()),
      updated_at = now()
    WHERE id = target_skill_id
    RETURNING id INTO saved_skill_id;
  END IF;

  IF saved_skill_id IS NULL THEN
    RAISE EXCEPTION 'Skill not found'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN saved_skill_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_staff_skill_proficiency(
  target_staff_id UUID,
  target_skill_id UUID,
  proficiency_value SMALLINT,
  effective_date DATE,
  skill_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  created_record_id UUID;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;
  IF proficiency_value NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Proficiency must be between 1 and 5'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.staff_skill_history
  SET
    effective_to = effective_date,
    updated_by = (SELECT auth.uid()),
    updated_at = now()
  WHERE staff_id = target_staff_id
    AND skill_id = target_skill_id
    AND effective_to IS NULL
    AND effective_from <= effective_date;

  INSERT INTO public.staff_skill_history (
    staff_id,
    skill_id,
    proficiency,
    effective_from,
    effective_to,
    notes,
    created_by,
    updated_by
  )
  VALUES (
    target_staff_id,
    target_skill_id,
    proficiency_value,
    effective_date,
    NULL,
    nullif(trim(skill_notes), ''),
    (SELECT auth.uid()),
    (SELECT auth.uid())
  )
  RETURNING id INTO created_record_id;

  RETURN created_record_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_staff_profile(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hr_skill_catalog() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_skill_catalog_item(
  UUID, TEXT, TEXT, BOOLEAN
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_staff_skill_proficiency(
  UUID, UUID, SMALLINT, DATE, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_staff_profile(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_hr_skill_catalog()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_skill_catalog_item(
  UUID, TEXT, TEXT, BOOLEAN
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_staff_skill_proficiency(
  UUID, UUID, SMALLINT, DATE, TEXT
) TO authenticated, service_role;

COMMIT;
