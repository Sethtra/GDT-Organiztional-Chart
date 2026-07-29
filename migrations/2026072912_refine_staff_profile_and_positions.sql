-- Refined HR staff profile fields and the approved GDT position-title list.
-- This migration is additive and preserves every staff, assignment, chart,
-- position, node, and edge row. Deprecated HR fields remain in storage only
-- for recovery, but are no longer exposed through the application RPCs.
-- Requires 2026072911_cleanup_legacy_dummy_staff.sql.

BEGIN;

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS retired_date DATE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS other_information TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS job_title_id UUID
  REFERENCES public.job_titles(id) ON DELETE RESTRICT;

-- Older deployments created join_date as TEXT before the core schema was
-- standardized. Normalize it before adding date-order constraints.
ALTER TABLE public.staff
  ALTER COLUMN join_date TYPE DATE
  USING nullif(trim(join_date::TEXT), '')::DATE;

CREATE INDEX IF NOT EXISTS staff_job_title_idx
  ON public.staff (job_title_id);
CREATE INDEX IF NOT EXISTS staff_name_birth_date_idx
  ON public.staff (lower(name), date_of_birth)
  WHERE date_of_birth IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_joined_after_birth_check'
      AND conrelid = 'public.staff'::regclass
  ) THEN
    ALTER TABLE public.staff
      ADD CONSTRAINT staff_joined_after_birth_check
      CHECK (
        join_date IS NULL
        OR date_of_birth IS NULL
        OR join_date >= date_of_birth
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_retired_after_joined_check'
      AND conrelid = 'public.staff'::regclass
  ) THEN
    ALTER TABLE public.staff
      ADD CONSTRAINT staff_retired_after_joined_check
      CHECK (
        retired_date IS NULL
        OR join_date IS NULL
        OR retired_date >= join_date
      ) NOT VALID;
  END IF;
END
$$;

WITH approved_titles (
  code,
  name,
  name_en,
  rank_order,
  position_scope
) AS (
  VALUES
    ('DEPARTMENT_HEAD', 'ប្រធាននាយកដ្ឋាន', 'Department Director', 10, 'department'),
    ('DEPARTMENT_DEPUTY', 'អនុប្រធាននាយកដ្ឋាន', 'Deputy Department Director', 20, 'department'),
    ('OFFICE_HEAD', 'ប្រធានការិយាល័យ', 'Office Chief', 30, 'office'),
    ('OFFICE_DEPUTY', 'អនុប្រធានការិយាល័យ', 'Deputy Office Chief', 40, 'office'),
    ('OFFICER', 'មន្ត្រី', 'Officer', 50, 'individual'),
    ('CONTRACT_OFFICER', 'មន្ត្រីកិច្ចសន្យា', 'Contract Officer', 60, 'individual')
)
INSERT INTO public.job_titles (
  code,
  name,
  name_en,
  rank_order,
  position_scope,
  is_active
)
SELECT
  approved.code,
  approved.name,
  approved.name_en,
  approved.rank_order,
  approved.position_scope,
  true
FROM approved_titles AS approved
WHERE NOT EXISTS (
  SELECT 1
  FROM public.job_titles AS existing
  WHERE lower(existing.name) = lower(approved.name)
)
ON CONFLICT DO NOTHING;

WITH approved_titles (
  code,
  name,
  name_en,
  rank_order,
  position_scope
) AS (
  VALUES
    ('DEPARTMENT_HEAD', 'ប្រធាននាយកដ្ឋាន', 'Department Director', 10, 'department'),
    ('DEPARTMENT_DEPUTY', 'អនុប្រធាននាយកដ្ឋាន', 'Deputy Department Director', 20, 'department'),
    ('OFFICE_HEAD', 'ប្រធានការិយាល័យ', 'Office Chief', 30, 'office'),
    ('OFFICE_DEPUTY', 'អនុប្រធានការិយាល័យ', 'Deputy Office Chief', 40, 'office'),
    ('OFFICER', 'មន្ត្រី', 'Officer', 50, 'individual'),
    ('CONTRACT_OFFICER', 'មន្ត្រីកិច្ចសន្យា', 'Contract Officer', 60, 'individual')
)
UPDATE public.job_titles AS title
SET
  code = approved.code,
  name_en = approved.name_en,
  rank_order = approved.rank_order,
  position_scope = approved.position_scope,
  is_active = true,
  updated_at = now()
FROM approved_titles AS approved
WHERE lower(title.name) = lower(approved.name);

CREATE OR REPLACE FUNCTION public.find_staff_duplicates(
  candidate_employee_id TEXT,
  candidate_name TEXT,
  candidate_date_of_birth DATE,
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

  SELECT coalesce(
    jsonb_agg(duplicate_row ORDER BY duplicate_row ->> 'name'),
    '[]'::jsonb
  )
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
          WHEN nullif(trim(candidate_name), '') IS NOT NULL
            AND candidate_date_of_birth IS NOT NULL
            AND lower(trim(staff.name)) = lower(trim(candidate_name))
            AND staff.date_of_birth = candidate_date_of_birth
          THEN 'nameAndDateOfBirth'
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
          nullif(trim(candidate_name), '') IS NOT NULL
          AND candidate_date_of_birth IS NOT NULL
          AND lower(trim(staff.name)) = lower(trim(candidate_name))
          AND staff.date_of_birth = candidate_date_of_birth
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
  job_title_id_value UUID,
  date_of_birth_value DATE,
  joined_date_value DATE,
  retired_date_value DATE,
  gender_value TEXT,
  education_value TEXT,
  phone_value TEXT,
  address_value TEXT,
  marital_status_value TEXT,
  other_information_value TEXT
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

-- The retired API signatures remain available only to the service role for
-- backup recovery. Browser clients can use only the refined contracts above.
REVOKE EXECUTE ON FUNCTION public.find_staff_duplicates(
  TEXT, TEXT, TEXT, UUID
) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.save_staff_record(
  UUID, TEXT, TEXT, TEXT, SMALLINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM authenticated;

REVOKE ALL ON FUNCTION public.find_staff_duplicates(
  TEXT, TEXT, DATE, UUID
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_staff_record(
  UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hr_staff_directory(BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_staff_profile(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.find_staff_duplicates(
  TEXT, TEXT, DATE, UUID
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_staff_record(
  UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, DATE,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_hr_staff_directory(BOOLEAN)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_staff_profile(UUID)
  TO authenticated, service_role;

COMMIT;
