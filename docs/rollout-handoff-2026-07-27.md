# Database Rollout Handoff — 2026-07-27

## Safe current state

- No rollout process is running.
- No migration was committed to the live Supabase database.
- The last rollout was executed inside one transaction and rolled back.
- The latest verified backup is:
  `backups/database/pre-rollout-20260727T101648Z/`
- That backup contains all 10 `public` tables, 782 rows, database metadata,
  per-table JSON files, migration hashes, and SHA-256 checksums.

## Completed during live validation

- Supabase session-pooler connectivity works.
- TLS is verified with the Supabase Root 2021 CA.
- The first core-schema RLS ambiguity was fixed by qualifying outer table
  references in staff and assignment policies.
- The core schema, organizational structure, and HR RBAC migrations now pass
  live validation before the transaction reaches migration 4.

## Exact next blocker

Migration:
`migrations/2026072702_secure_global_staff_directory.sql`

Failure:

```text
statement 10/66, near source line 20
record "new" has no field "chart_id"
PL/pgSQL function protect_hr_identity_fields() line 3 at IF
```

The shared trigger function evaluates position-only `NEW.chart_id` fields while
running for a legacy `staff` row. Split the `TG_TABLE_NAME` branches into nested
conditionals so PostgreSQL never resolves position-only fields for `staff`.

## Resume workflow

1. Fix and test the trigger function compatibility.
2. Rerun the protected rollout prompt.
3. Confirm the backup succeeds.
4. Continue statement-level live validation.
5. Commit only when all 12 migrations and first-HR-admin provisioning pass in
   the same transaction.
6. Enable `VITE_HR_FEATURES_ENABLED=true`, restart the app, and perform browser
   authorization and officer-entry verification.
