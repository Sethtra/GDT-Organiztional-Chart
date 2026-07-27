import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import pg from 'pg'

const { Client } = pg
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '..')
const applyChanges = process.argv.includes('--apply')

const backupArgumentIndex = process.argv.indexOf('--backup-directory')
const backupDirectory =
  backupArgumentIndex >= 0 ? process.argv[backupArgumentIndex + 1] : ''
const databaseUrl = process.env.GDT_DATABASE_URL
const hrAdminEmail = process.env.GDT_HR_ADMIN_EMAIL
const certificatePath =
  process.env.GDT_SSL_CA_FILE ??
  path.join(projectRoot, 'backups', 'supabase-ca', 'prod-ca-2021.crt')

if (!backupDirectory) {
  throw new Error('--backup-directory is required.')
}

if (!databaseUrl) {
  throw new Error('GDT_DATABASE_URL is required.')
}

if (applyChanges && !hrAdminEmail) {
  throw new Error('GDT_HR_ADMIN_EMAIL is required for a full rollout.')
}

const migrations = [
  {
    version: '20260727000001',
    name: 'core_schema',
    file: 'migration_core_schema.sql',
  },
  {
    version: '20260727000002',
    name: 'org_structure',
    file: 'migration_org_structure.sql',
  },
  {
    version: '20260727000003',
    name: 'add_hr_admin_rbac',
    file: 'migrations/2026072701_add_hr_admin_rbac.sql',
  },
  {
    version: '20260727000004',
    name: 'secure_global_staff_directory',
    file: 'migrations/2026072702_secure_global_staff_directory.sql',
  },
  {
    version: '20260727000005',
    name: 'add_job_titles_and_reporting',
    file: 'migrations/2026072703_add_job_titles_and_reporting.sql',
  },
  {
    version: '20260727000006',
    name: 'add_skills_and_requirements',
    file: 'migrations/2026072704_add_skills_and_requirements.sql',
  },
  {
    version: '20260727000007',
    name: 'add_atomic_assignment_operations',
    file: 'migrations/2026072705_add_atomic_assignment_operations.sql',
  },
  {
    version: '20260727000008',
    name: 'add_staff_directory_api',
    file: 'migrations/2026072706_add_staff_directory_api.sql',
  },
  {
    version: '20260727000009',
    name: 'add_position_assignment_api',
    file: 'migrations/2026072707_add_position_assignment_api.sql',
  },
  {
    version: '20260727000010',
    name: 'add_profile_and_skill_api',
    file: 'migrations/2026072708_add_profile_and_skill_api.sql',
  },
  {
    version: '20260727000011',
    name: 'add_job_architecture_api',
    file: 'migrations/2026072709_add_job_architecture_api.sql',
  },
  {
    version: '20260727000012',
    name: 'add_position_configuration_api',
    file: 'migrations/2026072710_add_position_configuration_api.sql',
  },
]

