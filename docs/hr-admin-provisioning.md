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

## Staff accounts: access requests

Public sign-up is disabled. Staff request an account at `/register` with their
full name, work email, and employee ID. HR administrators review requests at
**Admin → Access requests**: each request shows whether the employee ID matches
a staff record and whether an account already exists. **Approve & send invite**
emails a Supabase invitation; **Reject** records an optional reason. Approved
requests whose invitation was never accepted show **Resend invitation**.

One-time setup (Supabase dashboard, then CLI):

1. Authentication → Sign In / Providers: turn **off** "Allow new users to sign
   up". Invitations still work; this also stops new Google sign-ups.
2. Authentication → Emails → **Invite user** template: point the link at the
   app's token-hash flow (the browser client uses PKCE, which cannot accept the
   default invite link):

   ```html
   <a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=invite">Accept the invitation</a>
   ```

3. Authentication → URL Configuration: **Site URL** must be the production app
   URL (for example `https://<your-domain>`).
4. Optional: Authentication → Providers → Email → raise the email link expiry
   (default 1 hour) so officers have time to open the invitation.
5. Apply `migrations/2026101601_add_access_requests.sql` with the normal
   rollout (`npm run db:rollout:check`, then `npm run db:rollout`).
6. Deploy the function: set `GDT_SUPABASE_PROJECT_REF`, then
   `npm run functions:access:deploy`. Set the `GDT_APP_ORIGINS` function secret
   to the production origin if it is not already set for `delete-account`.

## Two-step sign-in (MFA) for every account

Every account signs in with a password **and** a 6-digit code from an
authenticator app (Google Authenticator, Microsoft Authenticator, Authy). The
first sign-in shows a QR code to set it up (`/mfa`). The database rejects API
calls from sessions that have not passed the code
(`migrations/2026101602_require_mfa_for_api.sql`), so skipping the screen does
not reveal data. Public visitors and access requests are unaffected.

Setup and rollout order:

1. Supabase → Authentication → Multi-Factor: confirm **TOTP (App
   Authenticator)** is enabled (it is by default, at no cost).
2. Deploy the app build that contains `/mfa`, then
   `npm run functions:mfa-reset:deploy`.
3. Apply the migrations with the normal rollout. Users who have not set up
   two-step sign-in are taken to the setup screen at their next sign-in.

Officer lost their phone: **Admin → Access requests → Reset two-step sign-in**.
Confirm the officer's identity in person or by phone first; after the reset,
they set it up again at their next sign-in.

The only HR administrator lost their phone: in the Supabase SQL Editor, remove
their factors so they can set up again:

```sql
DELETE FROM auth.mfa_factors
WHERE user_id = (SELECT id FROM auth.users WHERE lower(email) = lower('hr-admin@example.com'));
```

Emergency switch-off if sign-in is blocked by mistake (SQL Editor):

```sql
ALTER ROLE authenticator RESET pgrst.db_pre_request;
NOTIFY pgrst, 'reload config';
```

Re-enable by re-running `migrations/2026101602_require_mfa_for_api.sql`.
Storage uploads (profile photos, chart thumbnails) go through Supabase Storage,
which the API check does not cover; they remain limited by their own policies.
