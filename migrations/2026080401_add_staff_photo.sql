-- Officer profile photos: a nullable photo_url column on public.staff,
-- backed by the "Profile" Storage bucket. Photos are uploaded and resized
-- to WebP client-side, then saved through the same HR-admin-gated save API
-- used for every other staff field.
-- Requires 2026072915_add_staff_placement_save_api.sql.
-- The "Profile" bucket was created manually via the Supabase dashboard; the
-- upsert below just guarantees it is public and exists in every environment
-- this migration runs against.

BEGIN;

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ── Profile photo storage ─────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('Profile', 'Profile', true)
ON CONFLICT ON CONSTRAINT buckets_pkey
DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public Profile bucket reads" ON storage.objects;
CREATE POLICY "Public Profile bucket reads"
  ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'Profile');

DROP POLICY IF EXISTS "HR admins upload to Profile bucket" ON storage.objects;
CREATE POLICY "HR admins upload to Profile bucket"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'Profile'
    AND name ~ '^[0-9a-fA-F-]{36}[.]webp$'
    AND public.is_hr_admin()
  );

DROP POLICY IF EXISTS "HR admins update Profile bucket" ON storage.objects;
CREATE POLICY "HR admins update Profile bucket"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'Profile'
    AND name ~ '^[0-9a-fA-F-]{36}[.]webp$'
    AND public.is_hr_admin()
  )
  WITH CHECK (
    bucket_id = 'Profile'
    AND name ~ '^[0-9a-fA-F-]{36}[.]webp$'
    AND public.is_hr_admin()
  );

DROP POLICY IF EXISTS "HR admins delete from Profile bucket" ON storage.objects;
CREATE POLICY "HR admins delete from Profile bucket"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'Profile'
    AND name ~ '^[0-9a-fA-F-]{36}[.]webp$'
    AND public.is_hr_admin()
  );

-- ── Extend the save API with an additional photo_url_value parameter ─────
-- Postgres treats an added parameter as a new overload, so (matching the
-- precedent set when save_staff_record_with_placement was introduced) the
-- prior signatures are kept for service-role recovery/import use only, and
-- the browser is moved onto the new signatures below.