function jsonReplacer(_key, value) {
  return typeof value === 'bigint' ? value.toString() : value
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

async function writeJson(filePath, value) {
  const content = `${JSON.stringify(value, jsonReplacer, 2)}\n`
  await writeFile(filePath, content, 'utf8')
  return {
    bytes: Buffer.byteLength(content),
    sha256: sha256(content),
  }
}

function removeTransactionWrapper(sql, migrationName) {
  const lines = sql.split(/\r?\n/)
  const beginIndex = lines.findIndex(
    (line) => line.trim().toUpperCase() === 'BEGIN;',
  )
  const commitIndex = lines.findLastIndex(
    (line) => line.trim().toUpperCase() === 'COMMIT;',
  )

  if (beginIndex < 0 || commitIndex <= beginIndex) {
    throw new Error(
      `${migrationName} must have an explicit BEGIN/COMMIT transaction wrapper.`,
    )
  }

  lines.splice(commitIndex, 1)
  lines.splice(beginIndex, 1)
  return lines.join('\n')
}

function splitSqlStatements(sql) {
  const statements = []
  let buffer = ''
  let index = 0
  let line = 1
  let statementStartLine = 1
  let state = 'normal'
  let dollarTag = ''

  const pushStatement = () => {
    const text = buffer.trim()
    if (text) {
      statements.push({ text, startLine: statementStartLine })
    }
    buffer = ''
    statementStartLine = line
  }

  while (index < sql.length) {
    const character = sql[index]
    const nextCharacter = sql[index + 1]

    if (character === '\n') {
      line += 1
    }

    if (state === 'line-comment') {
      buffer += character
      index += 1
      if (character === '\n') {
        state = 'normal'
      }
      continue
    }

    if (state === 'block-comment') {
      buffer += character
      if (character === '*' && nextCharacter === '/') {
        buffer += nextCharacter
        index += 2
        state = 'normal'
      } else {
        index += 1
      }
      continue
    }

    if (state === 'single-quote') {
      buffer += character
      if (character === "'" && nextCharacter === "'") {
        buffer += nextCharacter
        index += 2
      } else {
        index += 1
        if (character === "'") {
          state = 'normal'
        }
      }
      continue
    }

    if (state === 'double-quote') {
      buffer += character
      if (character === '"' && nextCharacter === '"') {
        buffer += nextCharacter
        index += 2
      } else {
        index += 1
        if (character === '"') {
          state = 'normal'
        }
      }
      continue
    }

    if (state === 'dollar-quote') {
      if (sql.startsWith(dollarTag, index)) {
        buffer += dollarTag
        index += dollarTag.length
        state = 'normal'
      } else {
        buffer += character
        index += 1
      }
      continue
    }

    if (character === '-' && nextCharacter === '-') {
      buffer += '--'
      index += 2
      state = 'line-comment'
      continue
    }

    if (character === '/' && nextCharacter === '*') {
      buffer += '/*'
      index += 2
      state = 'block-comment'
      continue
    }

    if (character === "'") {
      buffer += character
      index += 1
      state = 'single-quote'
      continue
    }

    if (character === '"') {
      buffer += character
      index += 1
      state = 'double-quote'
      continue
    }

    if (character === '$') {
      const tagMatch = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)
      if (tagMatch) {
        dollarTag = tagMatch[0]
        buffer += dollarTag
        index += dollarTag.length
        state = 'dollar-quote'
        continue
      }
    }

    buffer += character
    index += 1
    if (character === ';') {
      pushStatement()
    }
  }

  pushStatement()
  return statements
}

