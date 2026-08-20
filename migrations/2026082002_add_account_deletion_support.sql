-- Safe self-service account deletion support.
-- Global personnel records are preserved when a login account is removed.

BEGIN;

ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_owner_id_fkey;

ALTER TABLE public.staff
  ADD CONSTRAINT staff_owner_id_fkey
  FOREIGN KEY (owner_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.staff
  VALIDATE CONSTRAINT staff_owner_id_fkey;

CREATE OR REPLACE FUNCTION public.cleanup_deleted_account_memberships()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.email IS NOT NULL THEN
    DELETE FROM public.chart_shares AS share
    WHERE lower(share.shared_email) = lower(OLD.email);
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS auth_user_cleanup_chart_memberships ON auth.users;
CREATE TRIGGER auth_user_cleanup_chart_memberships
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_deleted_account_memberships();

REVOKE ALL ON FUNCTION public.cleanup_deleted_account_memberships() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.prepare_account_deletion(
  target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_email TEXT;
  target_avatar_url TEXT;
  target_is_hr_admin BOOLEAN;
  avatar_is_staff_photo BOOLEAN;
  thumbnail_paths JSONB;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Account deletion preparation requires the service role.'
      USING ERRCODE = '42501';
  END IF;

  SELECT
    user_record.email,
    user_record.raw_user_meta_data ->> 'avatar_url'
  INTO target_email, target_avatar_url
  FROM auth.users AS user_record
  WHERE user_record.id = target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The account no longer exists.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS user_role
    WHERE user_role.user_id = target_user_id
      AND user_role.role = 'hr_admin'::public.app_role
  )
  INTO target_is_hr_admin;

  IF target_is_hr_admin AND (
    SELECT count(*)
    FROM public.user_roles AS user_role
    WHERE user_role.role = 'hr_admin'::public.app_role
  ) <= 1 THEN
    RAISE EXCEPTION
      'The final HR administrator cannot delete their own account. Assign another HR administrator first.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(
    jsonb_agg(chart.id::TEXT || '.png' ORDER BY chart.id),
    '[]'::JSONB
  )
  INTO thumbnail_paths
  FROM public.charts AS chart
  WHERE chart.owner_id = target_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.staff AS staff_record
    WHERE target_avatar_url IS NOT NULL
      AND staff_record.photo_url = target_avatar_url
  )
  INTO avatar_is_staff_photo;

  -- Supabase Auth refuses to delete users that still own Storage objects.
  -- The Edge Function removes account-owned chart assets after Auth deletion;
  -- institutional profile photos remain in place without a user owner.
  UPDATE storage.objects
  SET owner_id = NULL
  WHERE owner_id::TEXT = target_user_id::TEXT;

  RETURN jsonb_build_object(
    'email', target_email,
    'thumbnailPaths', thumbnail_paths,
    'avatarUrl', target_avatar_url,
    'preserveAvatar', avatar_is_staff_photo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_account_deletion(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(UUID) TO service_role;

COMMIT;
