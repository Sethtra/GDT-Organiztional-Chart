-- Safe chart-editor assignment context. Candidate results contain only
-- identity and work-location fields needed to assign a position.
-- Requires 2026072706_add_staff_directory_api.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_chart_position(
  target_chart_id UUID,
  target_node_id TEXT,
  position_title TEXT,
  department_name TEXT,
  office_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_position_id UUID;
  resolved_unit_id UUID;
  resolved_office_id UUID;
BEGIN
  IF NOT public.can_edit_chart(target_chart_id)
    AND NOT public.is_hr_admin()
  THEN
    RAISE EXCEPTION 'Not authorized to manage this chart position'
      USING ERRCODE = '42501';
  END IF;

  IF nullif(trim(target_node_id), '') IS NULL THEN
    RAISE EXCEPTION 'Chart node ID is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT unit.id
  INTO resolved_unit_id
  FROM public.org_units AS unit
  WHERE lower(trim(unit.name)) = lower(trim(department_name))
  ORDER BY unit.sort_order, unit.id
  LIMIT 1;

  IF resolved_unit_id IS NOT NULL
    AND nullif(trim(office_name), '') IS NOT NULL
  THEN
    SELECT office.id
    INTO resolved_office_id
    FROM public.org_offices AS office
    WHERE office.unit_id = resolved_unit_id
      AND lower(trim(office.name)) = lower(trim(office_name))
    ORDER BY office.sort_order, office.id
    LIMIT 1;
  END IF;

  INSERT INTO public.positions (
    chart_id,
    node_id,
    title,
    department,
    office,
    org_unit_id,
    office_id
  )
  VALUES (
    target_chart_id,
    trim(target_node_id),
    nullif(trim(position_title), ''),
    nullif(trim(department_name), ''),
    nullif(trim(office_name), ''),
    resolved_unit_id,
    resolved_office_id
  )
  ON CONFLICT (chart_id, node_id) DO UPDATE
  SET
    title = EXCLUDED.title,
    department = EXCLUDED.department,
    office = EXCLUDED.office,
    org_unit_id = coalesce(EXCLUDED.org_unit_id, positions.org_unit_id),
    office_id = CASE
      WHEN EXCLUDED.org_unit_id IS NOT NULL THEN EXCLUDED.office_id
      ELSE positions.office_id
    END,
    updated_at = now()
  RETURNING id INTO saved_position_id;

  RETURN saved_position_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_assignment_candidates(
  target_position_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  candidates JSONB;
BEGIN
  IF NOT public.can_manage_position_assignment(target_position_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this position'
      USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(candidate ORDER BY candidate ->> 'name'), '[]'::jsonb)
  INTO candidates
  FROM (
    SELECT jsonb_build_object(
      'id', staff.id,
      'employeeId', coalesce(staff.employee_id, staff.staff_id),
      'name', staff.name,
      'nameEn', staff.name_en,
      'currentPosition', CASE
        WHEN current_position.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'positionId', current_position.id,
          'chartId', current_position.chart_id,
          'nodeId', current_position.node_id,
          'title', coalesce(job_title.name, current_position.title, 'Untitled position'),
          'departmentId', current_position.org_unit_id,
          'departmentName', coalesce(current_unit.name, current_position.department),
          'officeId', current_position.office_id,
          'officeName', coalesce(current_office.name, current_position.office)
        )
      END
    ) AS candidate
    FROM public.staff AS staff
    LEFT JOIN LATERAL (
      SELECT position.*
      FROM public.position_assignments AS assignment
      JOIN public.positions AS position ON position.id = assignment.position_id
      WHERE assignment.staff_id = staff.id
        AND assignment.end_date IS NULL
      ORDER BY assignment.created_at DESC
      LIMIT 1
    ) AS current_position ON true
    LEFT JOIN public.job_titles AS job_title
      ON job_title.id = current_position.job_title_id
    LEFT JOIN public.org_units AS current_unit
      ON current_unit.id = current_position.org_unit_id
    LEFT JOIN public.org_offices AS current_office
      ON current_office.id = current_position.office_id
    WHERE staff.status = 'active'
  ) AS candidate_rows;

  RETURN candidates;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_position_assignment_summary(
  target_position_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  summary JSONB;
BEGIN
  IF NOT public.can_manage_position_assignment(target_position_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this position'
      USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'positionId', position.id,
    'jobTitleId', position.job_title_id,
    'occupant', (
      SELECT jsonb_build_object(
        'assignmentId', assignment.id,
        'staffId', staff.id,
        'employeeId', coalesce(staff.employee_id, staff.staff_id),
        'name', staff.name,
        'nameEn', staff.name_en,
        'joinedDate', assignment.start_date
      )
      FROM public.position_assignments AS assignment
      JOIN public.staff AS staff ON staff.id = assignment.staff_id
      WHERE assignment.position_id = position.id
        AND assignment.end_date IS NULL
      ORDER BY assignment.created_at DESC
      LIMIT 1
    ),
    'history', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'assignmentId', assignment.id,
          'staffId', staff.id,
          'employeeId', coalesce(staff.employee_id, staff.staff_id),
          'name', staff.name,
          'nameEn', staff.name_en,
          'joinedDate', assignment.start_date,
          'leftDate', assignment.end_date,
          'reason', assignment.change_reason,
          'notes', assignment.notes
        )
        ORDER BY assignment.end_date DESC, assignment.created_at DESC
      )
      FROM public.position_assignments AS assignment
      JOIN public.staff AS staff ON staff.id = assignment.staff_id
      WHERE assignment.position_id = position.id
        AND assignment.end_date IS NOT NULL
    ), '[]'::jsonb)
  )
  INTO summary
  FROM public.positions AS position
  WHERE position.id = target_position_id;

  IF summary IS NULL THEN
    RAISE EXCEPTION 'Position not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN summary;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_chart_position(
  UUID, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_assignment_candidates(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_position_assignment_summary(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ensure_chart_position(
  UUID, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_assignment_candidates(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_position_assignment_summary(UUID)
  TO authenticated, service_role;

COMMIT;
