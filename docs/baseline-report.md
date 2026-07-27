# Task 1 Baseline Report

Date: 2026-07-27 (Asia/Phnom_Penh)
Branch: `Tra` (one commit ahead of `origin/Tra`)
Base commit: `8d57af8cb90996c29a6c0412f0d26ed35df24d01`

## Outcome

Task 1 preserves the current dirty source workspace, proves that the source
archive can be restored, and records the current application baseline. Existing
user changes in `src/App.jsx`, `src/index.css`, and other dirty/untracked paths
were preserved without reset, checkout, or cleanup.

No application behavior, database schema, or database data was changed.

## Backup

Backup directory:
`backups/task-01-baseline-2026-07-27/`

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `source-tree.zip` | 9,086,170 bytes | `1728CC3B3C2F6347A53FE3A8000F50D532BDED84AF66D2F0CEBF1C5EA315A536` |
| `tracked-working-tree.patch` | 129,200 bytes | `0477905D887DBAF660BE28EFE42C05BA3E7DC4CE4E3E165EE52A49A3DED71A29` |

The archive excludes:

- `.git`
- `.env` and `.env.*`, including `.env.local`
- `node_modules`
- `dist` and `dist-ssr`
- nested `backups`
- local-only `*.local` files

Restore verification passed by extracting to a temporary directory, checking
`package.json`, `src/App.jsx`, `src/index.css`, `IMPLEMENTATION_PLAN.md`, and
`Task.txt`, confirming all excluded paths were absent, and removing the
temporary extraction. See the backup directory's `RESTORE.md`.

## Database backup gate

The environment variable names were inspected without printing values. Only
these public client variables are available:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The machine has neither `pg_dump` nor the Supabase CLI. No database connection
string, service-role credential, or Supabase CLI access token is available.
Therefore a complete, authoritative Supabase schema-and-data export cannot be
created from this environment.

This is an explicit safety gate:

- no destructive migration may run;
- no dummy occupant/history cleanup may run;
- before those tasks, an authorized database backup must be produced and its
  restore procedure verified.

An anonymous-key query is not treated as a backup because Row Level Security can
omit protected rows and private fields.

## Engineering baseline

Runtime:

- Node.js `v22.20.0`
- npm `10.9.3`
- Vite `8.1.2`
- React `19.2.7`

Results:

| Check | Result | Notes |
| --- | --- | --- |
| `npm.cmd run lint` | Pass | oxlint reported zero errors |
| `npm.cmd test` | Pass | 13 tests passed; 0 failed |
| `npm.cmd run build` | Pass | 338 modules transformed; production build completed in 893 ms |
| Frontend inventory | Pass | React + Vite, plain CSS, Lucide, XYFlow, 71 discovered CSS custom properties |
| Vite HTTP smoke check | Pass | Local runtime returned `200 OK` |
| Chrome visual capture | Environment-blocked | Chrome crashed in its GPU/cache sandbox under the restricted workspace session |

The production output included a `97.47 kB` application CSS asset and a
`222.63 kB` application JavaScript asset before gzip. These are observations,
not Task 1 failures.

## Browser limitation

The Chrome DevTools connector was unavailable. A local Chrome headless fallback
was attempted against the bounded Vite server. Vite started and returned
`200 OK`, but Chrome terminated before rendering because its GPU/cache sandbox
could not initialize in the restricted session. The failure is captured in
`backups/task-01-baseline-2026-07-27/chrome-smoke.stderr.log`.

Every Vite process started for this check was stopped, temporary Chrome profiles
were removed, and port `5173` was confirmed free. Interactive browser
characterization remains part of Task 2, using an installed test harness or an
available browser connector.

## Existing test coverage

The 13 passing Node tests currently cover:

- local edit recovery decisions;
- chart owner/public/share permissions;
- folder breadcrumb/cycle behavior;
- serialized task scheduling and cancellation.

They do not yet characterize React UI interactions, profile privacy, staff
assignment operations, right-click detail behavior, accessibility, or
browser-level editor behavior. Task 2 addresses this gap.

## Working-tree safety

The baseline began with user-owned changes and untracked files. Task 1 added
only:

- `IMPLEMENTATION_PLAN.md`;
- this report;
- `.gitignore` coverage for `backups/`;
- ignored backup artifacts under `backups/`.

No commit was created, because the working tree already contained unrelated user
work and Task 1 does not require combining it into a commit.
