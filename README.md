# GDT Organizational Chart

A React, TypeScript, and Supabase application for building individually owned
organizational charts and maintaining a GDT-wide HR staff directory.

## Current capabilities

- Drag-and-drop chart editing, automatic layout, undo/redo, search, export, and
  version history
- Owner-controlled invitations with view or edit access
- Public read-only chart links with privacy-safe server projections
- GDT-wide staff directory maintained by HR administrators
- One active position per person and one active occupant per position
- Department → office → reporting-position hierarchy
- Position history with joined date, left date, and reason
- Skill proficiency levels 1–5 and job-title skill requirements
- Right-click **View Details** profile flow; profile data is never opened by a
  normal node click
- Immediate local recovery, debounced serialized cloud saves, downloadable JSON
  chart backups, and JSON restore
- Incremental strict TypeScript, Tailwind v4 semantic tokens, and accessible
  Radix/Shadcn dialogs

## Access model

- A chart owner controls that chart and its invitations.
- Accepted viewers can view the chart and permitted profiles.
- Accepted editors can edit the chart and assign, transfer, or vacate staff.
- Public visitors receive only safe chart display data and cannot open staff
  profiles.
- Invited viewers and editors see a masked National ID.
- HR administrators see the full staff record and maintain the staff directory,
  skills, job architecture, and organizational reference data.
- HR status does not automatically grant access to another owner's chart.
- Supabase row-level security and permission-aware RPCs are the enforcement
  boundary; frontend route guards provide the matching user experience.

## Data boundaries

Chart JSON stores layout, edges, position display information, and stable
relational references. Staff profiles, sensitive identity data, skills, and
assignment history remain relational and are loaded only through authorized
queries. Full National ID is stored separately in `staff_sensitive`.

The editor requests only safe occupant labels and IDs when decorating a chart.
It does not copy phone, email, address, National ID, education, skills, or
history into chart JSON.

Save and recovery behavior:

1. edits are copied to browser storage immediately;
2. cloud saves are serialized and debounced;
3. a session safety version is created every five minutes;
4. **Backup JSON** downloads a complete chart recovery file;
5. **Restore JSON** validates a backup before replacing the current chart.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A Supabase project

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_HR_FEATURES_ENABLED=false
   VITE_CHART_VERSION_WRITES_ENABLED=false
   ```

   Keep HR features disabled until the complete HR/RBAC migration set has been
   applied and verified for that Supabase environment. Set the value to `true`
   only after the staged authorization checks pass.

   Keep cloud version writes disabled until `chart_versions` RLS has been
   tested for chart owners and accepted editors. Local recovery and normal
   chart saving do not depend on this flag.

3. Start the development server:

   ```bash
   npm run dev
   ```

Database rollout is intentionally separate from local startup. Follow
[`docs/database-rollout.md`](docs/database-rollout.md) and take a verified full
database backup before applying any migration. The prepared migrations have not
been applied to the live project by this implementation.

## Commands

```bash
npm run dev          # start Vite
npm run typecheck    # strict TypeScript check
npm run lint         # run oxlint
npm test             # Node and component tests
npm run test:node    # schema/migration/backup tests
npm run test:unit    # Vitest component and hook tests
npm run test:e2e     # Playwright browser tests
npm run build        # production build
npm run db:types     # regenerate Supabase types (requires access token)
npm run preview      # serve the production build
```

Before deployment, run `npm run typecheck`, `npm run lint`, `npm test`, and
`npm run build`. Run the browser suite in an environment where Chromium can
start.

## Database migrations

Apply these only to a backed-up staging project first:

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

Provision the first HR administrator using
[`docs/hr-admin-provisioning.md`](docs/hr-admin-provisioning.md). Never run the
dummy-data cleanup before reviewing its dry-run report and exporting every
affected chart.

## Deployment

`vercel.json` rewrites application routes to `index.html`. Configure
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment environment,
complete the staged database rollout, run all release gates, and deploy the
output of `npm run build`.
