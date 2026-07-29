import { z } from 'zod';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const UuidSchema = z.string().uuid();
export const IsoDateSchema = z.string().regex(isoDatePattern, 'Use YYYY-MM-DD');
export const NullableIsoDateSchema = IsoDateSchema.nullable();
export const DatabaseTimestampSchema = z.string().datetime({ offset: true });
export const LegacyEmployeeIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .nullable();

export const AppRoleSchema = z.enum(['hr_admin']);
export const GenderSchema = z.enum([
  'female',
  'male',
  'other',
  'unspecified',
]);
export const MaritalStatusSchema = z.enum([
  'single',
  'married',
  'divorced',
  'widowed',
  'other',
  'unspecified',
]);
export const StaffStatusSchema = z.enum(['active', 'archived']);
export const ProficiencyLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export const AssignmentChangeReasonSchema = z.enum([
  'assigned',
  'transferred',
  'promoted',
  'resigned',
  'retired',
  'suspended',
  'vacated',
  'corrected',
]);

export const StaffInputSchema = z
  .object({
    employeeId: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(200),
    nameEn: z.string().trim().max(200).nullable(),
    jobTitleId: UuidSchema,
    dateOfBirth: IsoDateSchema,
    joinedDate: IsoDateSchema,
    retiredDate: NullableIsoDateSchema,
    gender: GenderSchema,
    education: z.string().trim().max(4_000).nullable(),
    phone: z.string().trim().max(50).nullable(),
    address: z.string().trim().max(4_000).nullable(),
    maritalStatus: MaritalStatusSchema,
    otherInformation: z.string().trim().max(4_000).nullable(),
  })
  .superRefine((staff, context) => {
    if (staff.joinedDate.localeCompare(staff.dateOfBirth) < 0) {
      context.addIssue({
        code: 'custom',
        path: ['joinedDate'],
        message: 'Joined date cannot be before date of birth',
      });
    }
    if (
      staff.retiredDate &&
      staff.retiredDate.localeCompare(staff.joinedDate) < 0
    ) {
      context.addIssue({
        code: 'custom',
        path: ['retiredDate'],
        message: 'Retired date cannot be before joined date',
      });
    }
  });

export const StaffRecordSchema = StaffInputSchema.extend({
  id: UuidSchema,
  status: StaffStatusSchema,
  createdAt: DatabaseTimestampSchema,
  updatedAt: DatabaseTimestampSchema,
});

export const PositionSummarySchema = z.object({
  positionId: UuidSchema,
  chartId: UuidSchema,
  nodeId: z.string().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  departmentId: UuidSchema.nullable(),
  departmentName: z.string().trim().min(1).max(300).nullable(),
  officeId: UuidSchema.nullable(),
  officeName: z.string().trim().min(1).max(300).nullable(),
});

export const PublicChartOccupantSchema = z.object({
  staffId: UuidSchema,
  name: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().max(200).nullable(),
  positionTitle: z.string().trim().min(1).max(300),
});

export const StaffJobTitleSchema = z.object({
  id: UuidSchema,
  name: z.string().trim().min(1).max(300),
  nameEn: z.string().trim().max(300).nullable(),
  rankOrder: z.number().int().min(1).max(1_000),
  positionScope: z.enum([
    'individual',
    'office',
    'department',
    'organization',
  ]),
});

export const StaffOrganizationalPlacementSchema = z.object({
  departmentId: UuidSchema,
  departmentName: z.string().trim().min(1).max(300),
  officeId: UuidSchema.nullable(),
  officeName: z.string().trim().min(1).max(300).nullable(),
});

export const StaffDirectorySummarySchema = z.object({
  id: UuidSchema,
  employeeId: LegacyEmployeeIdSchema,
  name: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().max(200).nullable(),
  dateOfBirth: NullableIsoDateSchema,
  joinedDate: NullableIsoDateSchema,
  retiredDate: NullableIsoDateSchema,
  gender: GenderSchema,
  status: StaffStatusSchema,
  jobTitle: StaffJobTitleSchema.nullable(),
  currentPosition: PositionSummarySchema.nullable(),
  organizationalPlacement:
    StaffOrganizationalPlacementSchema.nullable().default(null),
});

export const HrStaffDirectoryRecordSchema = StaffDirectorySummarySchema.extend({
  education: z.string().trim().max(4_000).nullable(),
  phone: z.string().trim().max(50).nullable(),
  address: z.string().trim().max(4_000).nullable(),
  maritalStatus: MaritalStatusSchema,
  otherInformation: z.string().trim().max(4_000).nullable(),
  createdAt: DatabaseTimestampSchema,
  updatedAt: DatabaseTimestampSchema,
});

export const StaffDuplicateSchema = z.object({
  staffId: UuidSchema,
  employeeId: LegacyEmployeeIdSchema,
  name: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().max(200).nullable(),
  matchedFields: z.array(
    z.enum(['employeeId', 'nameAndDateOfBirth']),
  ).min(1),
  location: z.object({
    position: z.string().nullable(),
    department: z.string().nullable(),
    office: z.string().nullable(),
    chartId: UuidSchema.nullable(),
    nodeId: z.string().nullable(),
  }),
});

