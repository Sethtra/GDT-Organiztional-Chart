[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$DatabaseUrl = $env:GDT_DATABASE_URL,
  [string]$HrAdminEmail = $env:GDT_HR_ADMIN_EMAIL,
  [string]$StaffImportFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$supabaseCli = Join-Path $projectRoot 'node_modules\.bin\supabase.cmd'

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw @'
GDT_DATABASE_URL is not configured.

Set it only in the current PowerShell session, then run this command again:
  $env:GDT_DATABASE_URL = '<Supabase Postgres connection string>'

Do not paste the connection string into source files, .env.local, logs, or chat.
'@
}

if ($DatabaseUrl.Contains('[YOUR-PASSWORD]')) {
  $securePassword = Read-Host 'Enter the Supabase database password' -AsSecureString
  $passwordPointer = [IntPtr]::Zero
  $plainPassword = $null

  try {
    $passwordPointer =
      [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword =
      [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

    if ([string]::IsNullOrWhiteSpace($plainPassword)) {
      throw 'The Supabase database password cannot be empty.'
    }

    $encodedPassword = [Uri]::EscapeDataString($plainPassword)
    $DatabaseUrl = $DatabaseUrl.Replace('[YOUR-PASSWORD]', $encodedPassword)
  }
  finally {
    $plainPassword = $null
    if ($passwordPointer -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
  }
}

if (
  -not $DatabaseUrl.StartsWith('postgresql://', [System.StringComparison]::OrdinalIgnoreCase) -and
  -not $DatabaseUrl.StartsWith('postgres://', [System.StringComparison]::OrdinalIgnoreCase)
) {
  throw 'GDT_DATABASE_URL must be a PostgreSQL connection string.'
}

if (-not (Test-Path -LiteralPath $supabaseCli)) {
  throw 'The local Supabase CLI is missing. Run npm install before database rollout.'
}

if ($Apply -and [string]::IsNullOrWhiteSpace($HrAdminEmail)) {
  throw @'
GDT_HR_ADMIN_EMAIL is not configured.

The real rollout requires the verified email address for the first HR
administrator. Pass it with -HrAdminEmail or set it for the current terminal.
'@
}

if (-not [string]::IsNullOrWhiteSpace($HrAdminEmail)) {
  try {
    $parsedEmail = [System.Net.Mail.MailAddress]::new($HrAdminEmail)
  }
  catch {
    throw 'GDT_HR_ADMIN_EMAIL must be a valid email address.'
  }

  if ($parsedEmail.Address -ne $HrAdminEmail) {
    throw 'GDT_HR_ADMIN_EMAIL must contain only the email address.'
  }
}

if (-not [string]::IsNullOrWhiteSpace($StaffImportFile)) {
  if (-not (Test-Path -LiteralPath $StaffImportFile -PathType Leaf)) {
    throw "Staff import file does not exist: $StaffImportFile"
  }
  $StaffImportFile = (Resolve-Path -LiteralPath $StaffImportFile).Path
}

function Invoke-Supabase {
  param(
    [Parameter(Mandatory)]
    [string[]]$Arguments,
    [Parameter(Mandatory)]
    [string]$Operation
  )

  & $supabaseCli @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI failed during: $Operation"
  }
}

$utcStamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$backupDirectory = Join-Path $projectRoot "backups\database\pre-rollout-$utcStamp"
$migrationWorktree = Join-Path $backupDirectory 'migration-worktree'
$supabaseDirectory = Join-Path $migrationWorktree 'supabase'
$stagedMigrationsDirectory = Join-Path $supabaseDirectory 'migrations'

New-Item -ItemType Directory -Path $stagedMigrationsDirectory -Force | Out-Null

$rolesBackup = Join-Path $backupDirectory 'roles.sql'
$schemaBackup = Join-Path $backupDirectory 'schema.sql'
$dataBackup = Join-Path $backupDirectory 'data.sql'

Write-Host "Creating pre-rollout database backup in $backupDirectory"

$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
if (
  $null -eq $dockerCommand -or
  -not [string]::IsNullOrWhiteSpace($StaffImportFile)
) {
  if (-not [string]::IsNullOrWhiteSpace($StaffImportFile)) {
    Write-Host 'Using the transactional direct rollout for the validated staff import.'
  }
  else {
    Write-Host 'Docker is unavailable; using the direct PostgreSQL backup and rollout.'
  }
  $directRolloutScript =
    Join-Path $projectRoot 'scripts\direct-database-rollout.mjs'
  $previousDatabaseUrl = $env:GDT_DATABASE_URL
  $previousHrAdminEmail = $env:GDT_HR_ADMIN_EMAIL

  try {
    $env:GDT_DATABASE_URL = $DatabaseUrl
    $env:GDT_HR_ADMIN_EMAIL = $HrAdminEmail

    $directArguments = @(
      $directRolloutScript,
      '--backup-directory',
      $backupDirectory
    )
    if ($Apply) {
      $directArguments += '--apply'
    }
    if (-not [string]::IsNullOrWhiteSpace($StaffImportFile)) {
      $directArguments += @('--staff-import-file', $StaffImportFile)
    }

    $directLog = Join-Path $backupDirectory 'direct-rollout.log'
    $previousErrorActionPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = 'Continue'
      & node @directArguments 2>&1 |
        Tee-Object -FilePath $directLog
      $directExitCode = $LASTEXITCODE
    }
    finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($directExitCode -ne 0) {
      throw 'Direct PostgreSQL backup or rollout failed.'
    }
  }
  finally {
    $env:GDT_DATABASE_URL = $previousDatabaseUrl
    $env:GDT_HR_ADMIN_EMAIL = $previousHrAdminEmail
  }

  Write-Host ''
  if ($Apply) {
    Write-Host 'Database migrations applied successfully.'
    Write-Host 'The verified first HR administrator was assigned.'
    Write-Host 'The role is stored in Table Editor > public > user_roles.'
    if (-not [string]::IsNullOrWhiteSpace($StaffImportFile)) {
      Write-Host 'The validated staff workbook was imported successfully.'
    }
  }
  else {
    Write-Host 'Backup and migration validation completed.'
    Write-Host 'All validation-only database changes were rolled back.'
  }
  Write-Host "Keep the recovery backup at: $backupDirectory"
  exit 0
}

Invoke-Supabase -Operation 'role backup' -Arguments @(
  'db', 'dump',
  '--db-url', $DatabaseUrl,
  '--file', $rolesBackup,
  '--role-only'
)

Invoke-Supabase -Operation 'schema backup' -Arguments @(
  'db', 'dump',
  '--db-url', $DatabaseUrl,
  '--file', $schemaBackup
)

Invoke-Supabase -Operation 'data backup' -Arguments @(
  'db', 'dump',
  '--db-url', $DatabaseUrl,
  '--file', $dataBackup,
  '--use-copy',
  '--data-only',
  '--exclude', 'storage.buckets_vectors',
  '--exclude', 'storage.vector_indexes'
)

$backupFiles = @($rolesBackup, $schemaBackup, $dataBackup)
foreach ($backupFile in $backupFiles) {
  $fileInfo = Get-Item -LiteralPath $backupFile
  if ($fileInfo.Length -le 0) {
    throw "Backup verification failed because $($fileInfo.Name) is empty."
  }
}

$migrationSources = @(
  @{
    Source = Join-Path $projectRoot 'migration_core_schema.sql'
    Target = '20260727000001_core_schema.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migration_org_structure.sql'
    Target = '20260727000002_org_structure.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072701_add_hr_admin_rbac.sql'
    Target = '20260727000003_add_hr_admin_rbac.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072702_secure_global_staff_directory.sql'
    Target = '20260727000004_secure_global_staff_directory.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072703_add_job_titles_and_reporting.sql'
    Target = '20260727000005_add_job_titles_and_reporting.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072704_add_skills_and_requirements.sql'
    Target = '20260727000006_add_skills_and_requirements.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072705_add_atomic_assignment_operations.sql'
    Target = '20260727000007_add_atomic_assignment_operations.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072706_add_staff_directory_api.sql'
    Target = '20260727000008_add_staff_directory_api.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072707_add_position_assignment_api.sql'
    Target = '20260727000009_add_position_assignment_api.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072708_add_profile_and_skill_api.sql'
    Target = '20260727000010_add_profile_and_skill_api.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072709_add_job_architecture_api.sql'
    Target = '20260727000011_add_job_architecture_api.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072710_add_position_configuration_api.sql'
    Target = '20260727000012_add_position_configuration_api.sql'
  },
  @{
    Source = Join-Path $projectRoot 'migrations\2026072911_cleanup_legacy_dummy_staff.sql'
    Target = '20260727000014_cleanup_legacy_dummy_staff.sql'
  }
  @{
    Source = Join-Path $projectRoot 'migrations\2026072912_refine_staff_profile_and_positions.sql'
    Target = '20260727000015_refine_staff_profile_and_positions.sql'
  }
  @{
    Source = Join-Path $projectRoot 'migrations\2026072913_add_staff_placements.sql'
    Target = '20260727000016_add_staff_placements.sql'
  }
)

foreach ($migration in $migrationSources) {
  if (-not (Test-Path -LiteralPath $migration.Source)) {
    throw "Required migration is missing: $($migration.Source)"
  }

  Copy-Item `
    -LiteralPath $migration.Source `
    -Destination (Join-Path $stagedMigrationsDirectory $migration.Target)
}

if (-not [string]::IsNullOrWhiteSpace($HrAdminEmail)) {
  $escapedHrAdminEmail = $HrAdminEmail.Replace("'", "''")
  $provisioningSql = @'
BEGIN;

DO $bootstrap$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id
  INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower('__HR_ADMIN_EMAIL__')
  ORDER BY created_at
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION
      'The verified HR administrator must already exist in auth.users.';
  END IF;

  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (
    target_user_id,
    'hr_admin'::public.app_role,
    target_user_id
  )
  ON CONFLICT (user_id, role) DO NOTHING;
END
$bootstrap$;

COMMIT;
'@.Replace('__HR_ADMIN_EMAIL__', $escapedHrAdminEmail)

  $provisioningMigration =
    Join-Path $stagedMigrationsDirectory '20260727000013_provision_first_hr_admin.sql'
  $provisioningSql |
    Set-Content -LiteralPath $provisioningMigration -Encoding utf8
}

@'
project_id = "gdt-organizational-chart-rollout"
'@ | Set-Content -LiteralPath (Join-Path $supabaseDirectory 'config.toml') -Encoding utf8

$backupManifest = foreach ($backupFile in $backupFiles) {
  $fileInfo = Get-Item -LiteralPath $backupFile
  $hash = Get-FileHash -LiteralPath $backupFile -Algorithm SHA256
  [ordered]@{
    file = $fileInfo.Name
    bytes = $fileInfo.Length
    sha256 = $hash.Hash
  }
}

$migrationManifest = foreach ($migration in $migrationSources) {
  $fileInfo = Get-Item -LiteralPath $migration.Source
  $hash = Get-FileHash -LiteralPath $migration.Source -Algorithm SHA256
  [ordered]@{
    source = $fileInfo.FullName
    staged_as = $migration.Target
    bytes = $fileInfo.Length
    sha256 = $hash.Hash
  }
}

[ordered]@{
  created_at_utc = [DateTime]::UtcNow.ToString('o')
  backup_files = $backupManifest
  migrations = $migrationManifest
} |
  ConvertTo-Json -Depth 5 |
  Set-Content -LiteralPath (Join-Path $backupDirectory 'manifest.json') -Encoding utf8

Write-Host 'Backup files are non-empty and their SHA-256 checksums are recorded.'
Write-Host 'Checking the migration plan against the remote database...'

Invoke-Supabase -Operation 'migration dry run' -Arguments @(
  'db', 'push',
  '--db-url', $DatabaseUrl,
  '--workdir', $migrationWorktree,
  '--include-all',
  '--dry-run'
)

if (-not $Apply) {
  Write-Host ''
  Write-Host 'Backup and migration dry run completed. No database changes were made.'
  Write-Host 'Run npm run db:rollout to apply the verified migration set.'
  exit 0
}

Write-Host 'Applying the verified migration set...'

Invoke-Supabase -Operation 'migration push' -Arguments @(
  'db', 'push',
  '--db-url', $DatabaseUrl,
  '--workdir', $migrationWorktree,
  '--include-all',
  '--yes'
)

Write-Host ''
Write-Host 'Database migrations applied successfully.'
Write-Host "Keep the recovery backup at: $backupDirectory"
Write-Host 'The verified first HR administrator was assigned during this rollout.'
Write-Host 'The role is stored in Table Editor > public > user_roles.'
