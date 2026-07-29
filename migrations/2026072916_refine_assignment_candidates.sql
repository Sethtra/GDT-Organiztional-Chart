-- Give chart editors only the safe staff-table fields needed to filter
-- assignment candidates by position, department, and optional office.

BEGIN;

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

  SELECT coalesce(
    jsonb_agg(candidate ORDER BY candidate ->> 'name'),
    '[]'::jsonb
  )
  INTO candidates
  FROM (
    SELECT jsonb_build_object(
      'id', staff.id,
      'employeeId', coalesce(staff.employee_id, staff.staff_id),
      'name', staff.name,
      'nameEn', staff.name_en,
      'jobTitle', CASE
        WHEN staff_title.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', staff_title.id,
          'name', staff_title.name,
          'nameEn', staff_title.name_en,
          'rankOrder', staff_title.rank_order,
          'positionScope', staff_title.position_scope
        )
      END,
      'organizationalPlacement', CASE
        WHEN placement.staff_id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'departmentId', department.id,
          'departmentName', department.name,
          'officeId', placement_office.id,
          'officeName', placement_office.name
        )
      END,
      'currentPosition', CASE
        WHEN current_position.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'positionId', current_position.id,
          'chartId', current_position.chart_id,
          'nodeId', current_position.node_id,
          'title', coalesce(
            current_title.name,
            current_position.title,
            'Untitled position'
          ),
          'departmentId', current_position.org_unit_id,
          'departmentName', coalesce(
            current_unit.name,
            current_position.department
          ),
          'officeId', current_position.office_id,
          'officeName', coalesce(
            current_office.name,
            current_position.office
          )
        )
      END
    ) AS candidate
    FROM public.staff AS staff
    LEFT JOIN public.job_titles AS staff_title
      ON staff_title.id = staff.job_title_id
    LEFT JOIN public.staff_placements AS placement
      ON placement.staff_id = staff.id
    LEFT JOIN public.org_units AS department
      ON department.id = placement.org_unit_id
    LEFT JOIN public.org_offices AS placement_office
      ON placement_office.id = placement.office_id
    LEFT JOIN LATERAL (
      SELECT position.*
      FROM public.position_assignments AS assignment
      JOIN public.positions AS position
        ON position.id = assignment.position_id
      WHERE assignment.staff_id = staff.id
        AND assignment.end_date IS NULL
      ORDER BY assignment.created_at DESC
      LIMIT 1
    ) AS current_position ON true
    LEFT JOIN public.job_titles AS current_title
      ON current_title.id = current_position.job_title_id
    LEFT JOIN public.org_units AS current_unit
      ON current_unit.id = current_position.org_unit_id
    LEFT JOIN public.org_offices AS current_office
      ON current_office.id = current_position.office_id
    WHERE staff.status = 'active'
  ) AS candidate_rows;

  RETURN candidates;
END;
$$;

REVOKE ALL ON FUNCTION public.get_assignment_candidates(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignment_candidates(UUID)
  TO authenticated, service_role;

COMMIT;
