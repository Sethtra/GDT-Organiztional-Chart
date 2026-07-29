-- Emergency recovery for migrations/2026072911_cleanup_legacy_dummy_staff.sql.
-- Run only with a direct database-owner connection after reviewing the
-- private backup counts. The normal application must not execute this file.

BEGIN;

INSERT INTO public.staff
SELECT (
  jsonb_populate_record(NULL::public.staff, backup.row_data)
).*
FROM private.legacy_hr_cleanup_staff AS backup
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff_sensitive
SELECT (
  jsonb_populate_record(NULL::public.staff_sensitive, backup.row_data)
).*
FROM private.legacy_hr_cleanup_sensitive AS backup
ON CONFLICT (staff_id) DO NOTHING;

INSERT INTO public.staff_skill_history
SELECT (
  jsonb_populate_record(NULL::public.staff_skill_history, backup.row_data)
).*
FROM private.legacy_hr_cleanup_skills AS backup
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.position_assignments
  DISABLE TRIGGER position_assignments_one_active;

INSERT INTO public.position_assignments
SELECT (
  jsonb_populate_record(NULL::public.position_assignments, backup.row_data)
).*
FROM private.legacy_hr_cleanup_assignments AS backup
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.position_assignments
  ENABLE TRIGGER position_assignments_one_active;

UPDATE public.charts AS chart
SET
  nodes = backup.nodes,
  edges = backup.edges
FROM private.legacy_hr_cleanup_charts AS backup
WHERE backup.source_table = 'charts'
  AND backup.source_id = chart.id::TEXT;

DO $restore_legacy_chart$
BEGIN
  IF to_regclass('public.org_chart_data') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE public.org_chart_data AS chart
      SET
        nodes = backup.nodes,
        edges = backup.edges
      FROM private.legacy_hr_cleanup_charts AS backup
      WHERE backup.source_table = 'org_chart_data'
        AND backup.source_id = chart.id::TEXT
    $sql$;
  END IF;
END
$restore_legacy_chart$;

COMMIT;
