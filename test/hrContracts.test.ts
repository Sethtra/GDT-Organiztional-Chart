import { describe, expect, it } from 'vitest';
import {
  AssignmentHistorySchema,
  HrStaffDirectoryRecordSchema,
  HrStaffProfileSchema,
  InvitedStaffProfileSchema,
  PublicChartOccupantSchema,
  StaffInputSchema,
} from '../src/contracts/hr';

const staffId = '00000000-0000-4000-8000-000000000001';
const chartId = '00000000-0000-4000-8000-000000000002';
const positionId = '00000000-0000-4000-8000-000000000003';
const departmentId = '00000000-0000-4000-8000-000000000004';
const jobTitleId = '00000000-0000-4000-8000-000000000006';

const position = {
  positionId,
  chartId,
  nodeId: 'node-1',
  title: 'មន្ត្រី',
  departmentId,
  departmentName: 'Department',
  officeId: null,
  officeName: null,
};

const jobTitle = {
  id: jobTitleId,
  name: 'មន្ត្រី',
  nameEn: 'Officer',
  rankOrder: 50,
  positionScope: 'individual',
};

const sharedProfile = {
  id: staffId,
  employeeId: 'GDT-001',
  name: 'មន្ត្រី',
  nameEn: 'Officer',
  dateOfBirth: '1996-01-15',
  joinedDate: '2020-03-01',
  retiredDate: null,
  gender: 'unspecified',
  status: 'active',
  jobTitle,
  currentPosition: position,
  phone: '012345678',
  address: 'Phnom Penh',
  maritalStatus: 'single',
  education: 'Degree',
  otherInformation: null,
  assignmentHistory: [],
  skills: [],
};

describe('HR contracts', () => {
  it('requires position, date of birth, and joined date', () => {
    const valid = StaffInputSchema.safeParse({
      employeeId: 'GDT-001',
      name: 'Officer',
      nameEn: null,
      jobTitleId,
      dateOfBirth: '1996-01-15',
      joinedDate: '2020-03-01',
      retiredDate: null,
      gender: 'unspecified',
      education: null,
      phone: null,
      address: null,
      maritalStatus: 'unspecified',
      otherInformation: null,
    });
    const invalid = StaffInputSchema.safeParse({
      ...valid.data,
      jobTitleId: '',
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it('rejects joined and retired dates in the wrong order', () => {
    const baseInput = {
      employeeId: 'GDT-001',
      name: 'Officer',
      nameEn: null,
      jobTitleId,
      dateOfBirth: '1996-01-15',
      joinedDate: '2020-03-01',
      retiredDate: null,
      gender: 'unspecified' as const,
      education: null,
      phone: null,
      address: null,
      maritalStatus: 'unspecified' as const,
      otherInformation: null,
    };
    const invalidJoin = StaffInputSchema.safeParse({
      ...baseInput,
      joinedDate: '1995-01-01',
    });
    const invalidRetirement = StaffInputSchema.safeParse({
      ...baseInput,
      retiredDate: '2019-12-31',
    });

    expect(invalidJoin.success).toBe(false);
    expect(invalidRetirement.success).toBe(false);
  });

  it('accepts PostgreSQL timestamp offsets in directory records', () => {
    const result = HrStaffDirectoryRecordSchema.safeParse({
      ...sharedProfile,
      employeeId: null,
      education: null,
      createdAt: '2026-07-21T09:32:44.530936+00:00',
      updatedAt: '2026-07-29T02:36:10+00:00',
    });

    expect(result.success).toBe(true);
  });

  it('uses the same refined profile fields for HR and invited viewers', () => {
    const invited = InvitedStaffProfileSchema.parse(sharedProfile);
    const hr = HrStaffProfileSchema.parse(sharedProfile);

    expect(invited.access).toBe('invited');
    expect(hr.access).toBe('hr');
    expect('nationalId' in hr).toBe(false);
    expect('email' in hr).toBe(false);
    expect('age' in hr).toBe(false);
  });

  it('removes private fields from the public chart occupant contract', () => {
    const publicOccupant = PublicChartOccupantSchema.parse({
      staffId,
      name: 'Officer',
      nameEn: null,
      positionTitle: 'Officer',
      phone: '012345678',
      address: 'Private',
      maritalStatus: 'single',
      education: 'Private',
      dateOfBirth: '1996-01-15',
      joinedDate: '2020-03-01',
    });

    expect(publicOccupant).toEqual({
      staffId,
      name: 'Officer',
      nameEn: null,
      positionTitle: 'Officer',
    });
  });

  it('rejects assignment history whose left date predates the joined date', () => {
    const result = AssignmentHistorySchema.safeParse({
      id: '00000000-0000-4000-8000-000000000005',
      staffId,
      position,
      joinedDate: '2026-02-01',
      leftDate: '2026-01-31',
      reason: 'transferred',
      notes: null,
    });

    expect(result.success).toBe(false);
  });
});
