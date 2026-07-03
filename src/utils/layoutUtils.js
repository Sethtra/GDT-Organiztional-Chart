import Dagre from "@dagrejs/dagre";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;

/**
 * Auto-layout nodes using Dagre graph algorithm.
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @param {'TB'|'LR'} direction - Layout direction (Top-Bottom or Left-Right)
 */
export function getLayoutedElements(nodes, edges, direction = "TB") {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: direction === "TB" ? 40 : 60,
    ranksep: direction === "TB" ? 80 : 120,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: node.measured?.width ?? NODE_WIDTH,
      height: node.measured?.height ?? NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const pos = g.node(node.id);
      return {
        ...node,
        position: {
          x: pos.x - (node.measured?.width ?? NODE_WIDTH) / 2,
          y: pos.y - (node.measured?.height ?? NODE_HEIGHT) / 2,
        },
      };
    }),
    edges,
  };
}
