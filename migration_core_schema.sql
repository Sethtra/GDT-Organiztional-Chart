-- ============================================================================
-- GDT Organizational Chart — Core Supabase Schema
-- Repeatable migration for charts, folders, sharing, versions, HR, and storage.
-- Run before migration_org_structure.sql.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Core tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chart_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.chart_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.chart_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Chart',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  public_access_level TEXT NOT NULL DEFAULT 'view'
    CHECK (public_access_level IN ('view', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chart_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  shared_email TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'view'
    CHECK (access_level IN ('view', 'edit')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS chart_shares_chart_email_uidx
  ON public.chart_shares (chart_id, lower(shared_email));

CREATE TABLE IF NOT EXISTS public.chart_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  title TEXT,
  department TEXT,
  office TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chart_id, node_id)
);

CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  name_en TEXT,
  staff_id TEXT,
  phone TEXT,
  address TEXT,
  marital_status TEXT,
  siblings TEXT,
  education TEXT,
  skill TEXT,
  join_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.position_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  start_date DATE,
  end_date DATE,
  exit_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- CREATE TABLE IF NOT EXISTS does not add columns to an older partial schema.
-- These additions make reruns safely bring those tables up to the app contract.
ALTER TABLE public.chart_folders ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chart_folders ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.chart_folders(id) ON DELETE SET NULL;
ALTER TABLE public.chart_folders ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.chart_folders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.chart_folders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.chart_folders(id) ON DELETE SET NULL;
ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Untitled Chart';
ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS nodes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS edges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS public_access_level TEXT DEFAULT 'view';
ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.chart_shares ADD COLUMN IF NOT EXISTS chart_id UUID REFERENCES public.charts(id) ON DELETE CASCADE;
ALTER TABLE public.chart_shares ADD COLUMN IF NOT EXISTS shared_email TEXT;
ALTER TABLE public.chart_shares ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'view';
ALTER TABLE public.chart_shares ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.chart_shares ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.chart_shares ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.chart_versions ADD COLUMN IF NOT EXISTS chart_id UUID REFERENCES public.charts(id) ON DELETE CASCADE;
ALTER TABLE public.chart_versions ADD COLUMN IF NOT EXISTS nodes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.chart_versions ADD COLUMN IF NOT EXISTS edges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.chart_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS chart_id UUID REFERENCES public.charts(id) ON DELETE CASCADE;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS node_id TEXT;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS office TEXT;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS siblings TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS skill TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS join_date DATE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.position_assignments ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES public.positions(id) ON DELETE CASCADE;
ALTER TABLE public.position_assignments ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE RESTRICT;
ALTER TABLE public.position_assignments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.position_assignments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.position_assignments ADD COLUMN IF NOT EXISTS exit_status TEXT;
ALTER TABLE public.position_assignments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.position_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.position_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS charts_owner_updated_idx
  ON public.charts (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS charts_folder_idx
  ON public.charts (folder_id);
CREATE INDEX IF NOT EXISTS chart_folders_owner_parent_idx
  ON public.chart_folders (owner_id, parent_id);
CREATE INDEX IF NOT EXISTS chart_shares_email_idx
  ON public.chart_shares (lower(shared_email), status);
CREATE INDEX IF NOT EXISTS chart_versions_chart_created_idx
  ON public.chart_versions (chart_id, created_at DESC);
CREATE INDEX IF NOT EXISTS positions_chart_idx
  ON public.positions (chart_id);
CREATE INDEX IF NOT EXISTS assignments_position_active_idx
  ON public.position_assignments (position_id, end_date);
CREATE INDEX IF NOT EXISTS assignments_staff_idx
  ON public.position_assignments (staff_id);

-- ── Shared helpers ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

CREATE OR REPLACE FUNCTION public.can_view_chart(target_chart_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.charts AS chart
    WHERE chart.id = target_chart_id
      AND (
        chart.owner_id = auth.uid()
        OR chart.is_public
        OR EXISTS (
          SELECT 1
          FROM public.chart_shares AS share
          WHERE share.chart_id = chart.id
            AND lower(share.shared_email) = public.current_user_email()
            AND share.status = 'accepted'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_chart(target_chart_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.charts AS chart
    WHERE chart.id = target_chart_id
      AND (
        chart.owner_id = auth.uid()
        OR (chart.is_public AND chart.public_access_level = 'edit')
        OR EXISTS (
          SELECT 1
          FROM public.chart_shares AS share
          WHERE share.chart_id = chart.id
            AND lower(share.shared_email) = public.current_user_email()
            AND share.status = 'accepted'
            AND share.access_level = 'edit'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_chart_invite(target_chart_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chart_shares AS share
    WHERE share.chart_id = target_chart_id
      AND lower(share.shared_email) = public.current_user_email()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chart_owner(target_chart_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.charts AS chart
    WHERE chart.id = target_chart_id
      AND chart.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_folder(target_folder_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chart_folders AS folder
    WHERE folder.id = target_folder_id
      AND folder.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_chart(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_edit_chart(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_chart_invite(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_chart_owner(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_folder(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_chart(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_chart(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_chart_invite(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_chart_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_folder(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS charts_set_updated_at ON public.charts;
CREATE TRIGGER charts_set_updated_at
  BEFORE UPDATE ON public.charts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS chart_folders_set_updated_at ON public.chart_folders;
CREATE TRIGGER chart_folders_set_updated_at
  BEFORE UPDATE ON public.chart_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS chart_shares_set_updated_at ON public.chart_shares;
CREATE TRIGGER chart_shares_set_updated_at
  BEFORE UPDATE ON public.chart_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS positions_set_updated_at ON public.positions;
CREATE TRIGGER positions_set_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS staff_set_updated_at ON public.staff;
CREATE TRIGGER staff_set_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS assignments_set_updated_at ON public.position_assignments;
CREATE TRIGGER assignments_set_updated_at
  BEFORE UPDATE ON public.position_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Non-owners may edit chart content when sharing permits it, but may not
-- change ownership, folder placement, name, or sharing configuration.
CREATE OR REPLACE FUNCTION public.protect_chart_owner_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.owner_id IS DISTINCT FROM auth.uid() AND (
    NEW.owner_id IS DISTINCT FROM OLD.owner_id
    OR NEW.folder_id IS DISTINCT FROM OLD.folder_id
    OR NEW.name IS DISTINCT FROM OLD.name
    OR NEW.is_public IS DISTINCT FROM OLD.is_public
    OR NEW.public_access_level IS DISTINCT FROM OLD.public_access_level
  ) THEN
    RAISE EXCEPTION 'Only the chart owner can change chart identity or sharing';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS charts_protect_owner_fields ON public.charts;
CREATE TRIGGER charts_protect_owner_fields
  BEFORE UPDATE ON public.charts
  FOR EACH ROW EXECUTE FUNCTION public.protect_chart_owner_fields();

-- Invitees may only accept their own invitation; owners control all other
-- share fields.
CREATE OR REPLACE FUNCTION public.protect_chart_share_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  chart_owner UUID;
BEGIN
  SELECT owner_id INTO chart_owner
  FROM public.charts
  WHERE id = OLD.chart_id;

  IF chart_owner IS DISTINCT FROM auth.uid() AND (
    NEW.chart_id IS DISTINCT FROM OLD.chart_id
    OR lower(NEW.shared_email) IS DISTINCT FROM lower(OLD.shared_email)
    OR NEW.access_level IS DISTINCT FROM OLD.access_level
    OR lower(OLD.shared_email) IS DISTINCT FROM public.current_user_email()
  ) THEN
    RAISE EXCEPTION 'Invitees may only update their own invitation status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chart_shares_protect_fields ON public.chart_shares;
CREATE TRIGGER chart_shares_protect_fields
  BEFORE UPDATE ON public.chart_shares
  FOR EACH ROW EXECUTE FUNCTION public.protect_chart_share_fields();

CREATE OR REPLACE FUNCTION public.protect_hr_identity_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'positions' AND (
    NEW.chart_id IS DISTINCT FROM OLD.chart_id
    OR NEW.node_id IS DISTINCT FROM OLD.node_id
  ) THEN
    RAISE EXCEPTION 'A position cannot be moved to another chart or node';
  END IF;

  IF TG_TABLE_NAME = 'staff'
    AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Staff ownership cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS positions_protect_identity ON public.positions;
CREATE TRIGGER positions_protect_identity
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.protect_hr_identity_fields();

DROP TRIGGER IF EXISTS staff_protect_owner ON public.staff;
CREATE TRIGGER staff_protect_owner
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.protect_hr_identity_fields();

-- ── Row-level security ───────────────────────────────────────────────────────

ALTER TABLE public.chart_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage folders" ON public.chart_folders;
CREATE POLICY "Owners manage folders"
  ON public.chart_folders
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      parent_id IS NULL
      OR public.owns_folder(parent_id)
    )
  );

DROP POLICY IF EXISTS "View accessible charts" ON public.charts;
CREATE POLICY "View accessible charts"
  ON public.charts
  FOR SELECT TO anon, authenticated
  USING (
    owner_id = auth.uid()
    OR is_public
    OR public.has_chart_invite(id)
  );

DROP POLICY IF EXISTS "Create owned charts" ON public.charts;
CREATE POLICY "Create owned charts"
  ON public.charts
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      folder_id IS NULL
      OR public.owns_folder(folder_id)
    )
  );

DROP POLICY IF EXISTS "Edit permitted charts" ON public.charts;
CREATE POLICY "Edit permitted charts"
  ON public.charts
  FOR UPDATE TO anon, authenticated
  USING (public.can_edit_chart(id))
  WITH CHECK (public.can_edit_chart(id));

DROP POLICY IF EXISTS "Owners delete charts" ON public.charts;
CREATE POLICY "Owners delete charts"
  ON public.charts
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners and invitees view shares" ON public.chart_shares;
CREATE POLICY "Owners and invitees view shares"
  ON public.chart_shares
  FOR SELECT TO authenticated
  USING (
    lower(shared_email) = public.current_user_email()
    OR public.is_chart_owner(chart_id)
  );

DROP POLICY IF EXISTS "Owners create shares" ON public.chart_shares;
CREATE POLICY "Owners create shares"
  ON public.chart_shares
  FOR INSERT TO authenticated
  WITH CHECK (public.is_chart_owner(chart_id));

DROP POLICY IF EXISTS "Owners and invitees update shares" ON public.chart_shares;
CREATE POLICY "Owners and invitees update shares"
  ON public.chart_shares
  FOR UPDATE TO authenticated
  USING (
    lower(shared_email) = public.current_user_email()
    OR public.is_chart_owner(chart_id)
  )
  WITH CHECK (
    lower(shared_email) = public.current_user_email()
    OR public.is_chart_owner(chart_id)
  );

DROP POLICY IF EXISTS "Owners and invitees delete shares" ON public.chart_shares;
CREATE POLICY "Owners and invitees delete shares"
  ON public.chart_shares
  FOR DELETE TO authenticated
  USING (
    lower(shared_email) = public.current_user_email()
    OR public.is_chart_owner(chart_id)
  );

DROP POLICY IF EXISTS "Editors manage chart versions" ON public.chart_versions;
CREATE POLICY "Editors manage chart versions"
  ON public.chart_versions
  FOR ALL TO anon, authenticated
  USING (public.can_edit_chart(chart_id))
  WITH CHECK (public.can_edit_chart(chart_id));

DROP POLICY IF EXISTS "View HR for accessible charts" ON public.positions;
CREATE POLICY "View HR for accessible charts"
  ON public.positions
  FOR SELECT TO anon, authenticated
  USING (public.can_view_chart(chart_id));

DROP POLICY IF EXISTS "Editors manage positions" ON public.positions;
CREATE POLICY "Editors manage positions"
  ON public.positions
  FOR ALL TO authenticated
  USING (public.can_edit_chart(chart_id))
  WITH CHECK (public.can_edit_chart(chart_id));

DROP POLICY IF EXISTS "View staff through accessible positions" ON public.staff;
CREATE POLICY "View staff through accessible positions"
  ON public.staff
  FOR SELECT TO anon, authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.position_assignments AS assignment
      JOIN public.positions AS position ON position.id = assignment.position_id
      WHERE assignment.staff_id = id
        AND public.can_view_chart(position.chart_id)
    )
  );

DROP POLICY IF EXISTS "Editors create staff" ON public.staff;
CREATE POLICY "Editors create staff"
  ON public.staff
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.charts AS chart
      WHERE chart.owner_id = staff.owner_id
        AND public.can_edit_chart(chart.id)
    )
  );

DROP POLICY IF EXISTS "Editors update staff" ON public.staff;
CREATE POLICY "Editors update staff"
  ON public.staff
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.position_assignments AS assignment
      JOIN public.positions AS position ON position.id = assignment.position_id
      WHERE assignment.staff_id = id
        AND public.can_edit_chart(position.chart_id)
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owners delete unreferenced staff" ON public.staff;
CREATE POLICY "Owners delete unreferenced staff"
  ON public.staff
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "View assignments for accessible charts" ON public.position_assignments;
CREATE POLICY "View assignments for accessible charts"
  ON public.position_assignments
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.positions AS position
      WHERE position.id = position_id
        AND public.can_view_chart(position.chart_id)
    )
  );

DROP POLICY IF EXISTS "Editors manage assignments" ON public.position_assignments;
CREATE POLICY "Editors manage assignments"
  ON public.position_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.positions AS position
      WHERE position.id = position_id
        AND public.can_edit_chart(position.chart_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.positions AS position
      WHERE position.id = position_id
        AND public.can_edit_chart(position.chart_id)
    )
  );

-- ── Thumbnail storage ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public thumbnail reads" ON storage.objects;
CREATE POLICY "Public thumbnail reads"
  ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'thumbnails');

DROP POLICY IF EXISTS "Editors upload thumbnails" ON storage.objects;
CREATE POLICY "Editors upload thumbnails"
  ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'thumbnails'
    AND public.can_edit_chart(
      CASE
        WHEN name ~ '^[0-9a-fA-F-]{36}[.]png$'
        THEN split_part(name, '.', 1)::uuid
        ELSE NULL
      END
    )
  );

DROP POLICY IF EXISTS "Editors update thumbnails" ON storage.objects;
CREATE POLICY "Editors update thumbnails"
  ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (
    bucket_id = 'thumbnails'
    AND public.can_edit_chart(
      CASE
        WHEN name ~ '^[0-9a-fA-F-]{36}[.]png$'
        THEN split_part(name, '.', 1)::uuid
        ELSE NULL
      END
    )
  )
  WITH CHECK (
    bucket_id = 'thumbnails'
    AND public.can_edit_chart(
      CASE
        WHEN name ~ '^[0-9a-fA-F-]{36}[.]png$'
        THEN split_part(name, '.', 1)::uuid
        ELSE NULL
      END
    )
  );

DROP POLICY IF EXISTS "Owners delete thumbnails" ON storage.objects;
CREATE POLICY "Owners delete thumbnails"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'thumbnails'
    AND name ~ '^[0-9a-fA-F-]{36}[.]png$'
    AND EXISTS (
      SELECT 1 FROM public.charts AS chart
      WHERE chart.id = CASE
          WHEN name ~ '^[0-9a-fA-F-]{36}[.]png$'
          THEN split_part(name, '.', 1)::uuid
          ELSE NULL
        END
        AND chart.owner_id = auth.uid()
    )
  );

COMMIT;