CREATE OR REPLACE FUNCTION public.save_staff_record(
  target_staff_id UUID,
  employee_id_value TEXT,
  name_value TEXT,
  name_en_value TEXT,
  job_title_id_value UUID,
  date_of_birth_value DATE,
  joined_date_value DATE,
  retired_date_value DATE,
  gender_value TEXT,
  education_value TEXT,
  phone_value TEXT,
  address_value TEXT,
  marital_status_value TEXT,
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
  duplicate_matches JSONB;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF nullif(trim(employee_id_value), '') IS NULL
    OR nullif(trim(name_value), '') IS NULL
    OR job_title_id_value IS NULL
    OR date_of_birth_value IS NULL
    OR joined_date_value IS NULL
  THEN
    RAISE EXCEPTION
      'Employee ID, name, position, date of birth, and joined date are required'
      USING ERRCODE = '22023';
  END IF;

  IF joined_date_value < date_of_birth_value THEN
    RAISE EXCEPTION 'Joined date cannot be before date of birth'
      USING ERRCODE = '22023';
  END IF;

  IF retired_date_value IS NOT NULL
    AND retired_date_value < joined_date_value
  THEN
    RAISE EXCEPTION 'Retired date cannot be before joined date'
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.job_titles AS title
    WHERE title.id = job_title_id_value
      AND title.is_active
  ) THEN
    RAISE EXCEPTION 'Select an active position'
      USING ERRCODE = '22023';
  END IF;

  duplicate_matches := public.find_staff_duplicates(
    employee_id_value,
    name_value,
    date_of_birth_value,
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
      photo_url,
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
      job_title_id_value,
      date_of_birth_value,
      joined_date_value,
      retired_date_value,
      gender_value,
      nullif(trim(education_value), ''),
      nullif(trim(phone_value), ''),
      nullif(trim(address_value), ''),
      marital_status_value,
      nullif(trim(other_information_value), ''),
      nullif(trim(photo_url_value), ''),
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
      job_title_id = job_title_id_value,
      date_of_birth = date_of_birth_value,
      join_date = joined_date_value,
      retired_date = retired_date_value,
      gender = gender_value,
      education = nullif(trim(education_value), ''),
      phone = nullif(trim(phone_value), ''),
      address = nullif(trim(address_value), ''),
      marital_status = marital_status_value,
      other_information = nullif(trim(other_information_value), ''),
      photo_url = nullif(trim(photo_url_value), ''),
      updated_by = (SELECT auth.uid()),
      updated_at = now()
    WHERE id = target_staff_id
    RETURNING id INTO saved_staff_id;

    IF saved_staff_id IS NULL THEN
      RAISE EXCEPTION 'Staff record not found'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  RETURN saved_staff_id;
END;
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
    other_information_value,
    photo_url_value
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

REVOKE ALL ON FUNCTION public.save_staff_record(
  UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_staff_record_with_placement(
  UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_staff_record(
  UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_staff_record_with_placement(
  UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- The prior 14/15-argument signatures remain for service-role recovery and
-- import use only; the browser now calls exclusively through the signatures
-- above (matching the precedent set in 2026072915).
REVOKE EXECUTE ON FUNCTION public.save_staff_record(
  UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.save_staff_record_with_placement(
  UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT
) FROM authenticated;

-- ── Return photoUrl from the directory and profile read APIs ─────────────
-- These functions were renamed to *_without_placement in 2026072913; their
-- signatures are unchanged here, so this is a straight body replacement and
-- existing grants (service_role only) carry over automatically.

CREATE OR REPLACE FUNCTION public.get_hr_staff_directory_without_placement(
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

  SELECT coalesce(
    jsonb_agg(
      staff_record
      ORDER BY
        (staff_record -> 'jobTitle' ->> 'rankOrder')::INTEGER,
        staff_record ->> 'name'
    ),
    '[]'::jsonb
  )
  INTO directory
  FROM (
    SELECT jsonb_build_object(
      'id', staff.id,
      'employeeId', coalesce(staff.employee_id, staff.staff_id),
      'name', staff.name,
      'nameEn', staff.name_en,
      'dateOfBirth', staff.date_of_birth,
      'joinedDate', staff.join_date,
      'retiredDate', staff.retired_date,
      'gender', staff.gender,
      'education', staff.education,
      'phone', staff.phone,
      'address', staff.address,
      'maritalStatus', coalesce(staff.marital_status, 'unspecified'),
      'otherInformation', staff.other_information,
      'photoUrl', staff.photo_url,
      'jobTitle', CASE
        WHEN selected_title.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', selected_title.id,
          'name', selected_title.name,
          'nameEn', selected_title.name_en,
          'rankOrder', selected_title.rank_order,
          'positionScope', selected_title.position_scope
        )
      END,
      'status', staff.status,
      'createdAt', staff.created_at,
      'updatedAt', staff.updated_at,
      'currentPosition', CASE
        WHEN current_position.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'positionId', current_position.id,
          'chartId', current_position.chart_id,
          'nodeId', current_position.node_id,
          'title', coalesce(
            assigned_title.name,
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
    ) AS staff_record
    FROM public.staff AS staff
    LEFT JOIN public.job_titles AS selected_title
      ON selected_title.id = staff.job_title_id
    LEFT JOIN LATERAL (
      SELECT position.*
      FROM public.position_assignments AS assignment
      JOIN public.positions AS position ON position.id = assignment.position_id
      WHERE assignment.staff_id = staff.id
        AND assignment.end_date IS NULL
      ORDER BY assignment.created_at DESC
      LIMIT 1
    ) AS current_position ON true
    LEFT JOIN public.job_titles AS assigned_title
      ON assigned_title.id = current_position.job_title_id
    LEFT JOIN public.org_units AS current_unit
      ON current_unit.id = current_position.org_unit_id
    LEFT JOIN public.org_offices AS current_office
      ON current_office.id = current_position.office_id
    WHERE include_archived OR staff.status = 'active'
  ) AS records;

  RETURN directory;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_staff_profile_without_placement(
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

  SELECT jsonb_build_object(
    'access', CASE WHEN hr_access THEN 'hr' ELSE 'invited' END,
    'id', staff.id,
    'employeeId', coalesce(staff.employee_id, staff.staff_id),
    'name', staff.name,
    'nameEn', staff.name_en,
    'dateOfBirth', staff.date_of_birth,
    'joinedDate', staff.join_date,
    'retiredDate', staff.retired_date,
    'gender', staff.gender,
    'status', staff.status,
    'phone', staff.phone,
    'address', staff.address,
    'maritalStatus', coalesce(staff.marital_status, 'unspecified'),
    'education', staff.education,
    'otherInformation', staff.other_information,
    'photoUrl', staff.photo_url,
    'jobTitle', CASE
      WHEN selected_title.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', selected_title.id,
        'name', selected_title.name,
        'nameEn', selected_title.name_en,
        'rankOrder', selected_title.rank_order,
        'positionScope', selected_title.position_scope
      )
    END,
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
          'joinedDate', coalesce(
            assignment.start_date,
            assignment.created_at::DATE
          ),
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
  INTO profile
  FROM public.staff AS staff
  LEFT JOIN public.job_titles AS selected_title
    ON selected_title.id = staff.job_title_id
  WHERE staff.id = target_staff_id;

  IF profile IS NULL THEN
    RAISE EXCEPTION 'Staff record not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN profile;
END;
$$;

-- get_hr_staff_directory(BOOLEAN) and get_staff_profile(UUID) are thin
-- wrappers that merge organizationalPlacement on top of the *_without_
-- placement JSON via `||`, so photoUrl passes through unchanged and neither
-- wrapper needs to be touched here.

COMMIT;
