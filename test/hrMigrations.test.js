import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationFiles = [
  '2026072702_secure_global_staff_directory.sql',
  '2026072703_add_job_titles_and_reporting.sql',
  '2026072704_add_skills_and_requirements.sql',
  '2026072705_add_atomic_assignment_operations.sql',
  '2026072706_add_staff_directory_api.sql',
  '2026072707_add_position_assignment_api.sql',
  '2026072708_add_profile_and_skill_api.sql',
  '2026072709_add_job_architecture_api.sql',
  '2026072710_add_position_configuration_api.sql',
  '2026072912_refine_staff_profile_and_positions.sql',
  '2026072913_add_staff_placements.sql',
  '2026072914_normalize_assignment_dates.sql',
  '2026072915_add_staff_placement_save_api.sql',
];

async function readMigration(filename) {
  return readFile(new URL(`../migrations/${filename}`, import.meta.url), 'utf8');
}

test('HR migrations are transactional and contain no destructive data cleanup', async () => {
  for (const filename of migrationFiles) {
    const sql = await readMigration(filename);
    assert.match(sql, /^\s*--[\s\S]*\bBEGIN;/i, filename);
    assert.match(sql, /\bCOMMIT;\s*$/i, filename);
    assert.doesNotMatch(sql, /\bTRUNCATE\b/i, filename);
    assert.doesNotMatch(sql, /\bDROP\s+TABLE\b/i, filename);
    assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i, filename);
  }
});

test('shared identity trigger only resolves fields for its active table branch', async () => {
  const coreMigration = await readFile(
    new URL('../migration_core_schema.sql', import.meta.url),
    'utf8',
  );
  const functionMatch = coreMigration.match(
    /CREATE OR REPLACE FUNCTION public\.protect_hr_identity_fields\(\)([\s\S]*?)\$\$;/,
  );

  assert.ok(functionMatch, 'shared identity trigger function must exist');
  const functionSql = functionMatch[1];

  assert.match(functionSql, /IF TG_TABLE_NAME = 'positions' THEN/);
  assert.match(functionSql, /ELSIF TG_TABLE_NAME = 'staff' THEN/);
  assert.doesNotMatch(
    functionSql,
    /IF TG_TABLE_NAME = 'positions'\s+AND/,
    'position-only NEW fields must not be resolved for staff rows',
  );
  assert.doesNotMatch(
    functionSql,
    /IF TG_TABLE_NAME = 'staff'\s+AND/,
    'staff-only NEW fields must not be resolved for position rows',
  );
});

test('public chart RPC removes legacy private node fields', async () => {
  const sql = await readMigration(migrationFiles[0]);
  for (const field of [
    'nationalId',
    'phone',
    'email',
    'address',
    'maritalStatus',
    'education',
    'skills',
    'history',
  ]) {
    assert.match(sql, new RegExp(`'${field}'`));
  }
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.get_chart_for_viewer\(UUID\)[\s\S]*TO anon, authenticated, service_role/i,
  );
});

test('new assignment writes enforce one active staff position and occupant', async () => {
  const sql = await readMigration(migrationFiles[3]);
  assert.match(
    sql,
    /existing\.staff_id = NEW\.staff_id[\s\S]*existing\.end_date IS NULL/i,
  );
  assert.match(
    sql,
    /existing\.position_id = NEW\.position_id[\s\S]*existing\.end_date IS NULL/i,
  );
  assert.match(sql, /CREATE TRIGGER position_assignments_one_active/i);
  assert.match(
    sql,
    /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.position_assignments[\s\S]*FROM authenticated/i,
  );
});

test('reporting hierarchy validates office ownership, rank, and cycles', async () => {
  const sql = await readMigration(migrationFiles[1]);
  assert.match(sql, /office\.unit_id = NEW\.org_unit_id/i);
  assert.match(sql, /Reporting hierarchy cannot contain a cycle/i);
  assert.match(sql, /supervisor_rank >= current_rank/i);
  assert.match(sql, /Individual positions must report within their office/i);
});

