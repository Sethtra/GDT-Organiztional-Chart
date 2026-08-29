import { parseActivityEvents } from "../contracts/activityLog";
import type { ActivityEvent } from "../contracts/activityLog";
import { supabase } from "../supabaseClient";

/**
 * Fetch the HR activity log for the given window.
 * Only accessible to HR administrators (enforced by SECURITY DEFINER RPC).
 * The RPC also prunes rows older than 15 days before returning results.
 */
export async function listRecentActivity(
  daysBack = 15,
): Promise<ActivityEvent[]> {
  const { data, error } = await supabase.rpc("get_hr_activity_log", {
    days_back: daysBack,
  });
  if (error) throw error;
  return parseActivityEvents(data ?? []);
}
