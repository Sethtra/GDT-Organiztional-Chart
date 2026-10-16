import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

import {
  planMigrations,
  readMigrationManifest,
  validateMigrationManifest,
} from '../scripts/migration-plan.mjs';

const projectRoot = new URL('../', import.meta.url);

async function readProjectFile(relativePath) {
  const content = await readFile(new URL(relativePath, projectRoot), 'utf8');
  return content.replace(/\r\n/g, '\n');
}

function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('both rollout paths read the shared migration manifest', async () => {
  const ps1 = await readProjectFile('scripts/deploy-supabase.ps1');
  const mjs = await readProjectFile('scripts/direct-database-rollout.mjs');

  assert.match(ps1, /migration-manifest\.json/);
  assert.doesNotMatch(ps1, /Target = '\d{14}_/);
  assert.match(mjs, /readMigrationManifest\(\)/);
  assert.doesNotMatch(mjs, /const migrations = \[/);
});

test('every migration file is registered in the manifest', async () => {
  const { migrations } = await readMigrationManifest();
  const registered = new Set(migrations.map(({ file }) => file));
  const files = (await readdir(new URL('migrations/', projectRoot)))
    .filter((name) => name.endsWith('.sql'))
    .map((name) => `migrations/${name}`);

  assert.deepEqual(files.filter((file) => !registered.has(file)), []);
});

test('the staff major migration is replayed after the staff photo migration', async () => {
  const { migrations } = await readMigrationManifest();
  const indexOf = (name) => migrations.findIndex((m) => m.file.includes(name));

  assert.ok(indexOf('2026092101_add_staff_major') > indexOf('2026080401_add_staff_photo'));
});

test('manifest migrations are transactional and safe to replay', async () => {
  const { migrations } = await readMigrationManifest();

  for (const { file } of migrations) {
    const raw = await readProjectFile(file);
    assert.match(raw, /^\s*BEGIN;\s*$/m, `${file} needs a BEGIN; line`);
    assert.match(raw, /^\s*COMMIT;\s*$/m, `${file} needs a COMMIT; line`);

    const sql = stripComments(raw);
    for (const match of sql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"/gi)) {
      const guard = new RegExp(`DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${escapeRegExp(match[1])}"`, 'i');
      assert.match(sql.slice(0, match.index), guard, `${file}: policy "${match[1]}" needs DROP POLICY IF EXISTS`);
    }
    for (const match of sql.matchAll(/CREATE\s+TRIGGER\s+(\w+)/gi)) {
      const guard = new RegExp(`DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+${match[1]}\\b`, 'i');
      assert.match(sql.slice(0, match.index), guard, `${file}: trigger ${match[1]} needs DROP TRIGGER IF EXISTS`);
    }
    assert.doesNotMatch(sql, /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i, `${file}: CREATE TABLE needs IF NOT EXISTS`);
    assert.doesNotMatch(sql, /CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)/i, `${file}: CREATE INDEX needs IF NOT EXISTS`);
  }
});

test('staff read APIs return both major and photoUrl', async () => {
  const sql = await readProjectFile('migrations/2026092101_add_staff_major.sql');

  for (const fn of ['get_hr_staff_directory_without_placement', 'get_staff_profile_without_placement']) {
    const body = sql.slice(sql.indexOf(`FUNCTION public.${fn}(`));
    const end = body.indexOf('$$;');
    assert.match(body.slice(0, end), /'major', staff\.major/, fn);
    assert.match(body.slice(0, end), /'photoUrl', staff\.photo_url/, fn);
  }
});

test('manifest validation rejects duplicate, reserved, and out-of-order versions', () => {
  const entry = (version, file) => ({ version, name: 'example', file });

  assert.throws(
    () => validateMigrationManifest({ migrations: [entry('20260727000002', 'a.sql'), entry('20260727000001', 'b.sql')] }),
    /unique and ascending/,
  );
  assert.throws(
    () => validateMigrationManifest({ migrations: [entry('20260727000001', 'a.sql'), entry('20260727000001', 'b.sql')] }),
    /unique and ascending/,
  );
  assert.throws(
    () => validateMigrationManifest({
      migrations: [entry('20260727000031', 'a.sql')],
      reservedVersions: { '20260727000031': 'used' },
    }),
    /reserved/,
  );
  assert.throws(
    () => validateMigrationManifest({ migrations: [entry('20260727000001', 'a.sql'), entry('20260727000002', 'a.sql')] }),
    /registered twice/,
  );
});

test('planMigrations skips recorded versions and runs the rest in manifest order', () => {
  const migrations = [
    { version: '20260727000001', name: 'one' },
    { version: '20260727000002', name: 'two' },
    { version: '20260727000003', name: 'three' },
  ];
  const { pending, skipped } = planMigrations(migrations, [
    { version: '20260727000002', name: 'two' },
    { version: '20260727000013', name: 'provision_first_hr_admin' },
  ]);

  assert.deepEqual(pending.map((m) => m.name), ['one', 'three']);
  assert.deepEqual(skipped.map((m) => m.name), ['two']);
});

test('planMigrations stops when history and manifest disagree on a version', () => {
  assert.throws(
    () => planMigrations(
      [{ version: '20260727000031', name: 'add_org_unit_name_en_and_code' }],
      [{ version: '20260727000031', name: 'add_position_coverage_rpc' }],
    ),
    /history conflict/,
  );
});
