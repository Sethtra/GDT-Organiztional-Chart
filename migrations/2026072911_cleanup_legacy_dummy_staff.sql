-- Remove imported dummy occupants after preserving a private recovery copy.
-- Real HR-created staff are identified by created_by and are never targeted.
-- Organizational nodes, edges, departments, offices, and positions remain.
-- Requires 2026072710_add_position_configuration_api.sql.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.legacy_hr_cleanup_staff (
  staff_id UUID PRIMARY KEY,
  row_data JSONB NOT NULL,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private.legacy_hr_cleanup_assignments (
  assignment_id UUID PRIMARY KEY,
  row_data JSONB NOT NULL,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private.legacy_hr_cleanup_sensitive (
  staff_id UUID PRIMARY KEY,
  row_data JSONB NOT NULL,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private.legacy_hr_cleanup_skills (
  skill_history_id UUID PRIMARY KEY,
  row_data JSONB NOT NULL,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private.legacy_hr_cleanup_charts (
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source_table, source_id)
);

CREATE TABLE IF NOT EXISTS private.legacy_hr_cleanup_audit (
  cleanup_key TEXT PRIMARY KEY,
  backed_up_staff_count BIGINT NOT NULL,
  backed_up_assignment_count BIGINT NOT NULL,
  preserved_position_count BIGINT NOT NULL,
  preserved_chart_count BIGINT NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TEMPORARY TABLE legacy_hr_cleanup_control
ON COMMIT DROP
AS
SELECT NOT EXISTS (
  SELECT 1
  FROM private.legacy_hr_cleanup_audit
  WHERE cleanup_key = '20260729-remove-imported-dummy-occupants'
) AS should_run;

REVOKE ALL ON ALL TABLES IN SCHEMA private
  FROM PUBLIC, anon, authenticated;

INSERT INTO private.legacy_hr_cleanup_staff (staff_id, row_data)
SELECT staff.id, to_jsonb(staff)
FROM public.staff AS staff
WHERE staff.created_by IS NULL
  AND (SELECT should_run FROM pg_temp.legacy_hr_cleanup_control)
ON CONFLICT (staff_id) DO NOTHING;

INSERT INTO private.legacy_hr_cleanup_assignments (assignment_id, row_data)
SELECT assignment.id, to_jsonb(assignment)
FROM public.position_assignments AS assignment
JOIN private.legacy_hr_cleanup_staff AS legacy
  ON legacy.staff_id = assignment.staff_id
WHERE (SELECT should_run FROM pg_temp.legacy_hr_cleanup_control)
ON CONFLICT (assignment_id) DO NOTHING;

INSERT INTO private.legacy_hr_cleanup_sensitive (staff_id, row_data)
SELECT sensitive.staff_id, to_jsonb(sensitive)
FROM public.staff_sensitive AS sensitive
JOIN private.legacy_hr_cleanup_staff AS legacy
  ON legacy.staff_id = sensitive.staff_id
WHERE (SELECT should_run FROM pg_temp.legacy_hr_cleanup_control)
ON CONFLICT (staff_id) DO NOTHING;

INSERT INTO private.legacy_hr_cleanup_skills (skill_history_id, row_data)
SELECT skill_history.id, to_jsonb(skill_history)
FROM public.staff_skill_history AS skill_history
JOIN private.legacy_hr_cleanup_staff AS legacy
  ON legacy.staff_id = skill_history.staff_id
WHERE (SELECT should_run FROM pg_temp.legacy_hr_cleanup_control)
ON CONFLICT (skill_history_id) DO NOTHING;

INSERT INTO private.legacy_hr_cleanup_charts (
  source_table,
  source_id,
  nodes,
  edges
)
SELECT 'charts', chart.id::TEXT, chart.nodes, chart.edges
FROM public.charts AS chart
WHERE (SELECT should_run FROM pg_temp.legacy_hr_cleanup_control)
  AND EXISTS (
  SELECT 1
  FROM jsonb_array_elements(chart.nodes) AS node
  WHERE node -> 'data' ->> 'orgType' = 'individualNode'
)
ON CONFLICT (source_table, source_id) DO NOTHING;

DO $backup_legacy_chart$
BEGIN
  IF to_regclass('public.org_chart_data') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO private.legacy_hr_cleanup_charts (
        source_table,
        source_id,
        nodes,
        edges
      )
      SELECT 'org_chart_data', chart.id::TEXT, chart.nodes, chart.edges
      FROM public.org_chart_data AS chart
      WHERE (
        SELECT should_run FROM pg_temp.legacy_hr_cleanup_control
      )
        AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(chart.nodes) AS node
        WHERE node -> 'data' ->> 'orgType' = 'individualNode'
      )
      ON CONFLICT (source_table, source_id) DO NOTHING
    $sql$;
  END IF;
END
$backup_legacy_chart$;

INSERT INTO private.legacy_hr_cleanup_audit (
  cleanup_key,
  backed_up_staff_count,
  backed_up_assignment_count,
  preserved_position_count,
  preserved_chart_count
)
SELECT
  '20260729-remove-imported-dummy-occupants',
  (SELECT count(*) FROM private.legacy_hr_cleanup_staff),
  (SELECT count(*) FROM private.legacy_hr_cleanup_assignments),
  (SELECT count(*) FROM public.positions),
  (SELECT count(*) FROM public.charts)
WHERE (SELECT should_run FROM pg_temp.legacy_hr_cleanup_control)
ON CONFLICT (cleanup_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.strip_legacy_dummy_occupants(
  source_nodes JSONB
)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN jsonb_typeof(source_nodes) <> 'array' THEN source_nodes
    ELSE coalesce((
      SELECT jsonb_agg(
        CASE
          WHEN node -> 'data' ->> 'orgType' = 'individualNode'
            AND (
              nullif(node -> 'data' ->> 'dbStaffId', '') IS NULL
              OR EXISTS (
                SELECT 1
                FROM private.legacy_hr_cleanup_staff AS legacy
                WHERE legacy.staff_id::TEXT =
                  node -> 'data' ->> 'dbStaffId'
              )
            )
          THEN jsonb_set(
            node,
            '{data}',
            coalesce(node -> 'data', '{}'::JSONB) - ARRAY[
              'name',
              'nameEn',
              'staffId',
              'age',
              'gender',
              'phone',
              'email',
              'address',
              'maritalStatus',
              'nationalId',
              'siblings',
              'education',
              'skill',
              'skills',
              'joinDate',
              'history',
              'dbStaffId',
              'dbAssignmentId'
            ]::TEXT[],
            false
          )
          ELSE node
        END
        ORDER BY ordinal
      )
      FROM jsonb_array_elements(source_nodes)
        WITH ORDINALITY AS item(node, ordinal)
    ), '[]'::JSONB)
  END;
$$;

UPDATE public.charts AS chart
SET nodes = private.strip_legacy_dummy_occupants(chart.nodes)
WHERE (SELECT should_run FROM pg_temp.legacy_hr_cleanup_control)
  AND chart.nodes IS DISTINCT FROM
  private.strip_legacy_dummy_occupants(chart.nodes);

DO $clean_legacy_chart$
BEGIN
  IF to_regclass('public.org_chart_data') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE public.org_chart_data AS chart
      SET nodes = private.strip_legacy_dummy_occupants(chart.nodes)
      WHERE (
        SELECT should_run FROM pg_temp.legacy_hr_cleanup_control
      )
        AND chart.nodes IS DISTINCT FROM
        private.strip_legacy_dummy_occupants(chart.nodes)
    $sql$;
  END IF;
END
$clean_legacy_chart$;

DELETE FROM public.position_assignments AS assignment
USING private.legacy_hr_cleanup_staff AS legacy
WHERE assignment.staff_id = legacy.staff_id
  AND (SELECT should_run FROM pg_temp.legacy_hr_cleanup_control);

DELETE FROM public.staff AS staff
USING private.legacy_hr_cleanup_staff AS legacy
WHERE staff.id = legacy.staff_id
  AND staff.created_by IS NULL
  AND (SELECT should_run FROM pg_temp.legacy_hr_cleanup_control);

DO $verify_cleanup$
DECLARE
  expected_positions BIGINT;
  expected_charts BIGINT;
BEGIN
  IF (SELECT should_run FROM pg_temp.legacy_hr_cleanup_control) THEN
    SELECT preserved_position_count, preserved_chart_count
    INTO expected_positions, expected_charts
    FROM private.legacy_hr_cleanup_audit
    WHERE cleanup_key = '20260729-remove-imported-dummy-occupants';

    IF
      (SELECT count(*) FROM public.positions)
        IS DISTINCT FROM expected_positions
    THEN
      RAISE EXCEPTION 'Cleanup changed the number of position records';
    END IF;

    IF (SELECT count(*) FROM public.charts) IS DISTINCT FROM expected_charts
    THEN
      RAISE EXCEPTION 'Cleanup changed the number of chart records';
    END IF;

    IF EXISTS (SELECT 1 FROM public.staff WHERE created_by IS NULL) THEN
      RAISE EXCEPTION 'Legacy dummy staff remain after cleanup';
    END IF;
  END IF;
END
$verify_cleanup$;

DROP FUNCTION private.strip_legacy_dummy_occupants(JSONB);

COMMIT;
