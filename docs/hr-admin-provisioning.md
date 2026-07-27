# HR Administrator Provisioning

The first HR administrator must be assigned manually by an authorized Supabase
project administrator. Do not store the target email or user ID in a migration.

## Before provisioning

1. Create and verify a complete Supabase database backup.
2. Apply `migrations/2026072701_add_hr_admin_rbac.sql`.
3. Confirm the intended user already exists in `auth.users`.
4. Verify the user's email directly with the administrator making the request.

## Assign the first HR administrator

Run this in the Supabase SQL Editor after replacing the placeholder email:

```sql
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT id, 'hr_admin'::public.app_role, id
FROM auth.users
WHERE lower(email) = lower('REPLACE_WITH_VERIFIED_EMAIL')
ON CONFLICT (user_id, role) DO NOTHING;
```

The first assignment records the same user as `granted_by` because no earlier HR
administrator exists. Later role-management work should record the actual
administrator who grants or revokes a role.

## Verify

```sql
SELECT
  user_id,
  role,
  granted_at,
  granted_by
FROM public.user_roles
WHERE role = 'hr_admin';
```

From the application, sign in as that user and call:

```sql
SELECT public.is_hr_admin();
```

The result must be `true`. A normal authenticated user must receive `false` and
must be unable to insert, update, or delete `org_units` or `org_offices`.

## Revoke

```sql
DELETE FROM public.user_roles
WHERE user_id = 'REPLACE_WITH_USER_UUID'
  AND role = 'hr_admin';
```

Never remove the final working HR administrator until a replacement has been
verified.
