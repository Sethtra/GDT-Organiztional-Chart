-- Normalize legacy assignment-history date columns created as TEXT by older
-- deployments. The refined profile API combines start_date with a DATE
-- fallback, so both assignment columns must use the canonical DATE type.
-- Existing non-empty values must be valid PostgreSQL dates or this migration
-- fails and rolls back without changing any assignment or staff data.

BEGIN;

-- PostgreSQL cannot rebuild a column type while a trigger's UPDATE OF list
-- names that column. Recreate the existing one-active-assignment trigger in
-- the same transaction so its protection is never absent after commit.
DROP TRIGGER IF EXISTS position_assignments_one_active
  ON public.position_assignments;

ALTER TABLE public.position_assignments
  ALTER COLUMN start_date TYPE DATE
    USING nullif(trim(start_date::TEXT), '')::DATE,
  ALTER COLUMN end_date TYPE DATE
    USING nullif(trim(end_date::TEXT), '')::DATE;

CREATE TRIGGER position_assignments_one_active
  BEFORE INSERT OR UPDATE OF staff_id, position_id, end_date
  ON public.position_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_one_active_assignment();

COMMIT;
