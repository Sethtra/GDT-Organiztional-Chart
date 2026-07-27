# Safe Database Rollout and Recovery Workflow

The migration files are prepared but have not been applied to the live Supabase
project. Do not skip the backup and staging gates.

## 1. Capture and verify a full backup

Use a Supabase-supported database backup or `pg_dump` with authorized database
credentials. The export must include schema, data, functions, triggers, RLS
policies, and grants.

For this project, set the database connection only in the current PowerShell
session and run the guarded rollout check:

```powershell
$env:GDT_DATABASE_URL = '<Supabase Postgres connection string>'
$env:GDT_HR_ADMIN_EMAIL = '<verified first HR administrator email>'
npm.cmd run db:rollout:check
```

The command creates role, schema, and data dumps under
`backups/database/pre-rollout-<UTC timestamp>/`, records file sizes and SHA-256
checksums, and performs a remote migration dry run. It refuses to proceed if a
backup is empty. The connection string must never be placed in `.env.local`,
source control, logs, or chat.

The connection string may retain its `[YOUR-PASSWORD]` placeholder. In that
case, the rollout command requests the database password through a protected
local prompt and URI-encodes it in memory.

When Docker is unavailable, the guarded rollout uses the project's lightweight
PostgreSQL client. It exports every row from every `public` table, schema
metadata (columns, constraints, indexes, policies, functions, triggers, views,
and grants), and authentication user identity references. The backup manifest
records table counts, row counts, sizes, and SHA-256 checksums. All migrations
and first-admin provisioning are then executed inside one database transaction,
so a failure rolls back the entire schema change.

The direct PostgreSQL workflow requires the project CA certificate at
`backups/supabase-ca/prod-ca-2021.crt`, or at the path specified by
`GDT_SSL_CA_FILE`. Download it from **Database Settings > SSL Configuration**.
The client verifies both the certificate chain and hostname; do not disable TLS
verification to bypass certificate errors.

Record:

- project reference and environment;
- UTC backup time;
- tool and version;
- file size and SHA-256;
- storage location and access owner.

Restore the backup into a separate staging project and verify chart counts,
node/edge JSON, staff, positions, assignments, shares, and organizational
reference data. A source archive is not a database backup.

## 2. Preserve every chart independently

Before migration, each chart owner or an authorized operator should download the
editor's **Backup JSON** file. Keep these files outside the application project.
Test at least one backup with **Restore JSON** in staging.

## 3. Apply migrations to staging in order

1. `migration_core_schema.sql`
2. `migration_org_structure.sql`
3. `migrations/2026072701_add_hr_admin_rbac.sql`
4. `migrations/2026072702_secure_global_staff_directory.sql`
5. `migrations/2026072703_add_job_titles_and_reporting.sql`
6. `migrations/2026072704_add_skills_and_requirements.sql`
7. `migrations/2026072705_add_atomic_assignment_operations.sql`
8. `migrations/2026072706_add_staff_directory_api.sql`
9. `migrations/2026072707_add_position_assignment_api.sql`
10. `migrations/2026072708_add_profile_and_skill_api.sql`
11. `migrations/2026072709_add_job_architecture_api.sql`
12. `migrations/2026072710_add_position_configuration_api.sql`

Stop on the first error. Do not continue with later migrations until the staging
database has been restored to the known backup or the failure has been
understood and corrected.

## 4. Provision and test authorization

Follow [`hr-admin-provisioning.md`](hr-admin-provisioning.md) to assign the first
HR administrator manually.

Test with separate accounts:

- anonymous visitor;
- authenticated user without invitation;
- accepted viewer;
- accepted chart editor;
- HR administrator who is not invited to the chart;
- HR administrator who is invited to the chart.

Verify public chart reads are safe, profile access requires an accepted
invitation or HR directory access, invited users see masked National ID, only HR
sees full National ID, and direct unauthorized table writes fail.

## 5. Regenerate database types

After staging contains the complete schema:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "temporary-personal-access-token"
npm.cmd run db:types
Remove-Item Env:SUPABASE_ACCESS_TOKEN
```

Review the generated diff, then run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Do not commit or print the access token.

## 6. Run functional verification

Set `VITE_HR_FEATURES_ENABLED=true` in the staging deployment only after all
HR/RBAC migrations have succeeded. This rollout flag prevents older database
environments from calling RPCs that do not exist yet; it does not replace RLS
or RPC authorization.

Set `VITE_CHART_VERSION_WRITES_ENABLED=true` only after staging confirms that
chart owners and accepted editors can insert and delete `chart_versions`, while
viewers and anonymous users cannot. Normal chart saves and local recovery remain
available while this flag is false.

In a real browser, verify:

- owner invitation, acceptance, viewer access, and editor access;
- public read-only chart access;
- node drag, edge edits, undo/redo, autosave, local recovery, JSON backup and
  restore;
- staff create/edit/archive and duplicate-location notice;
- department then office then reporting-position selection;
- assign, transfer, and vacate while preserving the position node;
- right-click **View Details**, masked invited profile, and full HR profile;
- current position, history, joined/left/reason;
- skills, proficiency changes, job requirements, and fit report;
- keyboard focus, Escape close, tab trapping, labels, light/dark theme, and
  responsive layouts.

## 7. Reconcile dummy occupant data

Do this only after all earlier gates pass.

1. Run `scripts/sql/dummy_cleanup_dry_run.sql`.
2. Review every affected chart and possible duplicate with HR.
3. Export those charts again.
4. Use the cleanup utility only to create a new output copy; never overwrite the
   original input.
5. Compare node count, node IDs, positions, edges, org fields, job titles, and
   style fields before accepting the cleaned copy.
6. Confirm only dummy occupant and history fields were cleared.

No production cleanup is authorized merely because the dry run succeeds.

## 8. Production release

Schedule a maintenance window, take a new verified full backup, repeat the
staging-tested migration order, provision the verified first HR administrator,
set `VITE_HR_FEATURES_ENABLED=true`, deploy the matching source build, and run
the authorization and smoke tests again.

After `npm.cmd run db:rollout:check` succeeds against the intended database,
apply the same verified migration set with:

```powershell
npm.cmd run db:rollout
Remove-Item Env:GDT_DATABASE_URL
Remove-Item Env:GDT_HR_ADMIN_EMAIL
```

`db:rollout` takes a new pre-rollout backup before it applies anything. Keep the
reported backup directory outside the application project as an additional
recovery copy. The verified first HR administrator is assigned by the final
one-time rollout migration; the email-bearing migration exists only in the
ignored recovery workspace and is not committed to source.

## Recovery

If a migration or release check fails:

1. stop writes and deployment progression;
2. preserve logs and the exact failing migration;
3. restore the verified pre-release database backup into a clean project;
4. point a staging deployment at the restored project;
5. verify chart counts and JSON checksums before resuming;
6. restore source from the verified source checkpoint if needed.

Do not attempt an improvised destructive rollback against the only copy of the
production database.
