import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL(
  '../migrations/2026082903_fix_hr_activity_log_rpc_volatility.sql',
  import.meta.url,
);

test('activity log RPC is volatile because it prunes old rows', async () => {
  const sql = (await readFile(migrationUrl, 'utf8')).replace(/\r\n/g, '\n');

  assert.match(sql, /^\s*--[\s\S]*\bBEGIN;/i);
  assert.match(
    sql,
    /ALTER FUNCTION public\.get_hr_activity_log\(INTEGER\) VOLATILE/i,
  );
  assert.match(sql, /NOTIFY pgrst, 'reload schema'/i);
  assert.match(sql, /COMMIT;\s*$/i);
});

test('activity log migrations are included in the shared rollout manifest', async () => {
  // Both deploy-supabase.ps1 and direct-database-rollout.mjs read this manifest.
  const manifest = await readFile(
    new URL('../scripts/migration-manifest.json', import.meta.url),
    'utf8',
  );
  const migrationNames = [
    '2026082901_add_hr_activity_log.sql',
    '2026082902_fix_activity_log_triggers.sql',
    '2026082903_fix_hr_activity_log_rpc_volatility.sql',
  ];
  const migrationIndexes = migrationNames.map((name) => manifest.indexOf(name));
  assert.ok(
    migrationIndexes.every((index) => index >= 0),
    'all activity log migrations must be staged',
  );
  assert.ok(
    migrationIndexes[2] > migrationIndexes[1] &&
      migrationIndexes[1] > migrationIndexes[0],
    'activity log migrations must run in dependency order',
  );
});
