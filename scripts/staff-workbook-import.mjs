import { z } from 'zod'

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`)
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    )
  }, 'Invalid calendar date')

const nullableText = (maximumLength) =>
  z.string().trim().min(1).max(maximumLength).nullable()

const staffImportRecordSchema = z
  .object({
    sourceRow: z.number().int().min(1).max(1_000_000),
    employeeId: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(200),
    nameEn: nullableText(200),
    jobTitleName: z.string().trim().min(1).max(300),
    originalPosition: z.string().trim().min(1).max(300),
    dateOfBirth: isoDateSchema,
    joinedDate: isoDateSchema,
    retiredDate: isoDateSchema.nullable(),
    gender: z.enum(['female', 'male', 'other', 'unspecified']),
    education: nullableText(4_000),
    phone: nullableText(50),
    address: nullableText(4_000),
    maritalStatus: z.enum([
      'single',
      'married',
      'divorced',
      'widowed',
      'other',
      'unspecified',
    ]),
    otherInformation: nullableText(4_000),
    officeName: nullableText(300),
  })
  .superRefine((record, context) => {
    if (record.joinedDate < record.dateOfBirth) {
      context.addIssue({
        code: 'custom',
        path: ['joinedDate'],
        message: 'Joined date cannot be before date of birth',
      })
    }
    if (record.retiredDate && record.retiredDate < record.joinedDate) {
      context.addIssue({
        code: 'custom',
        path: ['retiredDate'],
        message: 'Retired date cannot be before joined date',
      })
    }
  })

const staffWorkbookImportSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.object({
      name: z.string().trim().min(1).max(255),
      sha256: z.string().regex(/^[A-Fa-f0-9]{64}$/),
      sheet: z.string().trim().min(1).max(255),
    }),
    departmentName: z.string().trim().min(1).max(300),
    recordCount: z.number().int().min(1).max(5_000),
    records: z.array(staffImportRecordSchema).min(1).max(5_000),
  })
  .superRefine((payload, context) => {
    if (payload.recordCount !== payload.records.length) {
      context.addIssue({
        code: 'custom',
        path: ['recordCount'],
        message: 'Record count does not match records',
      })
    }

    const employeeIds = new Set()
    const nameBirthDates = new Set()
    for (const [index, record] of payload.records.entries()) {
      const employeeId = record.employeeId.toLocaleLowerCase()
      if (employeeIds.has(employeeId)) {
        context.addIssue({
          code: 'custom',
          path: ['records', index, 'employeeId'],
          message: 'Duplicate employee ID in import',
        })
      }
      employeeIds.add(employeeId)

      const nameBirthDate =
        `${record.name.toLocaleLowerCase()}\u0000${record.dateOfBirth}`
      if (nameBirthDates.has(nameBirthDate)) {
        context.addIssue({
          code: 'custom',
          path: ['records', index, 'name'],
          message: 'Duplicate name and date of birth in import',
        })
      }
      nameBirthDates.add(nameBirthDate)
    }
  })

export function parseStaffWorkbookImport(content) {
  const normalized = content.replace(/^\uFEFF/, '')
  return staffWorkbookImportSchema.parse(JSON.parse(normalized))
}

function unique(values) {
  return [...new Set(values)]
}

export async function executeStaffWorkbookImport(
  client,
  payload,
  importedBy,
) {
  const existingBatch = await client.query(
    `
      SELECT id
      FROM public.staff_import_batches
      WHERE lower(source_sha256) = lower($1)
      LIMIT 1
    `,
    [payload.source.sha256],
  )
  if (existingBatch.rowCount > 0) {
    throw new Error('This workbook has already been imported.')
  }

  const departmentResult = await client.query(
    `
      SELECT id, name
      FROM public.org_units
      WHERE type = 'department'
        AND name = $1
      ORDER BY id
    `,
    [payload.departmentName],
  )
  if (departmentResult.rowCount !== 1) {
    throw new Error(
      'The workbook department does not match exactly one database department.',
    )
  }
  const departmentId = departmentResult.rows[0].id

  const requiredOffices = unique(
    payload.records
      .map(({ officeName }) => officeName)
      .filter((value) => value !== null),
  )
  const officeResult = await client.query(
    `
      SELECT id, name
      FROM public.org_offices
      WHERE unit_id = $1
        AND name = ANY($2::text[])
      ORDER BY name
    `,
    [departmentId, requiredOffices],
  )
  if (officeResult.rowCount !== requiredOffices.length) {
    throw new Error(
      'At least one workbook office does not match the selected department.',
    )
  }

  const requiredJobTitles = unique(
    payload.records.map(({ jobTitleName }) => jobTitleName),
  )
  const jobTitleResult = await client.query(
    `
      SELECT id, name
      FROM public.job_titles
      WHERE is_active
        AND name = ANY($1::text[])
      ORDER BY name
    `,
    [requiredJobTitles],
  )
  if (jobTitleResult.rowCount !== requiredJobTitles.length) {
    throw new Error(
      'At least one normalized position does not match an active job title.',
    )
  }

  const duplicateCandidates = payload.records.map(
    ({ sourceRow, employeeId, name, dateOfBirth }) => ({
      sourceRow,
      employeeId,
      name,
      dateOfBirth,
    }),
  )
  const duplicateResult = await client.query(
    `
      WITH candidates AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS candidate(
          "sourceRow" INTEGER,
          "employeeId" TEXT,
          name TEXT,
          "dateOfBirth" DATE
        )
      )
      SELECT candidate."sourceRow" AS source_row
      FROM candidates AS candidate
      JOIN public.staff AS staff
        ON lower(trim(coalesce(staff.employee_id, staff.staff_id, ''))) =
             lower(trim(candidate."employeeId"))
        OR (
          lower(trim(staff.name)) = lower(trim(candidate.name))
          AND staff.date_of_birth = candidate."dateOfBirth"
        )
      ORDER BY candidate."sourceRow"
    `,
    [JSON.stringify(duplicateCandidates)],
  )
  if (duplicateResult.rowCount > 0) {
    const rows = duplicateResult.rows
      .map(({ source_row: sourceRow }) => sourceRow)
      .join(', ')
    throw new Error(
      `Existing staff duplicates were found for workbook row(s): ${rows}.`,
    )
  }

  const batchResult = await client.query(
    `
      INSERT INTO public.staff_import_batches (
        source_sha256,
        source_name,
        sheet_name,
        department_id,
        record_count,
        imported_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [
      payload.source.sha256,
      payload.source.name,
      payload.source.sheet,
      departmentId,
      payload.recordCount,
      importedBy,
    ],
  )
  const batchId = batchResult.rows[0].id

  const databaseRecords = payload.records.map((record) => ({
    employeeId: record.employeeId,
    name: record.name,
    nameEn: record.nameEn,
    jobTitleName: record.jobTitleName,
    dateOfBirth: record.dateOfBirth,
    joinedDate: record.joinedDate,
    retiredDate: record.retiredDate,
    gender: record.gender,
    education: record.education,
    phone: record.phone,
    address: record.address,
    maritalStatus: record.maritalStatus,
    otherInformation: record.otherInformation,
  }))

  const staffResult = await client.query(
    `
      WITH import_rows AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS import_row(
          "employeeId" TEXT,
          name TEXT,
          "nameEn" TEXT,
          "jobTitleName" TEXT,
          "dateOfBirth" DATE,
          "joinedDate" DATE,
          "retiredDate" DATE,
          gender TEXT,
          education TEXT,
          phone TEXT,
          address TEXT,
          "maritalStatus" TEXT,
          "otherInformation" TEXT
        )
      )
      INSERT INTO public.staff (
        employee_id,
        staff_id,
        name,
        name_en,
        job_title_id,
        date_of_birth,
        join_date,
        retired_date,
        gender,
        education,
        phone,
        address,
        marital_status,
        other_information,
        status,
        created_by,
        updated_by
      )
      SELECT
        import_row."employeeId",
        import_row."employeeId",
        import_row.name,
        import_row."nameEn",
        title.id,
        import_row."dateOfBirth",
        import_row."joinedDate",
        import_row."retiredDate",
        import_row.gender,
        import_row.education,
        import_row.phone,
        import_row.address,
        import_row."maritalStatus",
        import_row."otherInformation",
        'active',
        $2,
        $2
      FROM import_rows AS import_row
      JOIN public.job_titles AS title
        ON title.name = import_row."jobTitleName"
       AND title.is_active
      RETURNING id
    `,
    [JSON.stringify(databaseRecords), importedBy],
  )
  if (staffResult.rowCount !== payload.recordCount) {
    throw new Error('The staff insert count did not match the workbook.')
  }

  const placementRecords = payload.records.map(
    ({ sourceRow, employeeId, officeName }) => ({
      sourceRow,
      employeeId,
      officeName,
    }),
  )
  const placementResult = await client.query(
    `
      WITH import_rows AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS import_row(
          "sourceRow" INTEGER,
          "employeeId" TEXT,
          "officeName" TEXT
        )
      )
      INSERT INTO public.staff_placements (
        staff_id,
        org_unit_id,
        office_id,
        import_batch_id,
        source_row,
        created_by,
        updated_by
      )
      SELECT
        staff.id,
        $2,
        office.id,
        $3,
        import_row."sourceRow",
        $4,
        $4
      FROM import_rows AS import_row
      JOIN public.staff AS staff
        ON staff.employee_id = import_row."employeeId"
      LEFT JOIN public.org_offices AS office
        ON office.unit_id = $2
       AND office.name = import_row."officeName"
      RETURNING staff_id
    `,
    [
      JSON.stringify(placementRecords),
      departmentId,
      batchId,
      importedBy,
    ],
  )
  if (placementResult.rowCount !== payload.recordCount) {
    throw new Error('The staff placement count did not match the workbook.')
  }

  const byOffice = Object.fromEntries(
    [...requiredOffices, null].map((officeName) => [
      officeName ?? 'Department only',
      payload.records.filter((record) => record.officeName === officeName)
        .length,
    ]),
  )
  const withOffice = payload.records.filter(
    ({ officeName }) => officeName !== null,
  ).length

  return {
    batchId,
    departmentId,
    insertedStaff: staffResult.rowCount,
    insertedPlacements: placementResult.rowCount,
    withOffice,
    departmentOnly: payload.recordCount - withOffice,
    byOffice,
  }
}
