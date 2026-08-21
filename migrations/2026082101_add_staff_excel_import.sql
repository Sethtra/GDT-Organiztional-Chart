-- HR-only, atomic Excel staff import with nullable/unassessed imported skills.
-- Also restores email to the current staff save and read API contracts.

BEGIN;

ALTER TABLE public.staff_skill_history
  ALTER COLUMN proficiency DROP NOT NULL;

ALTER TABLE public.staff_import_batches
  ALTER COLUMN department_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION private.normalize_import_label(value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
SET search_path = ''
AS $$
  WITH normalized AS (
    SELECT lower(
      regexp_replace(
        trim(
          replace(
            replace(coalesce(value, ''), chr(8203), ''),
            chr(160),
            ' '
          )
        ),
        '\s+',
        ' ',
        'g'
      )
    ) AS value
  )
  SELECT CASE normalized.value
    WHEN lower('ធនាគា') THEN lower('ធនាគារ')
    WHEN lower('និតិសាស្ត្រ') THEN lower('នីតិសាស្ត្រ')
    WHEN lower('និតិសាស្រ្ត') THEN lower('នីតិសាស្ត្រ')
    WHEN lower('និតិសាស្រ្ដ') THEN lower('នីតិសាស្ត្រ')
    WHEN lower('នីតិសាស្រ្ត') THEN lower('នីតិសាស្ត្រ')
    WHEN lower('នីតិសាស្រ្ដ') THEN lower('នីតិសាស្ត្រ')
    WHEN lower('ហរិញ្ញវត្ថុ') THEN lower('ហិរញ្ញវត្ថុ')
    WHEN lower('និតិរដ្ឋបាលសាធារណៈ') THEN lower('នីតិរដ្ឋបាលសាធារណៈ')
    WHEN lower('គ្រង់គ្រងពាណិជ្ជកម្ម') THEN lower('គ្រប់គ្រងពាណិជ្ជកម្ម')
    WHEN lower('ព័ត៍មានវិទ្យា') THEN lower('ព័ត៌មានវិទ្យា')
    WHEN lower('កសិ-ឧស្សាហកម្ម') THEN lower('កសិ.ឧស្សាហកម្ម')
    ELSE normalized.value
  END
  FROM normalized;
$$;

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
  email_value TEXT,
  phone_value TEXT,
  address_value TEXT,
  other_information_value TEXT,
  photo_url_value TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_staff_id UUID;
  normalized_email TEXT := nullif(lower(trim(email_value)), '');
BEGIN
  IF normalized_email IS NOT NULL
    AND normalized_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  THEN
    RAISE EXCEPTION 'Enter a valid email address'
      USING ERRCODE = '22023';
  END IF;

  saved_staff_id := public.save_staff_record_with_placement(
    target_staff_id,
    employee_id_value,
    name_value,
    name_en_value,
    job_title_id_value,
    department_id_value,
    office_id_value,
    date_of_birth_value,
    joined_date_value,
    retired_date_value,
    gender_value,
    education_value,
    phone_value,
    address_value,
    other_information_value,
    photo_url_value
  );

  UPDATE public.staff
  SET
    email = normalized_email,
    updated_by = (SELECT auth.uid()),
    updated_at = now()
  WHERE id = saved_staff_id;

  RETURN saved_staff_id;
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
  duplicate_skill_id UUID;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;
  IF nullif(trim(skill_name), '') IS NULL THEN
    RAISE EXCEPTION 'Skill name is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT skill.id
  INTO duplicate_skill_id
  FROM public.skills AS skill
  WHERE private.normalize_import_label(skill.name) =
        private.normalize_import_label(skill_name)
    AND skill.id IS DISTINCT FROM target_skill_id
  ORDER BY skill.created_at, skill.id
  LIMIT 1;

  IF duplicate_skill_id IS NOT NULL THEN
    RAISE EXCEPTION 'This skill already exists in the catalog'
      USING ERRCODE = '23505', DETAIL = duplicate_skill_id::TEXT;
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

CREATE OR REPLACE FUNCTION public.import_staff_workbook(import_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  records JSONB := import_payload -> 'records';
  source_name TEXT := nullif(trim(import_payload #>> '{source,name}'), '');
  workbook_sha256 TEXT := import_payload #>> '{source,sha256}';
  source_sheet TEXT := nullif(trim(import_payload #>> '{source,sheet}'), '');
  record_count INTEGER;
  batch_id UUID;
  inserted_staff INTEGER := 0;
  inserted_placements INTEGER := 0;
  created_skills INTEGER := 0;
  assigned_skills INTEGER := 0;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(import_payload) <> 'object'
    OR jsonb_typeof(records) <> 'array'
  THEN
    RAISE EXCEPTION 'Invalid workbook import payload'
      USING ERRCODE = '22023';
  END IF;

  record_count := jsonb_array_length(records);
  IF record_count < 1 OR record_count > 5000 THEN
    RAISE EXCEPTION 'Workbook import must contain between 1 and 5,000 rows'
      USING ERRCODE = '22023';
  END IF;
  IF source_name IS NULL OR source_sheet IS NULL
    OR workbook_sha256 !~ '^[A-Fa-f0-9]{64}$'
  THEN
    RAISE EXCEPTION 'Workbook source metadata is invalid'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('public.import_staff_workbook'));

  IF EXISTS (
    SELECT 1
    FROM public.staff_import_batches AS batch
    WHERE lower(batch.source_sha256) = lower(workbook_sha256)
  ) THEN
    RAISE EXCEPTION 'This workbook has already been imported'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(records) AS row_data(
      "sourceRow" INTEGER,
      "employeeId" TEXT,
      name TEXT,
      "nameEn" TEXT,
      email TEXT,
      "jobTitleId" UUID,
      "departmentId" UUID,
      "officeId" UUID,
      "dateOfBirth" DATE,
      "joinedDate" DATE,
      "retiredDate" DATE,
      gender TEXT,
      education TEXT,
      skills JSONB,
      phone TEXT,
      address TEXT,
      "otherInformation" TEXT
    )
    WHERE row_data."sourceRow" IS NULL
      OR row_data."sourceRow" < 1
      OR nullif(trim(row_data."employeeId"), '') IS NULL
      OR length(trim(row_data."employeeId")) > 64
      OR nullif(trim(row_data.name), '') IS NULL
      OR length(trim(row_data.name)) > 200
      OR length(coalesce(row_data."nameEn", '')) > 200
      OR row_data."jobTitleId" IS NULL
      OR row_data."departmentId" IS NULL
      OR row_data."dateOfBirth" IS NULL
      OR row_data."joinedDate" IS NULL
      OR row_data.gender IS NULL
      OR row_data.gender NOT IN ('female', 'male', 'other', 'unspecified')
      OR row_data."joinedDate" < row_data."dateOfBirth"
      OR (
        row_data."retiredDate" IS NOT NULL
        AND row_data."retiredDate" < row_data."joinedDate"
      )
      OR (
        nullif(trim(row_data.email), '') IS NOT NULL
        AND row_data.email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      )
      OR length(coalesce(row_data.email, '')) > 320
      OR length(coalesce(row_data.education, '')) > 4000
      OR length(coalesce(row_data.phone, '')) > 50
      OR length(coalesce(row_data.address, '')) > 4000
      OR length(coalesce(row_data."otherInformation", '')) > 4000
      OR CASE
        WHEN row_data.skills IS NULL THEN false
        WHEN jsonb_typeof(row_data.skills) <> 'array' THEN true
        ELSE jsonb_array_length(row_data.skills) > 50
      END
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(row_data.skills) = 'array'
              THEN row_data.skills
            ELSE '[]'::jsonb
          END
        ) AS skill_name(value)
        WHERE nullif(trim(skill_name.value), '') IS NULL
          OR length(trim(skill_name.value)) > 200
      )
  ) THEN
    RAISE EXCEPTION 'At least one workbook row is invalid'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(records) AS row_data(
      "employeeId" TEXT,
      name TEXT,
      "dateOfBirth" DATE
    )
    GROUP BY lower(trim(row_data."employeeId"))
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(records) AS row_data(
      "employeeId" TEXT,
      name TEXT,
      "dateOfBirth" DATE
    )
    GROUP BY lower(trim(row_data.name)), row_data."dateOfBirth"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'The workbook contains duplicate officer rows'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(records) AS row_data(
      "employeeId" TEXT,
      name TEXT,
      "dateOfBirth" DATE
    )
    JOIN public.staff AS staff
      ON lower(trim(coalesce(staff.employee_id, staff.staff_id, ''))) =
           lower(trim(row_data."employeeId"))
      OR (
        lower(trim(staff.name)) = lower(trim(row_data.name))
        AND staff.date_of_birth = row_data."dateOfBirth"
      )
  ) THEN
    RAISE EXCEPTION 'At least one officer already exists in the directory'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(records) AS row_data(
      "jobTitleId" UUID,
      "departmentId" UUID,
      "officeId" UUID
    )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.job_titles AS title
      WHERE title.id = row_data."jobTitleId" AND title.is_active
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.org_units AS department
      WHERE department.id = row_data."departmentId"
        AND department.type = 'department'
    )
    OR (
      row_data."officeId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.org_offices AS office
        WHERE office.id = row_data."officeId"
          AND office.unit_id = row_data."departmentId"
      )
    )
  ) THEN
    RAISE EXCEPTION 'At least one organization or position mapping is invalid'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.staff_import_batches (
    source_sha256,
    source_name,
    sheet_name,
    department_id,
    record_count,
    imported_by
  )
  VALUES (
    upper(workbook_sha256),
    source_name,
    source_sheet,
    NULL,
    record_count,
    (SELECT auth.uid())
  )
  RETURNING id INTO batch_id;

  WITH rows AS (
    SELECT *
    FROM jsonb_to_recordset(records) AS row_data(
      "sourceRow" INTEGER,
      "employeeId" TEXT,
      name TEXT,
      "nameEn" TEXT,
      email TEXT,
      "jobTitleId" UUID,
      "departmentId" UUID,
      "officeId" UUID,
      "dateOfBirth" DATE,
      "joinedDate" DATE,
      "retiredDate" DATE,
      gender TEXT,
      education TEXT,
      skills JSONB,
      phone TEXT,
      address TEXT,
      "otherInformation" TEXT
    )
  )
  INSERT INTO public.staff (
    owner_id,
    employee_id,
    staff_id,
    name,
    name_en,
    email,
    job_title_id,
    date_of_birth,
    join_date,
    retired_date,
    gender,
    education,
    phone,
    address,
    marital_status,
    other_information,
    status,
    created_by,
    updated_by
  )
  SELECT
    NULL,
    trim(row_data."employeeId"),
    trim(row_data."employeeId"),
    trim(row_data.name),
    nullif(trim(row_data."nameEn"), ''),
    nullif(lower(trim(row_data.email)), ''),
    row_data."jobTitleId",
    row_data."dateOfBirth",
    row_data."joinedDate",
    row_data."retiredDate",
    row_data.gender,
    nullif(trim(row_data.education), ''),
    nullif(trim(row_data.phone), ''),
    nullif(trim(row_data.address), ''),
    'unspecified',
    nullif(trim(row_data."otherInformation"), ''),
    'active',
    (SELECT auth.uid()),
    (SELECT auth.uid())
  FROM rows AS row_data;
  GET DIAGNOSTICS inserted_staff = ROW_COUNT;

  WITH rows AS (
    SELECT *
    FROM jsonb_to_recordset(records) AS row_data(
      "sourceRow" INTEGER,
      "employeeId" TEXT,
      "departmentId" UUID,
      "officeId" UUID
    )
  )
  INSERT INTO public.staff_placements (
    staff_id,
    org_unit_id,
    office_id,
    import_batch_id,
    source_row,
    created_by,
    updated_by
  )
  SELECT
    staff.id,
    row_data."departmentId",
    row_data."officeId",
    batch_id,
    row_data."sourceRow",
    (SELECT auth.uid()),
    (SELECT auth.uid())
  FROM rows AS row_data
  JOIN public.staff AS staff
    ON lower(trim(staff.employee_id)) = lower(trim(row_data."employeeId"));
  GET DIAGNOSTICS inserted_placements = ROW_COUNT;

  WITH imported_skill_names AS (
    SELECT
      private.normalize_import_label(skill_name.value) AS normalized_name,
      min(trim(skill_name.value)) AS display_name
    FROM jsonb_to_recordset(records) AS row_data(skills JSONB)
    CROSS JOIN LATERAL jsonb_array_elements_text(
      coalesce(row_data.skills, '[]'::jsonb)
    ) AS skill_name(value)
    WHERE private.normalize_import_label(skill_name.value) <> ''
    GROUP BY private.normalize_import_label(skill_name.value)
  )
  INSERT INTO public.skills (
    name,
    is_active,
    created_by,
    updated_by
  )
  SELECT
    imported.display_name,
    true,
    (SELECT auth.uid()),
    (SELECT auth.uid())
  FROM imported_skill_names AS imported
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.skills AS skill
    WHERE private.normalize_import_label(skill.name) = imported.normalized_name
  );
  GET DIAGNOSTICS created_skills = ROW_COUNT;

  WITH rows AS (
    SELECT *
    FROM jsonb_to_recordset(records) AS row_data(
      "sourceRow" INTEGER,
      "employeeId" TEXT,
      skills JSONB
    )
  ), imported_skills AS (
    SELECT DISTINCT
      row_data."sourceRow",
      row_data."employeeId",
      private.normalize_import_label(skill_name.value) AS normalized_name
    FROM rows AS row_data
    CROSS JOIN LATERAL jsonb_array_elements_text(
      coalesce(row_data.skills, '[]'::jsonb)
    ) AS skill_name(value)
    WHERE private.normalize_import_label(skill_name.value) <> ''
  )
  INSERT INTO public.staff_skill_history (
    staff_id,
    skill_id,
    proficiency,
    effective_from,
    notes,
    created_by,
    updated_by
  )
  SELECT
    staff.id,
    matched_skill.id,
    NULL,
    current_date,
    format(
      'Imported from workbook %s, row %s; assessment pending.',
      source_name,
      imported."sourceRow"
    ),
    (SELECT auth.uid()),
    (SELECT auth.uid())
  FROM imported_skills AS imported
  JOIN public.staff AS staff
    ON lower(trim(staff.employee_id)) = lower(trim(imported."employeeId"))
  JOIN LATERAL (
    SELECT skill.id
    FROM public.skills AS skill
    WHERE private.normalize_import_label(skill.name) = imported.normalized_name
    ORDER BY skill.created_at, skill.id
    LIMIT 1
  ) AS matched_skill ON true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.staff_skill_history AS existing
    WHERE existing.staff_id = staff.id
      AND existing.skill_id = matched_skill.id
      AND existing.effective_to IS NULL
  );
  GET DIAGNOSTICS assigned_skills = ROW_COUNT;

  IF inserted_staff <> record_count
    OR inserted_placements <> record_count
  THEN
    RAISE EXCEPTION 'The imported record count did not match the workbook'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'batchId', batch_id,
    'insertedStaff', inserted_staff,
    'insertedPlacements', inserted_placements,
    'createdSkills', created_skills,
    'assignedSkills', assigned_skills
  );
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
  base_directory JSONB;
  augmented_directory JSONB;
BEGIN
  base_directory :=
    public.get_hr_staff_directory_without_placement(include_archived);

  SELECT coalesce(
    jsonb_agg(
      entry.record
      || jsonb_build_object('email', staff.email)
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

CREATE OR REPLACE FUNCTION public.get_staff_profile(target_staff_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_profile JSONB;
  placement_profile JSONB;
  profile_email TEXT;
BEGIN
  base_profile := public.get_staff_profile_without_placement(target_staff_id);

  SELECT
    CASE WHEN public.is_hr_admin() THEN staff.email ELSE NULL END
  INTO profile_email
  FROM public.staff AS staff
  WHERE staff.id = target_staff_id;

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

  RETURN base_profile
    || jsonb_build_object(
      'email', profile_email,
      'organizationalPlacement', placement_profile
    );
END;
$$;

REVOKE ALL ON FUNCTION private.normalize_import_label(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_staff_record_with_placement(
  UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_staff_workbook(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_staff_record_with_placement(
  UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.import_staff_workbook(JSONB)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