test('skill proficiency and job requirements are constrained to levels 1-5', async () => {
  const sql = await readMigration(migrationFiles[2]);
  assert.match(sql, /proficiency BETWEEN 1 AND 5/i);
  assert.match(sql, /minimum_proficiency BETWEEN 1 AND 5/i);
  assert.match(sql, /CREATE TRIGGER staff_skill_history_one_active/i);
});

test('staff directory writes are HR-only, transactional, and archive instead of delete', async () => {
  const sql = await readMigration(migrationFiles[4]);
  assert.match(sql, /IF NOT public\.is_hr_admin\(\)/i);
  assert.match(sql, /public\.find_staff_duplicates/i);
  assert.match(sql, /status = 'archived'/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});

test('chart editors receive assignment-safe fields but not private profile data', async () => {
  const sql = await readMigration(migrationFiles[5]);
  assert.match(sql, /public\.can_manage_position_assignment/i);
  assert.match(sql, /'employeeId'/i);
  assert.match(sql, /'currentPosition'/i);
  assert.doesNotMatch(sql, /'nationalId'/i);
  assert.doesNotMatch(sql, /'phone'/i);
  assert.doesNotMatch(sql, /'address'/i);
});

test('profile API returns full national ID only for HR and a mask otherwise', async () => {
  const sql = await readMigration(migrationFiles[6]);
  assert.match(
    sql,
    /WHEN hr_access THEN jsonb_build_object\([\s\S]*'nationalId'/i,
  );
  assert.match(
    sql,
    /ELSE jsonb_build_object\([\s\S]*'nationalIdMasked'[\s\S]*masked_staff_national_id/i,
  );
  assert.match(sql, /public\.can_view_staff_profile\(target_staff_id\)/i);
});

test('refined staff API uses the approved position order and excludes deprecated fields', async () => {
  const sql = await readMigration(
    '2026072912_refine_staff_profile_and_positions.sql',
  );

  const titles = [
    'ប្រធាននាយកដ្ឋាន',
    'អនុប្រធាននាយកដ្ឋាន',
    'ប្រធានការិយាល័យ',
    'អនុប្រធានការិយាល័យ',
    'មន្ត្រី',
    'មន្ត្រីកិច្ចសន្យា',
  ];
  let previousIndex = -1;
  for (const title of titles) {
    const nextIndex = sql.indexOf(title);
    assert.ok(nextIndex > previousIndex, `${title} must be in position order`);
    previousIndex = nextIndex;
  }

  assert.match(sql, /'dateOfBirth', staff\.date_of_birth/i);
  assert.match(sql, /'joinedDate', staff\.join_date/i);
  assert.match(sql, /'retiredDate', staff\.retired_date/i);
  assert.match(sql, /'jobTitle'/i);
  assert.doesNotMatch(sql, /'nationalId'/i);
  assert.doesNotMatch(sql, /'email', staff\.email/i);
  assert.doesNotMatch(sql, /'age', staff\.age/i);
});

test('staff placement keeps department and office relational and augments HR APIs', async () => {
  const sql = await readMigration('2026072913_add_staff_placements.sql');

  assert.match(
    sql,
    /CREATE TABLE IF NOT EXISTS public\.staff_placements/i,
  );
  assert.match(
    sql,
    /office\.unit_id = NEW\.org_unit_id/i,
  );
  assert.match(
    sql,
    /unit\.type = 'department'/i,
  );
  assert.match(sql, /'organizationalPlacement'/i);
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS staff_employee_id_uidx/i,
  );
  assert.match(
    sql,
    /CREATE POLICY "HR administrators create staff placements"[\s\S]*public\.is_hr_admin\(\)/i,
  );
  assert.doesNotMatch(
    sql,
    /ALTER TABLE public\.staff ADD COLUMN IF NOT EXISTS (department|office)/i,
  );
});

test('legacy assignment dates are normalized for the staff profile history API', async () => {
  const sql = await readMigration(
    '2026072914_normalize_assignment_dates.sql',
  );

  assert.match(
    sql,
    /ALTER COLUMN start_date TYPE DATE[\s\S]*start_date::TEXT/i,
  );
  assert.match(
    sql,
    /ALTER COLUMN end_date TYPE DATE[\s\S]*end_date::TEXT/i,
  );
  assert.match(
    sql,
    /DROP TRIGGER IF EXISTS position_assignments_one_active[\s\S]*CREATE TRIGGER position_assignments_one_active/i,
  );
  assert.match(
    sql,
    /BEFORE INSERT OR UPDATE OF staff_id, position_id, end_date/i,
  );
  assert.doesNotMatch(sql, /\bUPDATE\s+public\./i);
  assert.doesNotMatch(sql, /\bDELETE\b/i);
});

test('officer save atomically validates placement and omits marital status from browser APIs', async () => {
  const sql = await readMigration(
    '2026072915_add_staff_placement_save_api.sql',
  );

  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION public\.save_staff_record_with_placement/i,
  );
  assert.match(sql, /department\.type = 'department'/i);
  assert.match(sql, /office\.unit_id = department_id_value/i);
  assert.match(
    sql,
    /INSERT INTO public\.staff_placements[\s\S]*ON CONFLICT \(staff_id\) DO UPDATE/i,
  );
  assert.match(sql, /entry\.record - 'maritalStatus'/i);
  assert.match(sql, /base_profile - 'maritalStatus'/i);
  assert.match(
    sql,
    /REVOKE EXECUTE ON FUNCTION public\.save_staff_record\([\s\S]*FROM authenticated/i,
  );
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});

test('job fit reports met, missing, and below-minimum requirements', async () => {
  const sql = await readMigration(migrationFiles[7]);
  assert.match(sql, /'status', CASE/i);
  assert.match(sql, /THEN 'missing'/i);
  assert.match(sql, /THEN 'below'/i);
  assert.match(sql, /ELSE 'met'/i);
  assert.match(sql, /minimum_proficiency_value NOT BETWEEN 1 AND 5/i);
});

test('position configuration stores reporting by position ID behind editor authorization', async () => {
  const sql = await readMigration(migrationFiles[8]);
  assert.match(sql, /public\.can_manage_position_assignment/i);
  assert.match(
    sql,
    /reports_to_position_id = target_reports_to_position_id/i,
  );
  assert.match(sql, /'occupantName'/i);
});

test('dummy staff cleanup is privately recoverable and preserves org structure', async () => {
  const sql = await readMigration(
    '2026072911_cleanup_legacy_dummy_staff.sql',
  );

  assert.match(sql, /^\s*--[\s\S]*\bBEGIN;/i);
  assert.match(sql, /\bCOMMIT;\s*$/i);
  assert.match(sql, /private\.legacy_hr_cleanup_staff/i);
  assert.match(sql, /private\.legacy_hr_cleanup_assignments/i);
  assert.match(sql, /private\.legacy_hr_cleanup_charts/i);
  assert.match(sql, /legacy_hr_cleanup_control/i);
  assert.match(sql, /NOT EXISTS[\s\S]*legacy_hr_cleanup_audit/i);
  assert.match(sql, /WHERE staff\.created_by IS NULL/i);
  assert.match(
    sql,
    /DELETE FROM public\.position_assignments[\s\S]*legacy_hr_cleanup_staff/i,
  );
  assert.match(
    sql,
    /DELETE FROM public\.staff[\s\S]*staff\.created_by IS NULL/i,
  );
  assert.doesNotMatch(sql, /DELETE FROM public\.positions/i);
  assert.doesNotMatch(sql, /DELETE FROM public\.org_units/i);
  assert.doesNotMatch(sql, /DELETE FROM public\.org_offices/i);
  assert.doesNotMatch(sql, /DELETE FROM public\.charts/i);
  assert.doesNotMatch(
    sql,
    /^\s*'department',?\s*$/im,
  );
  assert.doesNotMatch(
    sql,
    /^\s*'office',?\s*$/im,
  );
});
