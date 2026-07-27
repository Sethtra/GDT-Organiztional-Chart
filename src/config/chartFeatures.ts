/**
 * Cloud version writes are opt-in until the chart_versions INSERT policy has
 * been applied and verified in the target Supabase environment.
 *
 * Local recovery and ordinary chart saves remain active when this is false.
 */
export function parseChartVersionWritesEnabled(
  value: string | undefined,
): boolean {
  return value?.trim().toLowerCase() === "true";
}

export const CHART_VERSION_WRITES_ENABLED =
  parseChartVersionWritesEnabled(
    import.meta.env.VITE_CHART_VERSION_WRITES_ENABLED,
  );