export const AssignmentHistorySchema = z
  .object({
    id: UuidSchema,
    staffId: UuidSchema,
    position: PositionSummarySchema,
    joinedDate: IsoDateSchema,
    leftDate: NullableIsoDateSchema,
    reason: AssignmentChangeReasonSchema.nullable(),
    notes: z.string().trim().max(4_000).nullable(),
  })
  .superRefine((assignment, context) => {
    if (
      assignment.leftDate &&
      assignment.leftDate.localeCompare(assignment.joinedDate) < 0
    ) {
      context.addIssue({
        code: 'custom',
        path: ['leftDate'],
        message: 'Left date cannot be before joined date',
      });
    }
  });

export const SkillCatalogItemSchema = z.object({
  id: UuidSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).nullable(),
  isActive: z.boolean(),
});

export const StaffSkillSchema = z.object({
  id: UuidSchema,
  staffId: UuidSchema,
  skill: SkillCatalogItemSchema,
  proficiency: ProficiencyLevelSchema,
  effectiveFrom: IsoDateSchema,
  effectiveTo: NullableIsoDateSchema,
  notes: z.string().trim().max(2_000).nullable(),
});

export const JobTitleRequirementSchema = z.object({
  id: UuidSchema,
  jobTitleId: UuidSchema,
  skill: SkillCatalogItemSchema,
  minimumProficiency: ProficiencyLevelSchema,
  isRequired: z.boolean(),
});

export const PositionScopeSchema = z.enum([
  'individual',
  'office',
  'department',
  'organization',
]);

export const JobTitleSchema = z.object({
  id: UuidSchema,
  code: z.string().trim().max(64).nullable(),
  name: z.string().trim().min(1).max(300),
  nameEn: z.string().trim().max(300).nullable(),
  rankOrder: z.number().int().min(1).max(1_000),
  positionScope: PositionScopeSchema,
  isActive: z.boolean(),
  requirements: z.array(JobTitleRequirementSchema),
});

export const StaffJobFitSchema = z.object({
  staffId: UuidSchema,
  jobTitleId: UuidSchema,
  isFit: z.boolean(),
  requirements: z.array(z.object({
    skillId: UuidSchema,
    skillName: z.string().min(1),
    minimumProficiency: ProficiencyLevelSchema,
    currentProficiency: ProficiencyLevelSchema.nullable(),
    isRequired: z.boolean(),
    status: z.enum(['met', 'missing', 'below']),
  })),
});

const SharedProfileFieldsSchema = StaffDirectorySummarySchema.extend({
  phone: z.string().trim().max(50).nullable(),
  address: z.string().trim().max(4_000).nullable(),
  maritalStatus: MaritalStatusSchema,
  education: z.string().trim().max(4_000).nullable(),
  otherInformation: z.string().trim().max(4_000).nullable(),
  assignmentHistory: z.array(AssignmentHistorySchema),
  skills: z.array(StaffSkillSchema),
});

export const InvitedStaffProfileSchema = SharedProfileFieldsSchema.extend({
  access: z.literal('invited').default('invited'),
});

export const HrStaffProfileSchema = SharedProfileFieldsSchema.extend({
  access: z.literal('hr').default('hr'),
});

export const StaffProfileSchema = z.discriminatedUnion('access', [
  InvitedStaffProfileSchema,
  HrStaffProfileSchema,
]);

export type AppRole = z.infer<typeof AppRoleSchema>;
export type Gender = z.infer<typeof GenderSchema>;
export type MaritalStatus = z.infer<typeof MaritalStatusSchema>;
export type StaffStatus = z.infer<typeof StaffStatusSchema>;
export type ProficiencyLevel = z.infer<typeof ProficiencyLevelSchema>;
export type AssignmentChangeReason = z.infer<
  typeof AssignmentChangeReasonSchema
>;
export type StaffInput = z.infer<typeof StaffInputSchema>;
export type StaffRecord = z.infer<typeof StaffRecordSchema>;
export type PositionSummary = z.infer<typeof PositionSummarySchema>;
export type PublicChartOccupant = z.infer<typeof PublicChartOccupantSchema>;
export type StaffJobTitle = z.infer<typeof StaffJobTitleSchema>;
export type StaffOrganizationalPlacement = z.infer<
  typeof StaffOrganizationalPlacementSchema
>;
export type StaffDirectorySummary = z.infer<
  typeof StaffDirectorySummarySchema
>;
export type HrStaffDirectoryRecord = z.infer<
  typeof HrStaffDirectoryRecordSchema
>;
export type StaffDuplicate = z.infer<typeof StaffDuplicateSchema>;
export type AssignmentHistory = z.infer<typeof AssignmentHistorySchema>;
export type SkillCatalogItem = z.infer<typeof SkillCatalogItemSchema>;
export type StaffSkill = z.infer<typeof StaffSkillSchema>;
export type JobTitleRequirement = z.infer<typeof JobTitleRequirementSchema>;
export type PositionScope = z.infer<typeof PositionScopeSchema>;
export type JobTitle = z.infer<typeof JobTitleSchema>;
export type StaffJobFit = z.infer<typeof StaffJobFitSchema>;
export type InvitedStaffProfile = z.infer<typeof InvitedStaffProfileSchema>;
export type HrStaffProfile = z.infer<typeof HrStaffProfileSchema>;
export type StaffProfile = z.infer<typeof StaffProfileSchema>;
