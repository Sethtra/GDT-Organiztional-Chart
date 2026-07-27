import { z } from "zod";

import {
  ProficiencyLevelSchema,
  SkillCatalogItemSchema,
} from "../contracts/hr";
import type {
  ProficiencyLevel,
  SkillCatalogItem,
} from "../contracts/hr";
import { supabase } from "../supabaseClient";

export async function listSkillCatalog(): Promise<SkillCatalogItem[]> {
  const { data, error } = await supabase.rpc("get_hr_skill_catalog");
  if (error) throw error;
  return z.array(SkillCatalogItemSchema).parse(data ?? []);
}

export async function saveSkillCatalogItem(input: {
  id?: string | null;
  name: string;
  description?: string | null;
  isActive?: boolean;
}): Promise<string> {
  const { data, error } = await supabase.rpc("save_skill_catalog_item", {
    target_skill_id: input.id ?? null,
    skill_name: input.name.trim(),
    skill_description: input.description?.trim() || null,
    skill_is_active: input.isActive ?? true,
  });
  if (error) throw error;
  return z.string().uuid().parse(data);
}

export async function setStaffSkill(input: {
  staffId: string;
  skillId: string;
  proficiency: ProficiencyLevel;
  effectiveDate: string;
  notes?: string | null;
}): Promise<void> {
  const proficiency = ProficiencyLevelSchema.parse(input.proficiency);
  const { error } = await supabase.rpc("set_staff_skill_proficiency", {
    target_staff_id: input.staffId,
    target_skill_id: input.skillId,
    proficiency_value: proficiency,
    effective_date: input.effectiveDate,
    skill_notes: input.notes?.trim() || null,
  });
  if (error) throw error;
}
