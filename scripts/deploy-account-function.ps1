[CmdletBinding()]
param(
  [string]$ProjectRef = $env:GDT_SUPABASE_PROJECT_REF
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  throw 'Set GDT_SUPABASE_PROJECT_REF before deploying the account deletion function.'
}
if ($ProjectRef -notmatch '^[a-z0-9]{20}$') {
  throw 'GDT_SUPABASE_PROJECT_REF must be the 20-character Supabase project reference.'
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$supabaseCli = Join-Path $projectRoot 'node_modules\.bin\supabase.cmd'
if (-not (Test-Path -LiteralPath $supabaseCli)) {
  throw 'The local Supabase CLI is missing. Run npm install first.'
}

& $supabaseCli functions deploy delete-account --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) {
  throw 'The delete-account Edge Function deployment failed.'
}

Write-Host 'The authenticated delete-account Edge Function was deployed.'