async function captureDatabaseBackup(client) {
  const tablesDirectory = path.join(backupDirectory, 'tables')
  await mkdir(tablesDirectory, { recursive: true })

  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')

  try {
    const tableResult = await client.query(`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `)

    const tableBackups = []
    for (const [index, { tablename }] of tableResult.rows.entries()) {
      const qualifiedTable = `${quoteIdentifier('public')}.${quoteIdentifier(tablename)}`
      const rowsResult = await client.query(
        `SELECT to_jsonb(source_row) AS row FROM ${qualifiedTable} AS source_row`,
      )
      const tableFileName = `${String(index + 1).padStart(3, '0')}-${sha256(tablename).slice(0, 10)}.json`
      const tableFilePath = path.join(tablesDirectory, tableFileName)
      const file = await writeJson(tableFilePath, {
        schema: 'public',
        table: tablename,
        row_count: rowsResult.rowCount,
        rows: rowsResult.rows.map(({ row }) => row),
      })

      tableBackups.push({
        schema: 'public',
        table: tablename,
        file: `tables/${tableFileName}`,
        row_count: rowsResult.rowCount,
        ...file,
      })
    }

    const metadataQueries = {
      columns: `
        SELECT
          table_name,
          column_name,
          ordinal_position,
          column_default,
          is_nullable,
          data_type,
          udt_schema,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `,
      constraints: `
        SELECT
          relation.relname AS table_name,
          constraint_record.conname AS constraint_name,
          constraint_record.contype AS constraint_type,
          pg_get_constraintdef(constraint_record.oid, true) AS definition
        FROM pg_constraint AS constraint_record
        JOIN pg_class AS relation
          ON relation.oid = constraint_record.conrelid
        JOIN pg_namespace AS namespace
          ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
        ORDER BY relation.relname, constraint_record.conname
      `,
      indexes: `
        SELECT
          table_record.relname AS table_name,
          index_record.relname AS index_name,
          pg_get_indexdef(index_record.oid) AS definition
        FROM pg_index AS index_metadata
        JOIN pg_class AS table_record
          ON table_record.oid = index_metadata.indrelid
        JOIN pg_class AS index_record
          ON index_record.oid = index_metadata.indexrelid
        JOIN pg_namespace AS namespace
          ON namespace.oid = table_record.relnamespace
        WHERE namespace.nspname = 'public'
        ORDER BY table_record.relname, index_record.relname
      `,
      policies: `
        SELECT *
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
      `,
      functions: `
        SELECT
          procedure_record.proname AS function_name,
          pg_get_function_identity_arguments(procedure_record.oid) AS arguments,
          pg_get_functiondef(procedure_record.oid) AS definition
        FROM pg_proc AS procedure_record
        JOIN pg_namespace AS namespace
          ON namespace.oid = procedure_record.pronamespace
        WHERE namespace.nspname = 'public'
          AND procedure_record.prokind IN ('f', 'p')
        ORDER BY procedure_record.proname, arguments
      `,
      triggers: `
        SELECT
          relation.relname AS table_name,
          trigger_record.tgname AS trigger_name,
          pg_get_triggerdef(trigger_record.oid, true) AS definition
        FROM pg_trigger AS trigger_record
        JOIN pg_class AS relation
          ON relation.oid = trigger_record.tgrelid
        JOIN pg_namespace AS namespace
          ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND NOT trigger_record.tgisinternal
        ORDER BY relation.relname, trigger_record.tgname
      `,
      views: `
        SELECT table_name, view_definition
        FROM information_schema.views
        WHERE table_schema = 'public'
        ORDER BY table_name
      `,
      table_grants: `
        SELECT
          table_name,
          grantor,
          grantee,
          privilege_type,
          is_grantable
        FROM information_schema.table_privileges
        WHERE table_schema = 'public'
        ORDER BY table_name, grantee, privilege_type
      `,
      auth_user_reference: `
        SELECT id, email, created_at
        FROM auth.users
        ORDER BY created_at, id
      `,
    }

    const metadata = {}
    for (const [name, query] of Object.entries(metadataQueries)) {
      const result = await client.query(query)
      metadata[name] = result.rows
    }

    await client.query('COMMIT')

    const metadataFile = await writeJson(
      path.join(backupDirectory, 'database-metadata.json'),
      metadata,
    )

    const backupManifest = {
      created_at_utc: new Date().toISOString(),
      format: 'gdt-public-database-json-v1',
      scope:
        'All public schema table rows plus public schema metadata and auth user identity references',
      tables: tableBackups,
      metadata: {
        file: 'database-metadata.json',
        ...metadataFile,
      },
    }
    const manifestFile = await writeJson(
      path.join(backupDirectory, 'database-backup-manifest.json'),
      backupManifest,
    )

    if (
      tableBackups.some(
        ({ bytes, sha256: hash }) => bytes <= 0 || hash.length !== 64,
      ) ||
      manifestFile.bytes <= 0
    ) {
      throw new Error('Database backup verification failed.')
    }

    return {
      tableCount: tableBackups.length,
      rowCount: tableBackups.reduce(
        (total, table) => total + table.row_count,
        0,
      ),
      manifest: manifestFile,
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

async function loadMigrations() {
  return Promise.all(
    migrations.map(async (migration) => {
      const absolutePath = path.join(projectRoot, migration.file)
      const sql = await readFile(absolutePath, 'utf8')
      return {
        ...migration,
        sql,
        executableSql: removeTransactionWrapper(sql, migration.name),
        sha256: sha256(sql),
      }
    }),
  )
}

async function recordMigration(client, migration) {
  const historyResult = await client.query(`
    SELECT to_regclass('supabase_migrations.schema_migrations') AS history_table
  `)

  if (!historyResult.rows[0]?.history_table) {
    return
  }

  await client.query(
    `
      INSERT INTO supabase_migrations.schema_migrations
        (version, name, statements)
      VALUES ($1, $2, $3::text[])
      ON CONFLICT (version) DO NOTHING
    `,
    [migration.version, migration.name, [migration.sql]],
  )
}

async function executeRollout(client, loadedMigrations) {
  await client.query('BEGIN')

  try {
    for (const migration of loadedMigrations) {
      process.stdout.write(`Validating ${migration.version}_${migration.name}...\n`)
      const statements = splitSqlStatements(migration.executableSql)
      for (const [statementIndex, statement] of statements.entries()) {
        try {
          await client.query(statement.text)
        } catch (error) {
          error.message =
            `${migration.version}_${migration.name}, statement ` +
            `${statementIndex + 1}/${statements.length}, near source line ` +
            `${statement.startLine}: ${error.message}`
          throw error
        }
      }
      await recordMigration(client, migration)
    }

    if (hrAdminEmail) {
      const userResult = await client.query(
        `
          SELECT id
          FROM auth.users
          WHERE lower(email) = lower($1)
          ORDER BY created_at
          LIMIT 1
        `,
        [hrAdminEmail],
      )

      if (userResult.rowCount !== 1) {
        throw new Error(
          'The verified HR administrator must already exist in Supabase Authentication.',
        )
      }

      const userId = userResult.rows[0].id
      await client.query(
        `
          INSERT INTO public.user_roles (user_id, role, granted_by)
          VALUES ($1, 'hr_admin'::public.app_role, $1)
          ON CONFLICT (user_id, role) DO NOTHING
        `,
        [userId],
      )

      await recordMigration(client, {
        version: '20260727000013',
        name: 'provision_first_hr_admin',
        sql: '-- First HR administrator provisioned by the guarded rollout.',
      })
    }

    if (applyChanges) {
      await client.query('COMMIT')
    } else {
      await client.query('ROLLBACK')
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

await mkdir(backupDirectory, { recursive: true })

let certificateAuthority
try {
  certificateAuthority = await readFile(certificatePath, 'utf8')
} catch (error) {
  if (error?.code === 'ENOENT') {
    throw new Error(
      `Supabase CA certificate not found at ${certificatePath}. Download it from Database Settings > SSL Configuration.`,
    )
  }
  throw error
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    ca: certificateAuthority,
    rejectUnauthorized: true,
  },
  application_name: 'gdt-organizational-chart-rollout',
  connectionTimeoutMillis: 20_000,
  query_timeout: 120_000,
})

try {
  process.stdout.write('Connecting to Supabase PostgreSQL...\n')
  await client.connect()

  process.stdout.write('Exporting all public schema data and metadata...\n')
  const backup = await captureDatabaseBackup(client)
  process.stdout.write(
    `Backup verified: ${backup.tableCount} tables and ${backup.rowCount} rows.\n`,
  )

  const loadedMigrations = await loadMigrations()
  const sourceManifest = {
    created_at_utc: new Date().toISOString(),
    migrations: loadedMigrations.map(
      ({ version, name, file, sha256: hash }) => ({
        version,
        name,
        file,
        sha256: hash,
      }),
    ),
  }
  await writeJson(
    path.join(backupDirectory, 'migration-source-manifest.json'),
    sourceManifest,
  )

  process.stdout.write(
    applyChanges
      ? 'Applying all migrations in one database transaction...\n'
      : 'Validating all migrations in a rollback-only transaction...\n',
  )
  await executeRollout(client, loadedMigrations)

  await writeJson(path.join(backupDirectory, 'rollout-result.json'), {
    status: applyChanges ? 'applied' : 'validated',
    completed_at_utc: new Date().toISOString(),
    backup_table_count: backup.tableCount,
    backup_row_count: backup.rowCount,
    migration_count: loadedMigrations.length,
    hr_admin_provisioned: applyChanges && Boolean(hrAdminEmail),
  })

  process.stdout.write(
    applyChanges
      ? 'Database rollout committed successfully.\n'
      : 'Migration validation succeeded; all test changes were rolled back.\n',
  )
} finally {
  await client.end().catch(() => {})
}
