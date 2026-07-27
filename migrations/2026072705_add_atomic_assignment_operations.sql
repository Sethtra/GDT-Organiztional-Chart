-- Atomic position assignment, transfer/promotion, and vacancy operations.
-- Existing rows are preserved. Triggers prevent new duplicate active
-- assignments even before legacy dummy rows are reconciled.
-- Requires 2026072704_add_skills_and_requirements.sql.

BEGIN;

ALTER TABLE public.position_assignments
  ADD COLUMN IF NOT EXISTS change_reason TEXT;
ALTER TABLE public.position_assignments
  ADD COLUMN IF NOT EXISTS created_by UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.position_assignments
  ADD COLUMN IF NOT EXISTS updated_by UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'position_assignments_change_reason_check'
      AND conrelid = 'public.position_assignments'::regclass
  ) THEN
    ALTER TABLE public.position_assignments
      ADD CONSTRAINT position_assignments_change_reason_check
      CHECK (
        change_reason IS NULL
        OR change_reason IN (
          'assigned',
          'transferred',
          'promoted',
          'resigned',
          'retired',
          'suspended',
          'vacated',
          'corrected'
        )
      ) NOT VALID;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.can_manage_position_assignment(
  target_position_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.is_hr_admin()
    OR EXISTS (
      SELECT 1
      FROM public.positions AS position
      JOIN public.charts AS chart ON chart.id = position.chart_id
      WHERE position.id = target_position_id
        AND (
          chart.owner_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.chart_shares AS share
            WHERE share.chart_id = chart.id
              AND lower(share.shared_email) =
                lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
              AND share.status = 'accepted'
              AND share.access_level = 'edit'
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.enforce_one_active_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.end_date IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.position_assignments AS existing
      WHERE existing.staff_id = NEW.staff_id
        AND existing.end_date IS NULL
        AND existing.id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'Staff member already occupies an active position'
        USING ERRCODE = '23505';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.position_assignments AS existing
      WHERE existing.position_id = NEW.position_id
        AND existing.end_date IS NULL
        AND existing.id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'Position already has an active occupant'
        USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS position_assignments_one_active
  ON public.position_assignments;
CREATE TRIGGER position_assignments_one_active
  BEFORE INSERT OR UPDATE OF staff_id, position_id, end_date
  ON public.position_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_one_active_assignment();

CREATE OR REPLACE FUNCTION public.assign_staff_to_position(
  target_staff_id UUID,
  target_position_id UUID,
  joined_on DATE,
  assignment_reason TEXT DEFAULT 'assigned',
  assignment_notes TEXT DEFAULT NULL
)
RETURNS public.position_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  created_assignment public.position_assignments;
BEGIN
  IF NOT public.can_manage_position_assignment(target_position_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this position'
      USING ERRCODE = '42501';
  END IF;

  IF assignment_reason NOT IN ('assigned', 'transferred', 'promoted') THEN
    RAISE EXCEPTION 'Invalid assignment reason'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = target_staff_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active staff member not found'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.position_assignments (
    position_id,
    staff_id,
    start_date,
    end_date,
    change_reason,
    notes,
    created_by,
    updated_by
  )
  VALUES (
    target_position_id,
    target_staff_id,
    joined_on,
    NULL,
    assignment_reason,
    assignment_notes,
    (SELECT auth.uid()),
    (SELECT auth.uid())
  )
  RETURNING * INTO created_assignment;

  RETURN created_assignment;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_staff_position(
  target_staff_id UUID,
  target_position_id UUID,
  effective_on DATE,
  transfer_reason TEXT DEFAULT 'transferred',
  transfer_notes TEXT DEFAULT NULL
)
RETURNS public.position_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_assignment public.position_assignments;
  created_assignment public.position_assignments;
BEGIN
  SELECT assignment.*
  INTO current_assignment
  FROM public.position_assignments AS assignment
  WHERE assignment.staff_id = target_staff_id
    AND assignment.end_date IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff member has no active position'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_manage_position_assignment(current_assignment.position_id)
    OR NOT public.can_manage_position_assignment(target_position_id)
  THEN
    RAISE EXCEPTION 'Not authorized to transfer between these positions'
      USING ERRCODE = '42501';
  END IF;

  IF transfer_reason NOT IN ('transferred', 'promoted', 'corrected') THEN
    RAISE EXCEPTION 'Invalid transfer reason'
      USING ERRCODE = '22023';
  END IF;

  IF current_assignment.start_date IS NOT NULL
    AND effective_on < current_assignment.start_date
  THEN
    RAISE EXCEPTION 'Transfer date cannot predate the active assignment'
      USING ERRCODE = '22007';
  END IF;

  UPDATE public.position_assignments
  SET
    end_date = effective_on,
    change_reason = transfer_reason,
    exit_status = initcap(transfer_reason),
    notes = coalesce(transfer_notes, notes),
    updated_by = (SELECT auth.uid()),
    updated_at = now()
  WHERE id = current_assignment.id;

  INSERT INTO public.position_assignments (
    position_id,
    staff_id,
    start_date,
    end_date,
    change_reason,
    notes,
    created_by,
    updated_by
  )
  VALUES (
    target_position_id,
    target_staff_id,
    effective_on,
    NULL,
    transfer_reason,
    transfer_notes,
    (SELECT auth.uid()),
    (SELECT auth.uid())
  )
  RETURNING * INTO created_assignment;

  RETURN created_assignment;
END;
$$;

CREATE OR REPLACE FUNCTION public.vacate_staff_position(
  target_position_id UUID,
  left_on DATE,
  departure_reason TEXT,
  departure_notes TEXT DEFAULT NULL
)
RETURNS public.position_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  closed_assignment public.position_assignments;
BEGIN
  IF NOT public.can_manage_position_assignment(target_position_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this position'
      USING ERRCODE = '42501';
  END IF;

  IF departure_reason NOT IN (
    'resigned',
    'retired',
    'suspended',
    'vacated',
    'corrected'
  ) THEN
    RAISE EXCEPTION 'Invalid departure reason'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.position_assignments
  SET
    end_date = left_on,
    change_reason = departure_reason,
    exit_status = initcap(departure_reason),
    notes = departure_notes,
    updated_by = (SELECT auth.uid()),
    updated_at = now()
  WHERE position_id = target_position_id
    AND end_date IS NULL
    AND (start_date IS NULL OR left_on >= start_date)
  RETURNING * INTO closed_assignment;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active assignment not found or departure date is invalid'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN closed_assignment;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_position_assignment(UUID)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_staff_to_position(
  UUID, UUID, DATE, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_staff_position(
  UUID, UUID, DATE, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vacate_staff_position(
  UUID, DATE, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_manage_position_assignment(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_staff_to_position(
  UUID, UUID, DATE, TEXT, TEXT
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_staff_position(
  UUID, UUID, DATE, TEXT, TEXT
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vacate_staff_position(
  UUID, DATE, TEXT, TEXT
) TO authenticated, service_role;

-- Direct assignment mutations are replaced by checked transaction functions.
DROP POLICY IF EXISTS "Editors manage assignments"
  ON public.position_assignments;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.position_assignments
  FROM authenticated;

COMMIT;
