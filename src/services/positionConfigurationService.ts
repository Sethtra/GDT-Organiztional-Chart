import { z } from "zod";

import { PositionScopeSchema, UuidSchema } from "../contracts/hr";
import type { PositionScope } from "../contracts/hr";
import { supabase } from "../supabaseClient";

const ConfigJobTitleSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1),
  nameEn: z.string().nullable(),
  rankOrder: z.number().int(),
  positionScope: PositionScopeSchema,
});

const SupervisorPositionSchema = z.object({
  positionId: UuidSchema,
  nodeId: z.string().min(1),
  title: z.string().min(1),
  jobTitleId: UuidSchema.nullable(),
  rankOrder: z.number().int().nullable(),
  positionScope: PositionScopeSchema.nullable(),
  orgUnitId: UuidSchema.nullable(),
  officeId: UuidSchema.nullable(),
  departmentName: z.string().nullable(),
  officeName: z.string().nullable(),
  occupantName: z.string().nullable(),
});

const PositionConfigurationContextSchema = z.object({
  positionId: UuidSchema,
  jobTitleId: UuidSchema.nullable(),
  orgUnitId: UuidSchema.nullable(),
  officeId: UuidSchema.nullable(),
  reportsToPositionId: UuidSchema.nullable(),
  jobTitles: z.array(ConfigJobTitleSchema),
  supervisorPositions: z.array(SupervisorPositionSchema),
});

export type PositionConfigurationContext = z.infer<
  typeof PositionConfigurationContextSchema
>;
export type SupervisorPosition = z.infer<typeof SupervisorPositionSchema>;

export async function loadPositionConfiguration(
  positionId: string,
): Promise<PositionConfigurationContext> {
  const { data, error } = await supabase.rpc(
    "get_position_configuration_context",
    { target_position_id: positionId },
  );
  if (error) throw error;
  return PositionConfigurationContextSchema.parse(data);
}

export async function savePositionConfiguration(input: {
  positionId: string;
  jobTitleId: string | null;
  orgUnitId: string | null;
  officeId: string | null;
  reportsToPositionId: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("configure_chart_position", {
    target_position_id: input.positionId,
    target_job_title_id: input.jobTitleId,
    target_org_unit_id: input.orgUnitId,
    target_office_id: input.officeId,
    target_reports_to_position_id: input.reportsToPositionId,
  });
  if (error) throw error;
}

export function filterSupervisorPositions(
  context: PositionConfigurationContext,
  jobTitleId: string | null,
  orgUnitId: string | null,
  officeId: string | null,
): SupervisorPosition[] {
  const currentTitle = context.jobTitles.find(
    (title) => title.id === jobTitleId,
  );
  if (!currentTitle) return context.supervisorPositions;

  return context.supervisorPositions.filter((candidate) => {
    if (
      candidate.rankOrder !== null &&
      candidate.rankOrder >= currentTitle.rankOrder
    ) {
      return false;
    }
    if (currentTitle.positionScope === "individual") {
      return Boolean(officeId) && candidate.officeId === officeId;
    }
    if (currentTitle.positionScope === "office") {
      return (
        Boolean(orgUnitId) &&
        candidate.orgUnitId === orgUnitId &&
        (candidate.positionScope === "department" ||
          candidate.positionScope === "organization")
      );
    }
    return true;
  });
}

export function getPositionScope(
  context: PositionConfigurationContext,
  jobTitleId: string | null,
): PositionScope | null {
  return (
    context.jobTitles.find((title) => title.id === jobTitleId)
      ?.positionScope ?? null
  );
}
