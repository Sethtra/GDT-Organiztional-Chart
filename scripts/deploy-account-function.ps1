[CmdletBinding()]
param(
  [string]$ProjectRef = $env:GDT_SUPABASE_PROJECT_REF,
  [ValidateSet('delete-account', 'approve-access-request', 'reset-user-mfa')]
  [string]$FunctionName = 'delete-account'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  throw "Set GDT_SUPABASE_PROJECT_REF before deploying the $FunctionName function."
}
if ($ProjectRef -notmatch '^[a-z0-9]{20}$') {
  throw 'GDT_SUPABASE_PROJECT_REF must be the 20-character Supabase project reference.'
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$supabaseCli = Join-Path $projectRoot 'node_modules\.bin\supabase.cmd'
if (-not (Test-Path -LiteralPath $supabaseCli)) {
  throw 'The local Supabase CLI is missing. Run npm install first.'
}

& $supabaseCli functions deploy $FunctionName --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) {
  throw "The $FunctionName Edge Function deployment failed."
}

Write-Host "The authenticated $FunctionName Edge Function was deployed."
