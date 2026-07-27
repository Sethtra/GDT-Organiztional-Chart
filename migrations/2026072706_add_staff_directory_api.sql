-- Transactional, HR-only staff directory operations and duplicate reporting.
-- Existing staff, assignments, positions, charts, nodes, and edges are read
-- but never deleted or rewritten by this migration.
-- Requires 2026072705_add_atomic_assignment_operations.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.find_staff_duplicates(
  candidate_employee_id TEXT,
  candidate_email TEXT,
  candidate_national_id TEXT,
  excluded_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  matches JSONB;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(duplicate_row ORDER BY duplicate_row ->> 'name'), '[]'::jsonb)
  INTO matches
  FROM (
    SELECT jsonb_build_object(
      'staffId', staff.id,
      'employeeId', coalesce(staff.employee_id, staff.staff_id),
      'name', staff.name,
      'nameEn', staff.name_en,
      'matchedFields', to_jsonb(array_remove(ARRAY[
        CASE
          WHEN nullif(trim(candidate_employee_id), '') IS NOT NULL
            AND lower(trim(coalesce(staff.employee_id, staff.staff_id))) =
              lower(trim(candidate_employee_id))
          THEN 'employeeId'
        END,
        CASE
          WHEN nullif(trim(candidate_email), '') IS NOT NULL
            AND lower(trim(staff.email)) = lower(trim(candidate_email))
          THEN 'email'
        END,
        CASE
          WHEN nullif(trim(candidate_national_id), '') IS NOT NULL
            AND lower(trim(sensitive.national_id)) =
              lower(trim(candidate_national_id))
          THEN 'nationalId'
        END
      ]::TEXT[], NULL)),
      'location', jsonb_build_object(
        'position', current_position.title,
        'department', coalesce(current_unit.name, current_position.department),
        'office', coalesce(current_office.name, current_position.office),
        'chartId', current_position.chart_id,
        'nodeId', current_position.node_id
      )
    ) AS duplicate_row
    FROM public.staff AS staff
    LEFT JOIN public.staff_sensitive AS sensitive
      ON sensitive.staff_id = staff.id
    LEFT JOIN LATERAL (
      SELECT position.*
      FROM public.position_assignments AS assignment
      JOIN public.positions AS position ON position.id = assignment.position_id
      WHERE assignment.staff_id = staff.id
        AND assignment.end_date IS NULL
      ORDER BY assignment.created_at DESC
      LIMIT 1
    ) AS current_position ON true
    LEFT JOIN public.org_units AS current_unit
      ON current_unit.id = current_position.org_unit_id
    LEFT JOIN public.org_offices AS current_office
      ON current_office.id = current_position.office_id
    WHERE (excluded_staff_id IS NULL OR staff.id <> excluded_staff_id)
      AND (
        (
          nullif(trim(candidate_employee_id), '') IS NOT NULL
          AND lower(trim(coalesce(staff.employee_id, staff.staff_id))) =
            lower(trim(candidate_employee_id))
        )
        OR (
          nullif(trim(candidate_email), '') IS NOT NULL
          AND lower(trim(staff.email)) = lower(trim(candidate_email))
        )
        OR (
          nullif(trim(candidate_national_id), '') IS NOT NULL
          AND lower(trim(sensitive.national_id)) =
            lower(trim(candidate_national_id))
        )
      )
  ) AS duplicates;

  RETURN matches;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_staff_record(
  target_staff_id UUID,
  employee_id_value TEXT,
  name_value TEXT,
  name_en_value TEXT,
  age_value SMALLINT,
  gender_value TEXT,
  education_value TEXT,
  phone_value TEXT,
  email_value TEXT,
  address_value TEXT,
  marital_status_value TEXT,
  national_id_value TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_staff_id UUID;
  duplicate_matches JSONB;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF nullif(trim(employee_id_value), '') IS NULL
    OR nullif(trim(name_value), '') IS NULL
  THEN
    RAISE EXCEPTION 'Employee ID and name are required'
      USING ERRCODE = '22023';
  END IF;

  IF age_value IS NULL OR age_value NOT BETWEEN 0 AND 120 THEN
    RAISE EXCEPTION 'Age must be a number between 0 and 120'
      USING ERRCODE = '22023';
  END IF;

  IF gender_value NOT IN ('female', 'male', 'other', 'unspecified') THEN
    RAISE EXCEPTION 'Invalid gender value'
      USING ERRCODE = '22023';
  END IF;

  IF marital_status_value NOT IN (
    'single',
    'married',
    'divorced',
    'widowed',
    'other',
    'unspecified'
  ) THEN
    RAISE EXCEPTION 'Invalid marital status value'
      USING ERRCODE = '22023';
  END IF;

  duplicate_matches := public.find_staff_duplicates(
    employee_id_value,
    email_value,
    national_id_value,
    target_staff_id
  );
  IF jsonb_array_length(duplicate_matches) > 0 THEN
    RAISE EXCEPTION 'A matching staff record already exists'
      USING ERRCODE = '23505', DETAIL = duplicate_matches::TEXT;
  END IF;

  IF target_staff_id IS NULL THEN
    INSERT INTO public.staff (
      owner_id,
      employee_id,
      staff_id,
      name,
      name_en,
      age,
      gender,
      education,
      phone,
      email,
      address,
      marital_status,
      status,
      created_by,
      updated_by
    )
    VALUES (
      NULL,
      trim(employee_id_value),
      trim(employee_id_value),
      trim(name_value),
      nullif(trim(name_en_value), ''),
      age_value,
      gender_value,
      nullif(trim(education_value), ''),
      nullif(trim(phone_value), ''),
      nullif(lower(trim(email_value)), ''),
      nullif(trim(address_value), ''),
      marital_status_value,
      'active',
      (SELECT auth.uid()),
      (SELECT auth.uid())
    )
    RETURNING id INTO saved_staff_id;
  ELSE
    UPDATE public.staff
    SET
      employee_id = trim(employee_id_value),
      staff_id = trim(employee_id_value),
      name = trim(name_value),
      name_en = nullif(trim(name_en_value), ''),
      age = age_value,
      gender = gender_value,
      education = nullif(trim(education_value), ''),
      phone = nullif(trim(phone_value), ''),
      email = nullif(lower(trim(email_value)), ''),
      address = nullif(trim(address_value), ''),
      marital_status = marital_status_value,
      updated_by = (SELECT auth.uid()),
      updated_at = now()
    WHERE id = target_staff_id
    RETURNING id INTO saved_staff_id;

    IF saved_staff_id IS NULL THEN
      RAISE EXCEPTION 'Staff record not found'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF nullif(trim(national_id_value), '') IS NULL THEN
    UPDATE public.staff_sensitive
    SET
      national_id = NULL,
      updated_by = (SELECT auth.uid()),
      updated_at = now()
    WHERE staff_id = saved_staff_id;
  ELSE
    INSERT INTO public.staff_sensitive (
      staff_id,
      national_id,
      created_by,
      updated_by
    )
    VALUES (
      saved_staff_id,
      trim(national_id_value),
      (SELECT auth.uid()),
      (SELECT auth.uid())
    )
    ON CONFLICT (staff_id) DO UPDATE
    SET
      national_id = EXCLUDED.national_id,
      updated_by = (SELECT auth.uid()),
      updated_at = now();
  END IF;

  RETURN saved_staff_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_staff_record(
  target_staff_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.position_assignments
    WHERE staff_id = target_staff_id
      AND end_date IS NULL
  ) THEN
    RAISE EXCEPTION 'Vacate the active position before archiving this staff record'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.staff
  SET
    status = 'archived',
    archived_at = now(),
    updated_by = (SELECT auth.uid()),
    updated_at = now()
  WHERE id = target_staff_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff record not found'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_hr_staff_directory(
  include_archived BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  directory JSONB;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(staff_record ORDER BY staff_record ->> 'name'), '[]'::jsonb)
  INTO directory
  FROM (
    SELECT jsonb_build_object(
      'id', staff.id,
      'employeeId', coalesce(staff.employee_id, staff.staff_id),
      'name', staff.name,
      'nameEn', staff.name_en,
      'age', staff.age,
      'gender', staff.gender,
      'education', staff.education,
      'phone', staff.phone,
      'email', staff.email,
      'address', staff.address,
      'maritalStatus', coalesce(staff.marital_status, 'unspecified'),
      'nationalId', sensitive.national_id,
      'status', staff.status,
      'createdAt', staff.created_at,
      'updatedAt', staff.updated_at,
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
    ) AS staff_record
    FROM public.staff AS staff
    LEFT JOIN public.staff_sensitive AS sensitive
      ON sensitive.staff_id = staff.id
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
    WHERE include_archived OR staff.status = 'active'
  ) AS records;

  RETURN directory;
END;
$$;

REVOKE ALL ON FUNCTION public.find_staff_duplicates(TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_staff_record(
  UUID, TEXT, TEXT, TEXT, SMALLINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_staff_record(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hr_staff_directory(BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.find_staff_duplicates(TEXT, TEXT, TEXT, UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_staff_record(
  UUID, TEXT, TEXT, TEXT, SMALLINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.archive_staff_record(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_hr_staff_directory(BOOLEAN)
  TO authenticated, service_role;

COMMIT;
