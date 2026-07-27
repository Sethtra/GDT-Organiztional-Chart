# Implementation Progress

Date: 2026-07-27

## Outcome

The requested architecture is implemented or prepared in source without
changing the live Supabase database and without deleting chart or occupant data.
The application now has the frontend workflows, typed contracts, recovery
tools, and additive migration set needed for a staged rollout.

## Completed in source

- Verified source checkpoints and chart JSON backup/restore
- Characterization, contract, hook, component, backup, cleanup, and migration
  tests
- HR administrator RBAC migration, route guard, and manual first-admin procedure
- Fail-closed HR rollout flag for environments where the additive HR/RBAC
  migrations are not deployed yet
- Owner/invitation chart access; public links are read-only
- Privacy-safe public chart RPC and permission-aware profile RPC
- Strict TypeScript configuration, runtime Zod contracts, and `typecheck`
- GDT-wide HR staff directory with duplicate-location warnings and archive flow
- HR-only sensitive National ID storage and masked invited-user profile
- Department → office → reporting-position configuration
- Atomic assign, transfer, and vacate operations
- One active position per staff member and one occupant per position
- Current profile, complete position history, and joined/left/reason fields
- Skills with proficiency levels 1–5 and job-title skill requirements
- Position-fit evaluation for missing or below-level skills
- Right-click-only centered profile dialog
- History, keyboard-shortcut, and persistence hooks extracted into TypeScript
- `PropertiesPanel` reduced to a small router with separate node and edge
  panels; HR assignment, position hierarchy, organization selectors, and color
  presets are also independent components
- Tailwind v4 semantic token mapping with preflight disabled, preserving the
  existing design
- Accessible Radix/Shadcn dialog pilot
- Safe chart staff projection that cannot add private profile fields or history
  to chart JSON

## Verification completed

At the current checkpoint:

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: 30 Node tests and 26 Vitest tests passed
- `npm run build`: passed
- Source archive listing, secret exclusion, extraction, and restore rehearsal:
  passed

The browser test suite is discoverable, but Chromium could not start reliably in
the current execution environment. It must be run in staging before release.

## Recovery checkpoint

Archive:

`backups/checkpoint-final-source-2026-07-27/source-tree.zip`

SHA-256:

```text
2569FDB4DB70759100D4E5A5DC30116795DFF35B696E70C94BFA94C0454DD36B
```

This archive contains source and configuration only. It excludes secrets,
dependencies, build output, `.git`, and database contents. Its restoration
instructions are stored beside the archive.

## Required release gates

These items are deliberately not represented as complete:

1. A complete Supabase database export has not been captured because only the
   anonymous browser key is available. No prepared migration has been applied.
2. The checked-in `Database` type is a clearly labelled bootstrap type. Run
   `npm run db:types` with a valid `SUPABASE_ACCESS_TOKEN` after the staging
   schema is migrated.
3. The SQL migrations have static safety tests but still need PostgreSQL runtime,
   RLS role-matrix, and RPC integration testing in a restored staging project.
4. Browser accessibility and end-to-end testing must run where Chromium is
   available.
5. npm reports three high-severity advisories. A full audit was not run because
   exporting the dependency tree was not authorized in this environment.
6. Remaining legacy UI surfaces can be migrated incrementally. Legacy CSS must
   be removed only after each corresponding surface is visually verified.

## Data safety statement

- No live table, row, chart node, or edge was changed.
- No dummy occupant or history data was cleaned.
- No migration was applied to the live Supabase project.
- Position nodes, node IDs, layouts, edges, department/office labels, job titles,
  and styling remain preserved.
- Cleanup tools are copy-producing or dry-run-first. They do not overwrite the
  input chart.

Use [`database-rollout.md`](database-rollout.md) for the next operational phase.
