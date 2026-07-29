-- Department and office membership for staff who do not yet occupy a chart
-- position. This keeps organizational placement relational:
-- Department -> Office -> Staff, without duplicating names in public.staff.
-- Requires 2026072912_refine_staff_profile_and_positions.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_sha256 TEXT NOT NULL
    CHECK (source_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  source_name TEXT NOT NULL CHECK (length(trim(source_name)) > 0),
  sheet_name TEXT NOT NULL CHECK (length(trim(sheet_name)) > 0),
  department_id UUID NOT NULL
    REFERENCES public.org_units(id) ON DELETE RESTRICT,
  record_count INTEGER NOT NULL CHECK (record_count > 0),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (source_sha256)
);

CREATE TABLE IF NOT EXISTS public.staff_placements (
  staff_id UUID PRIMARY KEY
    REFERENCES public.staff(id) ON DELETE CASCADE,
  org_unit_id UUID NOT NULL
    REFERENCES public.org_units(id) ON DELETE RESTRICT,
  office_id UUID
    REFERENCES public.org_offices(id) ON DELETE RESTRICT,
  import_batch_id UUID
    REFERENCES public.staff_import_batches(id) ON DELETE SET NULL,
  source_row INTEGER CHECK (source_row IS NULL OR source_row > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS staff_placements_unit_office_idx
  ON public.staff_placements (org_unit_id, office_id);
CREATE INDEX IF NOT EXISTS staff_placements_import_batch_idx
  ON public.staff_placements (import_batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS staff_employee_id_uidx
  ON public.staff (lower(employee_id))
  WHERE employee_id IS NOT NULL
    AND length(trim(employee_id)) > 0;

CREATE OR REPLACE FUNCTION public.validate_staff_placement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.org_units AS unit
    WHERE unit.id = NEW.org_unit_id
      AND unit.type = 'department'
  ) THEN
    RAISE EXCEPTION 'Staff placement must reference a department'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.office_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.org_offices AS office
    WHERE office.id = NEW.office_id
      AND office.unit_id = NEW.org_unit_id
  ) THEN
    RAISE EXCEPTION 'Selected office does not belong to selected department'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_placements_validate
  ON public.staff_placements;
CREATE TRIGGER staff_placements_validate
  BEFORE INSERT OR UPDATE OF org_unit_id, office_id
  ON public.staff_placements
  FOR EACH ROW EXECUTE FUNCTION public.validate_staff_placement();

DROP TRIGGER IF EXISTS staff_placements_set_updated_at
  ON public.staff_placements;
CREATE TRIGGER staff_placements_set_updated_at
  BEFORE UPDATE ON public.staff_placements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.staff_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized members read staff placements"
  ON public.staff_placements;
DROP POLICY IF EXISTS "HR administrators create staff placements"
  ON public.staff_placements;
DROP POLICY IF EXISTS "HR administrators update staff placements"
  ON public.staff_placements;

CREATE POLICY "Authorized members read staff placements"
  ON public.staff_placements
  FOR SELECT TO authenticated
  USING (public.can_view_staff_profile(staff_id));

CREATE POLICY "HR administrators create staff placements"
  ON public.staff_placements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "HR administrators update staff placements"
  ON public.staff_placements
  FOR UPDATE TO authenticated
  USING (public.is_hr_admin())
  WITH CHECK (public.is_hr_admin());

REVOKE ALL ON TABLE public.staff_placements FROM anon;
REVOKE ALL ON TABLE public.staff_import_batches FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff_placements
  TO authenticated;
GRANT ALL ON TABLE
  public.staff_placements,
  public.staff_import_batches
  TO service_role;

-- Preserve the refined APIs as private implementation functions, then augment
-- their stable response contracts with relational organizational placement.
DO $$
DECLARE
  current_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(
    'public.get_hr_staff_directory(boolean)'::regprocedure
  )
  INTO current_definition;

  IF position('organizationalPlacement' IN current_definition) = 0 THEN
    DROP FUNCTION IF EXISTS
      public.get_hr_staff_directory_without_placement(BOOLEAN);
    ALTER FUNCTION public.get_hr_staff_directory(BOOLEAN)
      RENAME TO get_hr_staff_directory_without_placement;
  END IF;
END
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

DO $$
DECLARE
  current_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(
    'public.get_staff_profile(uuid)'::regprocedure
  )
  INTO current_definition;

  IF position('organizationalPlacement' IN current_definition) = 0 THEN
    DROP FUNCTION IF EXISTS
      public.get_staff_profile_without_placement(UUID);
    ALTER FUNCTION public.get_staff_profile(UUID)
      RENAME TO get_staff_profile_without_placement;
  END IF;
END
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

  RETURN base_profile
    || jsonb_build_object('organizationalPlacement', placement_profile);
END;
$$;

REVOKE ALL ON FUNCTION
  public.get_hr_staff_directory_without_placement(BOOLEAN)
  FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION
  public.get_staff_profile_without_placement(UUID)
  FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.get_hr_staff_directory(BOOLEAN)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_staff_profile(UUID)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.get_hr_staff_directory_without_placement(BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION
  public.get_staff_profile_without_placement(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_hr_staff_directory(BOOLEAN)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_staff_profile(UUID)
  TO authenticated, service_role;

COMMIT;
