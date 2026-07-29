import { useEffect, useRef } from "react";

interface ChartNode {
  id: string;
}

interface ChartNodeFocusOptions<NodeType extends ChartNode> {
  active: boolean;
  loading: boolean;
  focusNodeId: string | null;
  nodes: NodeType[];
  onFocus: (node: NodeType) => void;
}

export function useChartNodeFocus<NodeType extends ChartNode>({
  active,
  loading,
  focusNodeId,
  nodes,
  onFocus,
}: ChartNodeFocusOptions<NodeType>): void {
  const handledNodeId = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !focusNodeId) {
      handledNodeId.current = null;
      return;
    }
    if (loading || handledNodeId.current === focusNodeId) return;

    const targetNode = nodes.find((node) => node.id === focusNodeId);
    if (!targetNode) return;

    handledNodeId.current = focusNodeId;
    onFocus(targetNode);
  }, [active, focusNodeId, loading, nodes, onFocus]);
}
