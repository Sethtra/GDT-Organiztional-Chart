-- Save an officer and their relational organizational placement atomically.
-- Marital status remains in the legacy table for recovery, but is no longer
-- accepted from or returned to browser clients.

BEGIN;

CREATE OR REPLACE FUNCTION public.save_staff_record_with_placement(
  target_staff_id UUID,
  employee_id_value TEXT,
  name_value TEXT,
  name_en_value TEXT,
  job_title_id_value UUID,
  department_id_value UUID,
  office_id_value UUID,
  date_of_birth_value DATE,
  joined_date_value DATE,
  retired_date_value DATE,
  gender_value TEXT,
  education_value TEXT,
  phone_value TEXT,
  address_value TEXT,
  other_information_value TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_staff_id UUID;
  preserved_marital_status TEXT := 'unspecified';
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF department_id_value IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.org_units AS department
    WHERE department.id = department_id_value
      AND department.type = 'department'
  ) THEN
    RAISE EXCEPTION 'Select a valid department'
      USING ERRCODE = '22023';
  END IF;

  IF office_id_value IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.org_offices AS office
    WHERE office.id = office_id_value
      AND office.unit_id = department_id_value
  ) THEN
    RAISE EXCEPTION 'Selected office does not belong to selected department'
      USING ERRCODE = '22023';
  END IF;

  IF target_staff_id IS NOT NULL THEN
    SELECT coalesce(staff.marital_status, 'unspecified')
    INTO preserved_marital_status
    FROM public.staff AS staff
    WHERE staff.id = target_staff_id;
  END IF;

  saved_staff_id := public.save_staff_record(
    target_staff_id,
    employee_id_value,
    name_value,
    name_en_value,
    job_title_id_value,
    date_of_birth_value,
    joined_date_value,
    retired_date_value,
    gender_value,
    education_value,
    phone_value,
    address_value,
    preserved_marital_status,
    other_information_value
  );

  INSERT INTO public.staff_placements (
    staff_id,
    org_unit_id,
    office_id,
    created_by,
    updated_by
  )
  VALUES (
    saved_staff_id,
    department_id_value,
    office_id_value,
    (SELECT auth.uid()),
    (SELECT auth.uid())
  )
  ON CONFLICT (staff_id) DO UPDATE
  SET
    org_unit_id = EXCLUDED.org_unit_id,
    office_id = EXCLUDED.office_id,
    updated_by = (SELECT auth.uid()),
    updated_at = now();

  RETURN saved_staff_id;
END;
$$;

-- The browser may save staff only through the placement-aware API. The old
-- signature remains service-role accessible for backup recovery and imports.
REVOKE EXECUTE ON FUNCTION public.save_staff_record(
  UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM authenticated;
REVOKE ALL ON FUNCTION public.save_staff_record_with_placement(
  UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_staff_record(
  UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_staff_record_with_placement(
  UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;

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
  base_directory JSONB;
  augmented_directory JSONB;
BEGIN
  base_directory :=
    public.get_hr_staff_directory_without_placement(include_archived);

  SELECT coalesce(
    jsonb_agg(
      (entry.record - 'maritalStatus')
      || jsonb_build_object(
        'organizationalPlacement',
        CASE
          WHEN placement.staff_id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'departmentId', department.id,
            'departmentName', department.name,
            'officeId', office.id,
            'officeName', office.name
          )
        END
      )
      ORDER BY entry.ordinality
    ),
    '[]'::jsonb
  )
  INTO augmented_directory
  FROM jsonb_array_elements(base_directory)
    WITH ORDINALITY AS entry(record, ordinality)
  LEFT JOIN public.staff AS staff
    ON staff.id = (entry.record ->> 'id')::UUID
  LEFT JOIN public.staff_placements AS placement
    ON placement.staff_id = staff.id
  LEFT JOIN public.org_units AS department
    ON department.id = placement.org_unit_id
  LEFT JOIN public.org_offices AS office
    ON office.id = placement.office_id;

  RETURN augmented_directory;
END;
$$;

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
  base_profile JSONB;
  placement_profile JSONB;
BEGIN
  base_profile := public.get_staff_profile_without_placement(target_staff_id);

  SELECT jsonb_build_object(
    'departmentId', department.id,
    'departmentName', department.name,
    'officeId', office.id,
    'officeName', office.name
  )
  INTO placement_profile
  FROM public.staff_placements AS placement
  JOIN public.org_units AS department
    ON department.id = placement.org_unit_id
  LEFT JOIN public.org_offices AS office
    ON office.id = placement.office_id
  WHERE placement.staff_id = target_staff_id;

  RETURN (base_profile - 'maritalStatus')
    || jsonb_build_object('organizationalPlacement', placement_profile);
END;
$$;

REVOKE ALL ON FUNCTION public.get_hr_staff_directory(BOOLEAN)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_staff_profile(UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hr_staff_directory(BOOLEAN)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_staff_profile(UUID)
  TO authenticated, service_role;

COMMIT;
