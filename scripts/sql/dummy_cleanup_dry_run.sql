-- Read-only dummy HR cleanup analysis.
-- Run only after migrations 2026072701-2026072705 are applied.
-- This file performs SELECT statements only.

SELECT
  (SELECT count(*) FROM public.charts) AS chart_count,
  (SELECT count(*) FROM public.positions) AS position_count,
  (SELECT count(*) FROM public.staff) AS staff_count,
  (SELECT count(*) FROM public.position_assignments) AS assignment_count,
  (
    SELECT count(*)
    FROM public.position_assignments
    WHERE end_date IS NULL
  ) AS active_assignment_count;

SELECT
  staff_id,
  count(*) AS active_position_count,
  array_agg(position_id ORDER BY position_id) AS position_ids
FROM public.position_assignments
WHERE end_date IS NULL
GROUP BY staff_id
HAVING count(*) > 1
ORDER BY active_position_count DESC, staff_id;

SELECT
  position_id,
  count(*) AS active_occupant_count,
  array_agg(staff_id ORDER BY staff_id) AS staff_ids
FROM public.position_assignments
WHERE end_date IS NULL
GROUP BY position_id
HAVING count(*) > 1
ORDER BY active_occupant_count DESC, position_id;

SELECT
  lower(trim(employee_id)) AS duplicate_employee_id,
  count(*) AS duplicate_count,
  array_agg(id ORDER BY id) AS staff_ids
FROM public.staff
WHERE employee_id IS NOT NULL AND length(trim(employee_id)) > 0
GROUP BY lower(trim(employee_id))
HAVING count(*) > 1
ORDER BY duplicate_count DESC, duplicate_employee_id;

SELECT
  lower(trim(email)) AS duplicate_email,
  count(*) AS duplicate_count,
  array_agg(id ORDER BY id) AS staff_ids
FROM public.staff
WHERE email IS NOT NULL AND length(trim(email)) > 0
GROUP BY lower(trim(email))
HAVING count(*) > 1
ORDER BY duplicate_count DESC, duplicate_email;

SELECT
  lower(trim(national_id)) AS duplicate_national_id,
  count(*) AS duplicate_count,
  array_agg(staff_id ORDER BY staff_id) AS staff_ids
FROM public.staff_sensitive
WHERE national_id IS NOT NULL AND length(trim(national_id)) > 0
GROUP BY lower(trim(national_id))
HAVING count(*) > 1
ORDER BY duplicate_count DESC, duplicate_national_id;

SELECT
  staff.id AS staff_id,
  staff.employee_id,
  staff.name,
  staff.name_en,
  chart.id AS chart_id,
  chart.name AS chart_name,
  position.id AS position_id,
  position.node_id,
  coalesce(job_title.name, position.title) AS position_title,
  unit.name AS department,
  office.name AS office
FROM public.staff
LEFT JOIN public.position_assignments AS assignment
  ON assignment.staff_id = staff.id
  AND assignment.end_date IS NULL
LEFT JOIN public.positions AS position
  ON position.id = assignment.position_id
LEFT JOIN public.charts AS chart
  ON chart.id = position.chart_id
LEFT JOIN public.job_titles AS job_title
  ON job_title.id = position.job_title_id
LEFT JOIN public.org_units AS unit
  ON unit.id = position.org_unit_id
LEFT JOIN public.org_offices AS office
  ON office.id = position.office_id
ORDER BY staff.name NULLS LAST, staff.name_en NULLS LAST, staff.id;
