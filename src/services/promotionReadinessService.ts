import { z } from "zod";

import {
  PromotionReadinessSchema,
  UuidSchema,
} from "../contracts/hr";
import type { PromotionReadiness } from "../contracts/hr";
import { supabase } from "../supabaseClient";

const PromotionReadinessListSchema = z.array(PromotionReadinessSchema);

async function getPromotionReadiness(
  staffId: string | null,
): Promise<PromotionReadiness[]> {
  const targetStaffId = staffId === null ? null : UuidSchema.parse(staffId);
  const { data, error } = await supabase.rpc("get_promotion_readiness", {
    target_staff_id: targetStaffId,
  });
  if (error) throw error;

  const parsed = PromotionReadinessListSchema.safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("The promotion readiness response was malformed.");
  }
  return parsed.data;
}

export function listPromotionReadiness(): Promise<PromotionReadiness[]> {
  return getPromotionReadiness(null);
}

export async function loadPromotionReadiness(
  staffId: string,
): Promise<PromotionReadiness | null> {
  const results = await getPromotionReadiness(staffId);
  return results[0] ?? null;
}
