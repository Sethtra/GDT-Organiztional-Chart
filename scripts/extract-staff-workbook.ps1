[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$WorkbookPath,

  [Parameter(Mandatory)]
  [string]$OutputPath,

  [string]$ExpectedSha256 =
    '8DF2B5B692AC286C72A2B1B23931220E4BF6C4659446F15FF3CF6665725D5FC2'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$expectedSheetName = '2.DFP'
$expectedDepartment =
  'នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក'
$expectedRecordCount = 93

$officeByRow = @{}
foreach ($row in 18..26) {
  $officeByRow[$row] = 'ការិ.រដ្ឋបាល'
}
foreach ($row in 28..59) {
  $officeByRow[$row] = 'ការិ.ហិរញ្ញវត្ថុ និងលទ្ធកម្ម'
}
foreach ($row in 61..66) {
  $officeByRow[$row] = 'ការិ.បុគ្គលិក'
}
foreach ($row in 68..73) {
  $officeByRow[$row] = 'ការិ.បៀវត្ស'
}
foreach ($row in 75..80) {
  $officeByRow[$row] = 'ការិ.ត្រួតពិនិត្យ'
}
foreach ($row in 82..100) {
  $officeByRow[$row] =
    'ការិ.បណ្តុះបណ្តាលនិងអភិវឌ្ឍន៍ធនធានមនុស្ស'
}
$officeByRow[109] = 'ការិ.រដ្ឋបាល'
$officeByRow[110] = 'ការិ.បុគ្គលិក'

function Get-CellText {
  param(
    [Parameter(Mandatory)]
    [object]$Sheet,
    [Parameter(Mandatory)]
    [int]$Row,
    [Parameter(Mandatory)]
    [int]$Column
  )

  $cell = $Sheet.Cells.Item($Row, $Column)
  $raw = $cell.Value2
  if ($null -eq $raw) {
    return $null
  }

  if ($raw -is [double] -or $raw -is [int] -or $raw -is [long]) {
    $numberFormat = ([string]$cell.NumberFormat).Trim()
    if ($numberFormat -match '^0+$') {
      $format = "D$($numberFormat.Length)"
      $value = ([long]$raw).ToString(
        $format,
        [Globalization.CultureInfo]::InvariantCulture
      )
    }
    else {
      $value = ([double]$raw).ToString(
        '0.################',
        [Globalization.CultureInfo]::InvariantCulture
      )
    }
  }
  else {
    $value = [string]$raw
  }

  $value = $value.Replace([char]0x00A0, ' ').Trim()
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $null
  }
  return $value
}

function Convert-CellDate {
  param(
    [Parameter(Mandatory)]
    [object]$Sheet,
    [Parameter(Mandatory)]
    [int]$Row,
    [Parameter(Mandatory)]
    [int]$Column,
    [Parameter(Mandatory)]
    [string]$FieldName
  )

  $raw = $Sheet.Cells.Item($Row, $Column).Value2
  if ($null -eq $raw -or [string]::IsNullOrWhiteSpace([string]$raw)) {
    return $null
  }

  if ($raw -is [double] -or $raw -is [int] -or $raw -is [long]) {
    try {
      return [DateTime]::FromOADate([double]$raw).ToString('yyyy-MM-dd')
    }
    catch {
      throw "Invalid $FieldName date at workbook row $Row."
    }
  }

  $dateFormats = [string[]]@(
    'd/M/yyyy',
    'dd/MM/yyyy',
    'd-M-yyyy',
    'dd-MM-yyyy',
    'yyyy-MM-dd',
    'M/d/yyyy',
    'MM/dd/yyyy'
  )
  $parsed = [DateTime]::MinValue
  if (
    [DateTime]::TryParseExact(
      ([string]$raw).Trim(),
      $dateFormats,
      [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]::None,
      [ref]$parsed
    )
  ) {
    return $parsed.ToString('yyyy-MM-dd')
  }

  throw "Invalid $FieldName date at workbook row $Row."
}

