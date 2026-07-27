import { StaffProfileSchema } from "../contracts/hr";
import type { StaffProfile } from "../contracts/hr";
import { supabase } from "../supabaseClient";

export async function loadStaffProfile(
  staffId: string,
): Promise<StaffProfile> {
  const { data, error } = await supabase.rpc("get_staff_profile", {
    target_staff_id: staffId,
  });
  if (error) throw error;
  const parsed = StaffProfileSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("The staff profile response was malformed.");
  }
  return parsed.data;
}
