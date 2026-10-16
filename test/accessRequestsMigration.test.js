import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function readProjectFile(relativePath) {
  const content = await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
  return content.replace(/\r\n/g, '\n');
}

function functionBody(sql, name) {
  const start = sql.indexOf(`FUNCTION public.${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  return sql.slice(start, sql.indexOf('$$;', start));
}

test('access requests table is closed to browser roles', async () => {
  const sql = await readProjectFile('migrations/2026101601_add_access_requests.sql');

  assert.match(sql, /ALTER TABLE public\.access_requests ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.access_requests FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(sql, /CREATE POLICY/i);
  assert.match(sql, /access_requests_one_pending_per_email_idx[\s\S]*WHERE status = 'pending'/);
});

test('only submission is open to anonymous visitors, and it is validated and throttled', async () => {
  const sql = await readProjectFile('migrations/2026101601_add_access_requests.sql');

  const anonGrants = [...sql.matchAll(/GRANT EXECUTE ON FUNCTION public\.(\w+)\([^)]*\)\s+TO ([^;]+);/g)]
    .filter(([, , roles]) => /\banon\b/.test(roles))
    .map(([, name]) => name);
  assert.deepEqual(anonGrants, ['submit_access_request']);

  const submit = functionBody(sql, 'submit_access_request');
  assert.match(submit, /SECURITY DEFINER/);
  assert.match(submit, /INTERVAL '1 hour'/);
  assert.match(submit, /ON CONFLICT \(email\) WHERE status = 'pending' DO NOTHING/);
  assert.match(submit, /VOLATILE/);
});

test('review functions require an HR administrator', async () => {
  const sql = await readProjectFile('migrations/2026101601_add_access_requests.sql');

  for (const name of ['list_access_requests', 'reject_access_request']) {
    assert.match(functionBody(sql, name), /IF NOT public\.is_hr_admin\(\) THEN/, name);
  }
  assert.match(functionBody(sql, 'reject_access_request'), /AND status = 'pending'/);
});

test('approval Edge Function verifies the caller is an HR administrator before inviting', async () => {
  const source = await readProjectFile('supabase/functions/approve-access-request/index.ts');
  const config = await readProjectFile('supabase/config.toml');

  const roleCheck = source.indexOf('rpc("is_hr_admin")');
  const invite = source.indexOf('inviteUserByEmail');
  assert.ok(roleCheck > 0 && invite > roleCheck, 'role check must happen before the invite');
  assert.match(source, /status === "rejected"/);
  assert.match(config, /\[functions\.approve-access-request\]\s*\nverify_jwt = true/);
});
