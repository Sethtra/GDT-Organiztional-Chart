import { z } from "zod";

import {
  JobTitleSchema,
  ProficiencyLevelSchema,
  StaffJobFitSchema,
  UuidSchema,
} from "../contracts/hr";
import type {
  JobTitle,
  PositionScope,
  ProficiencyLevel,
  StaffJobFit,
} from "../contracts/hr";
import { supabase } from "../supabaseClient";

export async function listJobArchitecture(): Promise<JobTitle[]> {
  const { data, error } = await supabase.rpc("get_job_architecture");
  if (error) throw error;
  return z.array(JobTitleSchema).parse(data ?? []);
}

export async function saveJobTitle(input: {
  id?: string | null;
  code?: string | null;
  name: string;
  nameEn?: string | null;
  rankOrder: number;
  positionScope: PositionScope;
  isActive?: boolean;
}): Promise<string> {
  const { data, error } = await supabase.rpc("save_job_title", {
    target_job_title_id: input.id ?? null,
    code_value: input.code?.trim() || null,
    name_value: input.name.trim(),
    name_en_value: input.nameEn?.trim() || null,
    rank_order_value: input.rankOrder,
    position_scope_value: input.positionScope,
    is_active_value: input.isActive ?? true,
  });
  if (error) throw error;
  return UuidSchema.parse(data);
}

export async function setJobTitleRequirement(input: {
  jobTitleId: string;
  skillId: string;
  minimumProficiency: ProficiencyLevel;
  isRequired?: boolean;
  orgUnitId?: string | null;
}): Promise<void> {
  const minimum = ProficiencyLevelSchema.parse(input.minimumProficiency);
  const orgUnitId = input.orgUnitId
    ? UuidSchema.parse(input.orgUnitId)
    : null;
  const { error } = await supabase.rpc(
    "set_job_title_skill_requirement",
    {
      target_job_title_id: input.jobTitleId,
      target_skill_id: input.skillId,
      minimum_proficiency_value: minimum,
      is_required_value: input.isRequired ?? true,
      target_org_unit_id: orgUnitId,
    },
  );
  if (error) throw error;
}

export async function evaluateStaffJobFit(
  staffId: string,
  jobTitleId: string,
  orgUnitId: string | null = null,
): Promise<StaffJobFit> {
  const validatedOrgUnitId = orgUnitId ? UuidSchema.parse(orgUnitId) : null;
  const { data, error } = await supabase.rpc("evaluate_staff_job_fit", {
    target_staff_id: staffId,
    target_job_title_id: jobTitleId,
    target_org_unit_id: validatedOrgUnitId,
  });
  if (error) throw error;
  return StaffJobFitSchema.parse(data);
}
