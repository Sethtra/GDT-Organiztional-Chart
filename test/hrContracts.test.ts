import { describe, expect, it } from 'vitest';
import {
  AssignmentHistorySchema,
  HrStaffDirectoryRecordSchema,
  HrStaffProfileSchema,
  InvitedStaffProfileSchema,
  PublicChartOccupantSchema,
  StaffInputSchema,
  maskNationalId,
} from '../src/contracts/hr';

const staffId = '00000000-0000-4000-8000-000000000001';
const chartId = '00000000-0000-4000-8000-000000000002';
const positionId = '00000000-0000-4000-8000-000000000003';
const departmentId = '00000000-0000-4000-8000-000000000004';

const position = {
  positionId,
  chartId,
  nodeId: 'node-1',
  title: 'Officer',
  departmentId,
  departmentName: 'Department',
  officeId: null,
  officeName: null,
};

const sharedProfile = {
  id: staffId,
  employeeId: 'GDT-001',
  name: 'មន្ត្រី',
  nameEn: 'Officer',
  age: 30,
  gender: 'unspecified',
  status: 'active',
  currentPosition: position,
  phone: '012345678',
  email: 'officer@example.com',
  address: 'Phnom Penh',
  maritalStatus: 'single',
  education: 'Degree',
  assignmentHistory: [],
  skills: [],
};

describe('HR contracts', () => {
  it('requires an integer age entered by HR', () => {
    const valid = StaffInputSchema.safeParse({
      employeeId: 'GDT-001',
      name: 'Officer',
      nameEn: null,
      age: 30,
      gender: 'unspecified',
      education: null,
      phone: null,
      email: null,
      address: null,
      maritalStatus: 'unspecified',
      nationalId: null,
    });
    const invalid = StaffInputSchema.safeParse({
      ...valid.data,
      age: 30.5,
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it('accepts preserved legacy staff and PostgreSQL timestamp offsets', () => {
    const result = HrStaffDirectoryRecordSchema.safeParse({
      ...sharedProfile,
      employeeId: null,
      education: null,
      nationalId: null,
      createdAt: '2026-07-21T09:32:44.530936+00:00',
      updatedAt: '2026-07-29T02:36:10+00:00',
    });

    expect(result.success).toBe(true);
  });

  it('masks national ID for invited users and keeps the full value HR-only', () => {
    const fullNationalId = '123456789012';
    const invited = InvitedStaffProfileSchema.parse({
      ...sharedProfile,
      nationalIdMasked: maskNationalId(fullNationalId),
      nationalId: fullNationalId,
    });
    const hr = HrStaffProfileSchema.parse({
      ...sharedProfile,
      nationalId: fullNationalId,
    });

    expect(invited.nationalIdMasked).toBe('••••••••9012');
    expect('nationalId' in invited).toBe(false);
    expect(hr.nationalId).toBe(fullNationalId);
  });

  it('removes private fields from the public chart occupant contract', () => {
    const publicOccupant = PublicChartOccupantSchema.parse({
      staffId,
      name: 'Officer',
      nameEn: null,
      positionTitle: 'Officer',
      nationalId: '123456789012',
      phone: '012345678',
      email: 'officer@example.com',
      address: 'Private',
      maritalStatus: 'single',
      education: 'Private',
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