function Normalize-Position {
  param(
    [Parameter(Mandatory)]
    [string]$Position,
    [Parameter(Mandatory)]
    [int]$Row
  )

  $normalized = $Position.Replace([char]0x00A0, ' ').Trim()

  if ($normalized -eq 'ប្រធាននាយកដ្ឋាន') {
    return 'ប្រធាននាយកដ្ឋាន'
  }
  if ($normalized -match '^អនុប្រធាន\s*នាយកដ្ឋាន$') {
    return 'អនុប្រធាននាយកដ្ឋាន'
  }
  if (
    $normalized -match '^ប្រធានការិ\.' -or
    $normalized -match '^ប្រធានសាខា$'
  ) {
    return 'ប្រធានការិយាល័យ'
  }
  if (
    $normalized -match '^អនុ\.ការិ\.' -or
    $normalized -like 'អនុប្រធាន*សាខា'
  ) {
    return 'អនុប្រធានការិយាល័យ'
  }
  if ($normalized -in @('មន្រ្តី', 'មន្ត្រី')) {
    return 'មន្ត្រី'
  }
  if ($normalized -match '^មន្ត្រីកិច្ចសន្យា$') {
    return 'មន្ត្រីកិច្ចសន្យា'
  }

  throw "Unsupported position '$Position' at workbook row $Row."
}

function Join-Details {
  param(
    [AllowNull()]
    [object[]]$Parts
  )

  $values = @(
    $Parts |
      Where-Object {
        $null -ne $_ -and
        -not [string]::IsNullOrWhiteSpace([string]$_)
      } |
      ForEach-Object { ([string]$_).Trim() }
  )

  if ($values.Count -eq 0) {
    return $null
  }
  return $values -join "`n"
}

function Get-SharedFileSha256 {
  param(
    [Parameter(Mandatory)]
    [string]$Path
  )

  $stream = [IO.File]::Open(
    $Path,
    [IO.FileMode]::Open,
    [IO.FileAccess]::Read,
    [IO.FileShare]::ReadWrite
  )
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $algorithm.ComputeHash($stream)
    return [BitConverter]::ToString($hashBytes).Replace('-', '')
  }
  finally {
    $algorithm.Dispose()
    $stream.Dispose()
  }
}

$resolvedWorkbook = (Resolve-Path -LiteralPath $WorkbookPath).Path
$actualHash = Get-SharedFileSha256 -Path $resolvedWorkbook
if (
  -not [string]::IsNullOrWhiteSpace($ExpectedSha256) -and
  $actualHash -ne $ExpectedSha256.ToUpperInvariant()
) {
  throw @"
Workbook checksum mismatch.
Expected: $ExpectedSha256
Actual:   $actualHash
"@
}

