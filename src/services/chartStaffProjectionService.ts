import { supabase } from "../supabaseClient";
import {
  mergeSafeStaffProjection,
  type SafePositionProjection,
} from "../utils/safeStaffProjection";

interface ChartNode {
  id: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Loads the smallest safe relational projection needed to label chart nodes.
 * Full profiles, sensitive fields, skills, and history use dedicated RPCs.
 */
export async function mergeChartStaffProjection(
  chartId: string,
  nodes: ChartNode[],
): Promise<ChartNode[]> {
  if (nodes.length === 0) return nodes;

  const { data, error } = await supabase
    .from("positions")
    .select(`
      id,
      node_id,
      title,
      department,
      office,
      position_assignments (
        id,
        end_date,
        staff (
          id,
          name,
          name_en,
          photo_url
        )
      )
    `)
    .eq("chart_id", chartId);

  if (error) {
    console.error("Unable to load safe chart staff projection:", error);
    return nodes;
  }

  return mergeSafeStaffProjection(
    nodes,
    (data ?? []) as unknown as SafePositionProjection[],
  );
}
