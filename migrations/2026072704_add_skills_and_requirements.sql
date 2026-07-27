-- Reusable skill catalog, temporal staff proficiency, and job requirements.
-- Proficiency is constrained to levels 1-5.
-- Requires 2026072703_add_job_titles_and_reporting.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS skills_name_uidx
  ON public.skills (lower(name));

CREATE TABLE IF NOT EXISTS public.staff_skill_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
  proficiency SMALLINT NOT NULL CHECK (proficiency BETWEEN 1 AND 5),
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS staff_skill_history_staff_idx
  ON public.staff_skill_history (staff_id, effective_to, effective_from DESC);
CREATE INDEX IF NOT EXISTS staff_skill_history_skill_idx
  ON public.staff_skill_history (skill_id);

CREATE TABLE IF NOT EXISTS public.job_title_skill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title_id UUID NOT NULL
    REFERENCES public.job_titles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
  minimum_proficiency SMALLINT NOT NULL
    CHECK (minimum_proficiency BETWEEN 1 AND 5),
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (job_title_id, skill_id)
);

DROP TRIGGER IF EXISTS skills_set_updated_at ON public.skills;
CREATE TRIGGER skills_set_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS staff_skill_history_set_updated_at
  ON public.staff_skill_history;
CREATE TRIGGER staff_skill_history_set_updated_at
  BEFORE UPDATE ON public.staff_skill_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS job_title_skill_requirements_set_updated_at
  ON public.job_title_skill_requirements;
CREATE TRIGGER job_title_skill_requirements_set_updated_at
  BEFORE UPDATE ON public.job_title_skill_requirements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_one_active_staff_skill()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.effective_to IS NULL AND EXISTS (
    SELECT 1
    FROM public.staff_skill_history AS existing
    WHERE existing.staff_id = NEW.staff_id
      AND existing.skill_id = NEW.skill_id
      AND existing.effective_to IS NULL
      AND existing.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'Staff member already has an active record for this skill'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_skill_history_one_active
  ON public.staff_skill_history;
CREATE TRIGGER staff_skill_history_one_active
  BEFORE INSERT OR UPDATE OF staff_id, skill_id, effective_to
  ON public.staff_skill_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_one_active_staff_skill();

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_skill_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_title_skill_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read skills" ON public.skills;
DROP POLICY IF EXISTS "HR administrators create skills" ON public.skills;
DROP POLICY IF EXISTS "HR administrators update skills" ON public.skills;
CREATE POLICY "Authenticated users read skills"
  ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR administrators create skills"
  ON public.skills FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin());
CREATE POLICY "HR administrators update skills"
  ON public.skills FOR UPDATE TO authenticated
  USING (public.is_hr_admin())
  WITH CHECK (public.is_hr_admin());

DROP POLICY IF EXISTS "Authorized members read staff skills"
  ON public.staff_skill_history;
DROP POLICY IF EXISTS "HR administrators create staff skills"
  ON public.staff_skill_history;
DROP POLICY IF EXISTS "HR administrators update staff skills"
  ON public.staff_skill_history;
CREATE POLICY "Authorized members read staff skills"
  ON public.staff_skill_history
  FOR SELECT TO authenticated
  USING (public.can_view_staff_profile(staff_id));
CREATE POLICY "HR administrators create staff skills"
  ON public.staff_skill_history
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin());
CREATE POLICY "HR administrators update staff skills"
  ON public.staff_skill_history
  FOR UPDATE TO authenticated
  USING (public.is_hr_admin())
  WITH CHECK (public.is_hr_admin());

DROP POLICY IF EXISTS "Authenticated users read job requirements"
  ON public.job_title_skill_requirements;
DROP POLICY IF EXISTS "HR administrators create job requirements"
  ON public.job_title_skill_requirements;
DROP POLICY IF EXISTS "HR administrators update job requirements"
  ON public.job_title_skill_requirements;
DROP POLICY IF EXISTS "HR administrators delete job requirements"
  ON public.job_title_skill_requirements;
CREATE POLICY "Authenticated users read job requirements"
  ON public.job_title_skill_requirements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR administrators create job requirements"
  ON public.job_title_skill_requirements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin());
CREATE POLICY "HR administrators update job requirements"
  ON public.job_title_skill_requirements
  FOR UPDATE TO authenticated
  USING (public.is_hr_admin())
  WITH CHECK (public.is_hr_admin());
CREATE POLICY "HR administrators delete job requirements"
  ON public.job_title_skill_requirements
  FOR DELETE TO authenticated
  USING (public.is_hr_admin());

GRANT SELECT, INSERT, UPDATE ON TABLE public.skills TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff_skill_history
  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.job_title_skill_requirements TO authenticated;
GRANT ALL
  ON TABLE
    public.skills,
    public.staff_skill_history,
    public.job_title_skill_requirements
  TO service_role;

COMMIT;
