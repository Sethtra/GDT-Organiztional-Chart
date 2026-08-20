import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../migrations/2026082002_add_account_deletion_support.sql',
  import.meta.url,
);
const edgeFunctionUrl = new URL(
  '../supabase/functions/delete-account/index.ts',
  import.meta.url,
);

test('account deletion preserves staff and cannot run from the browser role', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /FOREIGN KEY \(owner_id\)[\s\S]*ON DELETE SET NULL/i);
  assert.doesNotMatch(sql, /DELETE FROM public\.staff/i);
  assert.match(sql, /AFTER DELETE ON auth\.users[\s\S]*cleanup_deleted_account_memberships/i);
  assert.match(sql, /REVOKE ALL[\s\S]*FROM authenticated/i);
  assert.match(sql, /GRANT EXECUTE[\s\S]*TO service_role/i);
  assert.match(sql, /final HR administrator cannot delete/i);
});

test('delete-account verifies the caller and uses the server-only admin API', async () => {
  const source = await readFile(edgeFunctionUrl, 'utf8');
  assert.match(source, /userClient\.auth\.getUser\(\)/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /prepare_account_deletion/);
  assert.match(source, /admin\.auth\.admin\.deleteUser/);
  assert.match(source, /RequestSchema\.safeParse/);
  assert.doesNotMatch(source, /serviceRoleKey[^\n]*return json/i);
});
