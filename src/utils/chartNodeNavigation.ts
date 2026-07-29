const CHART_NODE_FOCUS_PARAM = "focusNode";
const MAX_CHART_NODE_ID_LENGTH = 200;

export function buildChartNodePath(
  chartId: string,
  nodeId: string,
): string {
  return `/chart/${encodeURIComponent(chartId)}?${CHART_NODE_FOCUS_PARAM}=${encodeURIComponent(nodeId)}`;
}

export function readChartNodeFocusId(search: string): string | null {
  const nodeId = new URLSearchParams(search).get(CHART_NODE_FOCUS_PARAM);
  if (!nodeId || nodeId.length > MAX_CHART_NODE_ID_LENGTH) return null;
  return nodeId;
}
