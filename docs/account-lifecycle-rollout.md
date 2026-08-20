# Account Lifecycle Rollout

The profile page shows the current browser session and supports permanent
account deletion through the authenticated `delete-account` Supabase Edge
Function. No service-role credential is included in the browser bundle.

## Safety Contract

- Owned charts, folders, versions, positions, invitations, and thumbnails are
  removed when the Auth user is deleted.
- GDT-wide `staff` records are preserved. Their legacy `owner_id` is set to
  `NULL` instead of cascading the personnel record.
- Access to charts owned by other users is removed by deleting matching share
  memberships.
- The final HR administrator cannot delete their own account.
- Institutional staff photos are preserved even when uploaded by the deleted
  account.

## Staging Rollout

1. Create and verify the normal pre-rollout database backup.
2. Run `npm.cmd run db:rollout:check` against staging.
3. Apply the verified migration set with `npm.cmd run db:rollout`.
4. Set `GDT_SUPABASE_PROJECT_REF` in the current shell.
5. Deploy the function with `npm.cmd run functions:account:deploy`.
6. Test deletion with a non-HR staging user that owns a disposable chart.
7. Confirm the Auth user, owned chart rows, share memberships, and thumbnails
   are gone while unrelated charts and `staff` rows remain unchanged.
8. Confirm deletion of the only HR administrator is rejected.

The session panel intentionally identifies the current device only. Supabase
does not expose a supported browser API for enumerating every Auth session.
`Sign out everywhere` remains the supported control for revoking all refresh
tokens across devices.
