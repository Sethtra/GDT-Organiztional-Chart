-- Stable job-title, department, office, and reporting-position configuration.
-- The hierarchy trigger from 2026072703 remains the final validation boundary.
-- Requires 2026072709_add_job_architecture_api.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_position_configuration_context(
  target_position_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  context JSONB;
  target_chart_id UUID;
BEGIN
  IF NOT public.can_manage_position_assignment(target_position_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this position'
      USING ERRCODE = '42501';
  END IF;

  SELECT position.chart_id INTO target_chart_id
  FROM public.positions AS position
  WHERE position.id = target_position_id;

  SELECT jsonb_build_object(
    'positionId', position.id,
    'jobTitleId', position.job_title_id,
    'orgUnitId', position.org_unit_id,
    'officeId', position.office_id,
    'reportsToPositionId', position.reports_to_position_id,
    'jobTitles', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', title.id,
        'name', title.name,
        'nameEn', title.name_en,
        'rankOrder', title.rank_order,
        'positionScope', title.position_scope
      ) ORDER BY title.rank_order, title.name)
      FROM public.job_titles AS title
      WHERE title.is_active
    ), '[]'::jsonb),
    'supervisorPositions', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'positionId', supervisor.id,
        'nodeId', supervisor.node_id,
        'title', coalesce(supervisor_title.name, supervisor.title, 'Untitled position'),
        'jobTitleId', supervisor.job_title_id,
        'rankOrder', supervisor_title.rank_order,
        'positionScope', supervisor_title.position_scope,
        'orgUnitId', supervisor.org_unit_id,
        'officeId', supervisor.office_id,
        'departmentName', coalesce(unit.name, supervisor.department),
        'officeName', coalesce(office.name, supervisor.office),
        'occupantName', occupant.name
      ) ORDER BY supervisor_title.rank_order, supervisor.node_id)
      FROM public.positions AS supervisor
      LEFT JOIN public.job_titles AS supervisor_title
        ON supervisor_title.id = supervisor.job_title_id
      LEFT JOIN public.org_units AS unit ON unit.id = supervisor.org_unit_id
      LEFT JOIN public.org_offices AS office ON office.id = supervisor.office_id
      LEFT JOIN LATERAL (
        SELECT staff.name
        FROM public.position_assignments AS assignment
        JOIN public.staff AS staff ON staff.id = assignment.staff_id
        WHERE assignment.position_id = supervisor.id
          AND assignment.end_date IS NULL
        ORDER BY assignment.created_at DESC
        LIMIT 1
      ) AS occupant ON true
      WHERE supervisor.chart_id = target_chart_id
        AND supervisor.id <> target_position_id
    ), '[]'::jsonb)
  )
  INTO context
  FROM public.positions AS position
  WHERE position.id = target_position_id;

  IF context IS NULL THEN
    RAISE EXCEPTION 'Position not found'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN context;
END;
$$;

CREATE OR REPLACE FUNCTION public.configure_chart_position(
  target_position_id UUID,
  target_job_title_id UUID,
  target_org_unit_id UUID,
  target_office_id UUID,
  target_reports_to_position_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.can_manage_position_assignment(target_position_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this position'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.positions
  SET
    job_title_id = target_job_title_id,
    org_unit_id = target_org_unit_id,
    office_id = target_office_id,
    reports_to_position_id = target_reports_to_position_id,
    department = (
      SELECT unit.name FROM public.org_units AS unit
      WHERE unit.id = target_org_unit_id
    ),
    office = (
      SELECT office.name FROM public.org_offices AS office
      WHERE office.id = target_office_id
    ),
    title = coalesce((
      SELECT job_title.name FROM public.job_titles AS job_title
      WHERE job_title.id = target_job_title_id
    ), title),
    updated_at = now()
  WHERE id = target_position_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Position not found'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_position_configuration_context(UUID)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.configure_chart_position(
  UUID, UUID, UUID, UUID, UUID
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_position_configuration_context(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.configure_chart_position(
  UUID, UUID, UUID, UUID, UUID
) TO authenticated, service_role;

COMMIT;
