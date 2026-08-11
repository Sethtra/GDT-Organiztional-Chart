-- Remove obsolete job-skill RPC overloads after department scoping added an
-- explicit org-unit argument. Keeping both signatures lets PostgREST select
-- the legacy implementation when a client omits the new argument; that old
-- implementation depends on the superseded two-column uniqueness constraint.
-- Requires 2026073001_add_department_scoped_skill_requirements.sql.

BEGIN;

DROP FUNCTION IF EXISTS public.set_job_title_skill_requirement(
  UUID, UUID, SMALLINT, BOOLEAN
);
DROP FUNCTION IF EXISTS public.evaluate_staff_job_fit(UUID, UUID);

NOTIFY pgrst, 'reload schema';

COMMIT;
