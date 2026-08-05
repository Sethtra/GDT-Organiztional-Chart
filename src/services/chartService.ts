import { ChartViewerRecordSchema } from '../contracts/chart';
import { HR_FEATURES_ENABLED } from '../config/hrFeatures';
import type { ChartViewerRecord } from '../types/chart';
import { supabase } from '../supabaseClient';

export interface LoadChartResult {
  chart: ChartViewerRecord | null;
  usedLegacyFallback: boolean;
}

export async function loadChartForViewer(
  chartId: string,
  options: { allowLegacyAuthenticatedFallback?: boolean } = {},
): Promise<LoadChartResult> {
  if (HR_FEATURES_ENABLED) {
    const rpcResult = await supabase.rpc('get_chart_for_viewer', {
      target_chart_id: chartId,
    });

    if (!rpcResult.error && rpcResult.data) {
      const parsed = ChartViewerRecordSchema.safeParse(rpcResult.data);
      if (!parsed.success) {
        throw new Error(
          'The chart response did not match the expected contract.',
        );
      }
      return { chart: parsed.data, usedLegacyFallback: false };
    }
  }

  // Anonymous raw-chart reads can expose legacy profile fields. Until the safe
  // viewer RPC exists, fail closed for public visitors and use the old query
  // only for an authenticated owner or accepted chart member.
  if (!options.allowLegacyAuthenticatedFallback) {
    return { chart: null, usedLegacyFallback: true };
  }

  // Compatibility path for deployments where the new migration has not been
  // applied yet. This path is intentionally limited to authenticated users.
  const legacyResult = await supabase
    .from('charts')
    .select('*, chart_shares(access_level, shared_email, status)')
    .eq('id', chartId)
    .maybeSingle();

  if (legacyResult.error || !legacyResult.data) {
    return { chart: null, usedLegacyFallback: true };
  }

  const rawData = legacyResult.data as Record<string, unknown>;
  const legacyFormatted = {
    ...rawData,
    name: rawData.name || rawData.title || 'Untitled Chart',
    nodes: Array.isArray(rawData.nodes) ? rawData.nodes : [],
    edges: Array.isArray(rawData.edges) ? rawData.edges : [],
    is_public: rawData.is_public ?? false,
    public_access_level: rawData.public_access_level || 'view',
  };

  const parsed = ChartViewerRecordSchema.safeParse(legacyFormatted);
  if (!parsed.success) {
    console.error('Legacy chart validation error details:', parsed.error);
    throw new Error('The legacy chart response was malformed.');
  }
  return { chart: parsed.data, usedLegacyFallback: true };
}