$excel = $null
$workbook = $null
$sheet = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open(
    $resolvedWorkbook,
    0,
    $true
  )
  $sheet = $workbook.Worksheets.Item($expectedSheetName)

  $records = [Collections.Generic.List[object]]::new()
  foreach ($row in 11..110) {
    $name = Get-CellText -Sheet $sheet -Row $row -Column 4
    $employeeId = Get-CellText -Sheet $sheet -Row $row -Column 7
    if ($null -eq $name -or $null -eq $employeeId) {
      continue
    }

    $nameEn = Get-CellText -Sheet $sheet -Row $row -Column 5
    $genderText = Get-CellText -Sheet $sheet -Row $row -Column 8
    $gender = switch ($genderText) {
      'ប' { 'male' }
      'ស' { 'female' }
      default {
        throw "Unsupported gender '$genderText' at workbook row $row."
      }
    }

    $originalPosition = Get-CellText -Sheet $sheet -Row $row -Column 49
    if ($null -eq $originalPosition) {
      throw "Position is missing at workbook row $row."
    }
    $jobTitle = Normalize-Position -Position $originalPosition -Row $row

    $education = Get-CellText -Sheet $sheet -Row $row -Column 42
    $specialty = Get-CellText -Sheet $sheet -Row $row -Column 43
    $educationDetails = Join-Details -Parts @(
      $(if ($education) { "Education: $education" }),
      $(if ($specialty) { "Specialty / skill: $specialty" })
    )

    $honorific = Get-CellText -Sheet $sheet -Row $row -Column 3
    $additionalNote = Get-CellText -Sheet $sheet -Row $row -Column 62
    $responsibility = Get-CellText -Sheet $sheet -Row $row -Column 63
    $currentNote = Get-CellText -Sheet $sheet -Row $row -Column 67
    $otherInformation = Join-Details -Parts @(
      $(if ($honorific) { "Honorific: $honorific" }),
      $(
        if ($originalPosition -ne $jobTitle) {
          "Original workbook position: $originalPosition"
        }
      ),
      $(if ($additionalNote) { "Additional note: $additionalNote" }),
      $(if ($responsibility) { "Responsibility: $responsibility" }),
      $(if ($currentNote) { "Current note: $currentNote" })
    )

    foreach (
      $field in @(
        @{ Name = 'Education'; Value = $educationDetails },
        @{ Name = 'Other information'; Value = $otherInformation }
      )
    ) {
      if ($null -ne $field.Value -and $field.Value.Length -gt 4000) {
        throw "$($field.Name) exceeds 4,000 characters at workbook row $row."
      }
    }

    $officeName = if ($officeByRow.ContainsKey($row)) {
      $officeByRow[$row]
    }
    else {
      $null
    }

    $records.Add([ordered]@{
      sourceRow = $row
      employeeId = $employeeId
      name = $name
      nameEn = $nameEn
      jobTitleName = $jobTitle
      originalPosition = $originalPosition
      dateOfBirth = Convert-CellDate `
        -Sheet $sheet -Row $row -Column 9 -FieldName 'date of birth'
      joinedDate = Convert-CellDate `
        -Sheet $sheet -Row $row -Column 46 -FieldName 'joined'
      retiredDate = Convert-CellDate `
        -Sheet $sheet -Row $row -Column 57 -FieldName 'retired'
      gender = $gender
      education = $educationDetails
      phone = Get-CellText -Sheet $sheet -Row $row -Column 58
      address = Get-CellText -Sheet $sheet -Row $row -Column 21
      maritalStatus = 'unspecified'
      otherInformation = $otherInformation
      officeName = $officeName
    })
  }

  if ($records.Count -ne $expectedRecordCount) {
    throw "Expected $expectedRecordCount staff records, found $($records.Count)."
  }

  $duplicateEmployeeIds = @(
    $records |
      Group-Object { $_.employeeId } |
      Where-Object Count -gt 1
  )
  if ($duplicateEmployeeIds.Count -gt 0) {
    $duplicateRows = @(
      $duplicateEmployeeIds |
        ForEach-Object {
          @($_.Group | ForEach-Object sourceRow) -join ','
        }
    ) -join '; '
    throw "The workbook contains duplicate employee IDs at row groups: $duplicateRows."
  }

  $duplicateNames = @(
    $records |
      Group-Object { $_.name } |
      Where-Object Count -gt 1
  )
  if ($duplicateNames.Count -gt 0) {
    throw 'The workbook contains duplicate staff names.'
  }

  $result = [ordered]@{
    schemaVersion = 1
    source = [ordered]@{
      name = [IO.Path]::GetFileName($resolvedWorkbook)
      sha256 = $actualHash
      sheet = $expectedSheetName
    }
    departmentName = $expectedDepartment
    recordCount = $records.Count
    records = $records
  }

  $outputDirectory = Split-Path -Parent $OutputPath
  if (-not [string]::IsNullOrWhiteSpace($outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
  }
  $json = $result | ConvertTo-Json -Depth 8
  [IO.File]::WriteAllText(
    [IO.Path]::GetFullPath($OutputPath),
    $json,
    [Text.UTF8Encoding]::new($false)
  )

  $withOffice = @($records | Where-Object officeName).Count
  Write-Host "Validated $($records.Count) staff records."
  Write-Host "Department-only: $($records.Count - $withOffice)"
  Write-Host "With office: $withOffice"
  Write-Host "Extraction written to: $OutputPath"
}
finally {
  if ($null -ne $workbook) {
    $workbook.Close($false)
  }
  if ($null -ne $excel) {
    $excel.Quit()
  }
  foreach ($comObject in @($sheet, $workbook, $excel)) {
    if ($null -ne $comObject) {
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($comObject)
    }
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
