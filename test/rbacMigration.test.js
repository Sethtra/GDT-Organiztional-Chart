import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL(
  '../migrations/2026072701_add_hr_admin_rbac.sql',
  import.meta.url,
);

test('HR RBAC migration keeps role writes unavailable to browser roles', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /ALTER TABLE public\.user_roles ENABLE ROW LEVEL SECURITY/i);
  assert.match(
    sql,
    /REVOKE ALL ON TABLE public\.user_roles FROM anon, authenticated/i,
  );
  const rolePoliciesStart = sql.indexOf(
    'DROP POLICY IF EXISTS "Users read own roles"',
  );
  const rolePoliciesEnd = sql.indexOf(
    'CREATE OR REPLACE FUNCTION public.has_app_role',
  );
  assert.notEqual(rolePoliciesStart, -1);
  assert.notEqual(rolePoliciesEnd, -1);
  const rolePolicies = sql.slice(rolePoliciesStart, rolePoliciesEnd);
  assert.doesNotMatch(
    rolePolicies,
    /FOR (?:INSERT|UPDATE|DELETE|ALL)\s+TO authenticated/i,
  );
});

test('organizational structure writes require the HR administrator function', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  for (const table of ['org_units', 'org_offices']) {
    assert.match(
      sql,
      new RegExp(
        `CREATE POLICY "HR administrators insert ${table}"[\\s\\S]*WITH CHECK \\(public\\.is_hr_admin\\(\\)\\)`,
        'i',
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `CREATE POLICY "HR administrators delete ${table}"[\\s\\S]*USING \\(public\\.is_hr_admin\\(\\)\\)`,
        'i',
      ),
    );
  }
});
