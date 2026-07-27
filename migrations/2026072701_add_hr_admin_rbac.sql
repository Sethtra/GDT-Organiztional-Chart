-- GDT HR administrator RBAC.
-- Additive migration: creates role metadata and replaces organizational
-- structure write policies. It does not assign the first administrator.
-- Apply only after migration_core_schema.sql and migration_org_structure.sql.

BEGIN;

DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('hr_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.has_app_role(required_role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = required_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_hr_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_app_role('hr_admin'::public.app_role);
$$;

REVOKE ALL ON FUNCTION public.has_app_role(public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_hr_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_app_role(public.app_role)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_hr_admin()
  TO authenticated, service_role;

-- Organizational structure remains readable to authenticated users, while
-- writes require the database-backed HR administrator role.
DROP POLICY IF EXISTS "Anyone can read org_units" ON public.org_units;
DROP POLICY IF EXISTS "Authenticated users can insert org_units" ON public.org_units;
DROP POLICY IF EXISTS "Authenticated users can update org_units" ON public.org_units;
DROP POLICY IF EXISTS "Authenticated users can delete org_units" ON public.org_units;
DROP POLICY IF EXISTS "Authenticated users read org_units" ON public.org_units;
DROP POLICY IF EXISTS "HR administrators insert org_units" ON public.org_units;
DROP POLICY IF EXISTS "HR administrators update org_units" ON public.org_units;
DROP POLICY IF EXISTS "HR administrators delete org_units" ON public.org_units;

CREATE POLICY "Authenticated users read org_units"
  ON public.org_units
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR administrators insert org_units"
  ON public.org_units
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "HR administrators update org_units"
  ON public.org_units
  FOR UPDATE
  TO authenticated
  USING (public.is_hr_admin())
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "HR administrators delete org_units"
  ON public.org_units
  FOR DELETE
  TO authenticated
  USING (public.is_hr_admin());

DROP POLICY IF EXISTS "Anyone can read org_offices" ON public.org_offices;
DROP POLICY IF EXISTS "Authenticated users can insert org_offices" ON public.org_offices;
DROP POLICY IF EXISTS "Authenticated users can update org_offices" ON public.org_offices;
DROP POLICY IF EXISTS "Authenticated users can delete org_offices" ON public.org_offices;
DROP POLICY IF EXISTS "Authenticated users read org_offices" ON public.org_offices;
DROP POLICY IF EXISTS "HR administrators insert org_offices" ON public.org_offices;
DROP POLICY IF EXISTS "HR administrators update org_offices" ON public.org_offices;
DROP POLICY IF EXISTS "HR administrators delete org_offices" ON public.org_offices;

CREATE POLICY "Authenticated users read org_offices"
  ON public.org_offices
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "HR administrators insert org_offices"
  ON public.org_offices
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "HR administrators update org_offices"
  ON public.org_offices
  FOR UPDATE
  TO authenticated
  USING (public.is_hr_admin())
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "HR administrators delete org_offices"
  ON public.org_offices
  FOR DELETE
  TO authenticated
  USING (public.is_hr_admin());

COMMIT;
