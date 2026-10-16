import { readFile } from 'node:fs/promises'

// Single source of truth for both rollout paths (deploy-supabase.ps1 and
// direct-database-rollout.mjs). Register every new migrations/*.sql here.
export const manifestUrl = new URL('./migration-manifest.json', import.meta.url)

export async function readMigrationManifest() {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
  validateMigrationManifest(manifest)
  return manifest
}

export function validateMigrationManifest({ migrations, reservedVersions = {} }) {
  if (!Array.isArray(migrations) || migrations.length === 0) {
    throw new Error('Migration manifest must list at least one migration.')
  }

  const seenFiles = new Set()
  let previousVersion = ''
  for (const migration of migrations) {
    const { version, name, file } = migration
    if (!/^\d{14}$/.test(version ?? '')) {
      throw new Error(`Invalid migration version: ${version}`)
    }
    if (!/^[a-z0-9_]+$/.test(name ?? '')) {
      throw new Error(`Invalid migration name for ${version}: ${name}`)
    }
    if (!file?.endsWith('.sql')) {
      throw new Error(`Migration ${version} must reference a .sql file.`)
    }
    if (version <= previousVersion) {
      throw new Error(
        `Migration versions must be unique and ascending: ${version} follows ${previousVersion}.`,
      )
    }
    if (Object.hasOwn(reservedVersions, version)) {
      throw new Error(`Migration version ${version} is reserved and cannot be used.`)
    }
    if (seenFiles.has(file)) {
      throw new Error(`Migration file is registered twice: ${file}`)
    }
    seenFiles.add(file)
    previousVersion = version
  }
}

/**
 * Split the manifest into migrations to run and migrations already recorded
 * in supabase_migrations.schema_migrations. A recorded version whose name
 * differs from the manifest means the history and the manifest disagree, so
 * the rollout must stop rather than guess.
 */
export function planMigrations(migrations, appliedRows) {
  const appliedByVersion = new Map(
    appliedRows.map((row) => [String(row.version), row.name ?? null]),
  )

  const pending = []
  const skipped = []
  for (const migration of migrations) {
    if (!appliedByVersion.has(migration.version)) {
      pending.push(migration)
      continue
    }
    const recordedName = appliedByVersion.get(migration.version)
    if (recordedName !== null && recordedName !== migration.name) {
      throw new Error(
        `Migration history conflict: version ${migration.version} is recorded as ` +
          `"${recordedName}" but the manifest names it "${migration.name}".`,
      )
    }
    skipped.push(migration)
  }

  return { pending, skipped }
}
