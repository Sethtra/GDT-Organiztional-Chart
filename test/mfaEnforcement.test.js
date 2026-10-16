import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readProjectFile(relativePath) {
  const content = await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
  return content.replace(/\r\n/g, '\n');
}

test('every API request from a signed-in session must be AAL2', async () => {
  const sql = await readProjectFile('migrations/2026101602_require_mfa_for_api.sql');

  assert.match(sql, /claims ->> 'role' = 'authenticated'/);
  assert.match(sql, /coalesce\(claims ->> 'aal', 'aal1'\) <> 'aal2'/);
  assert.match(sql, /ERRCODE = '42501'/);
  assert.match(
    sql,
    /ALTER ROLE authenticator SET pgrst\.db_pre_request TO 'public\.require_mfa_for_api';/,
  );
  assert.match(sql, /NOTIFY pgrst, 'reload config';/);
  // The emergency switch-off is documented in the migration itself.
  assert.match(sql, /RESET pgrst\.db_pre_request/);
});

test('the pre-request check is registered after the features that call the API', async () => {
  const manifest = JSON.parse(await readProjectFile('scripts/migration-manifest.json'));
  const files = manifest.migrations.map(({ file }) => file);

  assert.equal(files.at(-1), 'migrations/2026101602_require_mfa_for_api.sql');
});

test('MFA reset Edge Function checks the HR role before touching factors', async () => {
  const source = await readProjectFile('supabase/functions/reset-user-mfa/index.ts');
  const config = await readProjectFile('supabase/config.toml');

  const roleCheck = source.indexOf('rpc("is_hr_admin")');
  const deletion = source.indexOf('mfa.deleteFactor');
  assert.ok(roleCheck > 0 && deletion > roleCheck, 'role check must happen before deletion');
  assert.match(config, /\[functions\.reset-user-mfa\]\s*\nverify_jwt = true/);
});
