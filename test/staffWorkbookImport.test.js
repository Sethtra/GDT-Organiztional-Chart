import test from 'node:test'
import assert from 'node:assert/strict'

import {
  parseStaffWorkbookImport,
} from '../scripts/staff-workbook-import.mjs'

function record(overrides = {}) {
  return {
    sourceRow: 11,
    employeeId: 'TEST-001',
    name: 'Test Officer',
    nameEn: null,
    jobTitleName: 'Officer',
    originalPosition: 'Officer',
    dateOfBirth: '1990-01-01',
    joinedDate: '2015-01-01',
    retiredDate: null,
    gender: 'unspecified',
    education: null,
    phone: null,
    address: null,
    maritalStatus: 'unspecified',
    otherInformation: null,
    officeName: null,
    ...overrides,
  }
}

function payload(records) {
  return JSON.stringify({
    schemaVersion: 1,
    source: {
      name: 'staff.xlsx',
      sha256: 'a'.repeat(64),
      sheet: 'Staff',
    },
    departmentName: 'Test Department',
    recordCount: records.length,
    records,
  })
}

test('staff workbook import accepts validated relational placement records', () => {
  const parsed = parseStaffWorkbookImport(
    payload([
      record(),
      record({
        sourceRow: 12,
        employeeId: 'TEST-002',
        name: 'Second Officer',
        officeName: 'Test Office',
      }),
    ]),
  )

  assert.equal(parsed.recordCount, 2)
  assert.equal(parsed.records[0].officeName, null)
  assert.equal(parsed.records[1].officeName, 'Test Office')
})

test('staff workbook import rejects duplicate employee IDs', () => {
  assert.throws(
    () =>
      parseStaffWorkbookImport(
        payload([
          record(),
          record({
            sourceRow: 12,
            name: 'Second Officer',
          }),
        ]),
      ),
    /Duplicate employee ID in import/,
  )
})

test('staff workbook import rejects invalid employment date order', () => {
  assert.throws(
    () =>
      parseStaffWorkbookImport(
        payload([
          record({
            joinedDate: '1989-01-01',
          }),
        ]),
      ),
    /Joined date cannot be before date of birth/,
  )
})
