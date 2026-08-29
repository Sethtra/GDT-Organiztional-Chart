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

test('activity log migrations are included in both database rollout paths', async () => {
  const [powershellRollout, directRollout] = await Promise.all([
    readFile(new URL('../scripts/deploy-supabase.ps1', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/direct-database-rollout.mjs', import.meta.url), 'utf8'),
  ]);

  for (const rollout of [powershellRollout, directRollout]) {
    const migrationNames = [
      '2026082901_add_hr_activity_log.sql',
      '2026082902_fix_activity_log_triggers.sql',
      '2026082903_fix_hr_activity_log_rpc_volatility.sql',
    ];
    const migrationIndexes = migrationNames.map((name) => rollout.indexOf(name));
    assert.ok(
      migrationIndexes.every((index) => index >= 0),
      'all activity log migrations must be staged',
    );
    assert.ok(
      migrationIndexes[2] > migrationIndexes[1] &&
        migrationIndexes[1] > migrationIndexes[0],
      'activity log migrations must run in dependency order',
    );
  }
});
