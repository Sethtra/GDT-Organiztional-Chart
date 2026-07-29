# Database Rollout Handoff — 2026-07-29

## Live state

- All 13 schema and HR migrations are applied to the live Supabase database.
- `sethtragame@gmail.com` is provisioned as the first `hr_admin`.
- The protected legacy cleanup completed at `2026-07-29T03:29:21Z`.
- The verified pre-cleanup backup is:
  `backups/database/pre-rollout-20260729T032823Z/`
- That backup contains all 16 public tables, 791 rows, database metadata,
  per-table JSON, migration hashes, and SHA-256 checksums.

## Legacy dummy cleanup

The pre-cleanup database contained:

- 342 imported staff rows, all marked `created_by IS NULL`
- 237 assignments linked to those imported rows
- 0 HR-created staff rows
- 180 positions
- 5 charts
- 10 departments
- 12 offices

Migration `migrations/2026072911_cleanup_legacy_dummy_staff.sql`:

- copied every targeted staff, assignment, sensitive, skill, and chart row to
  private recovery tables;
- removed only imported dummy staff and their dummy assignment history;
- removed occupant-only fields from individual chart nodes;
- preserved chart nodes, node positions, edges, positions, departments, and
  offices;
- verified position and chart counts before committing.

Emergency database restoration is available in:
`scripts/sql/restore_legacy_dummy_cleanup.sql`.

## Verification

- Node tests: 33 passed
- Vitest tests: 33 passed
- TypeScript typecheck: passed
- Oxlint: passed
- Production build: passed
- Staff Directory profile action has a regression test confirming that a real
  HR-created staff profile opens from the directory.

## Operator workflow

1. Open `/admin/staff` as the HR administrator.
2. Refresh the directory; it should be empty until HR adds real staff.
3. Use **Add staff** to enter a real officer.
4. Use the person icon to open the new staff profile.
5. Assign the person to a position separately through the chart’s HR
   Assignment panel. Department and office are inherited from the position;
   they are not stored on the staff record.
