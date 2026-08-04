// Derives, from the raw nodes/edges of a chart, everything the canvas needs
// to render collapse state and the "N underneath" team-size pill:
//   · visibleNodes/visibleEdges — with every descendant of a collapsed node
//     hidden (the node itself stays, so it can be re-expanded)
//   · childCounts — direct-report count per node (used for the collapse
//     chevron's number)
//   · teamSizes — DISTINCT total descendant count per node
//
// The chart is a DAG, not strictly a tree: a node can have more than one
// incoming edge (two supervisors sharing the same officer, a dotted-line
// report, etc). teamSizes must count each descendant once regardless of how
// many paths reach it — summing children.length recursively double-counts
// anyone reachable through more than one branch.
export function computeChartHierarchy(nodes, edges, collapsedNodes) {
  const hidden = new Set();
  if (collapsedNodes.size > 0) {
    const collectHiddenDescendants = (nodeId) => {
      edges
        .filter((e) => e.source === nodeId)
        .forEach((e) => {
          if (!hidden.has(e.target)) {
            hidden.add(e.target);
            collectHiddenDescendants(e.target);
          }
        });
    };
    collapsedNodes.forEach((id) => collectHiddenDescendants(id));
  }

  const childCounts = {};
  const childrenMap = {};
  edges.forEach((e) => {
    childCounts[e.source] = (childCounts[e.source] || 0) + 1;
    (childrenMap[e.source] ||= []).push(e.target);
  });

  const teamSizes = {};
  const descendantSets = {};
  const visiting = new Set();
  function getDescendants(nodeId) {
    if (descendantSets[nodeId] !== undefined) return descendantSets[nodeId];
    if (visiting.has(nodeId)) return new Set(); // cycle guard
    visiting.add(nodeId);
    const children = childrenMap[nodeId] || [];
    const all = new Set(children);
    for (const childId of children) {
      for (const descendantId of getDescendants(childId)) all.add(descendantId);
    }
    visiting.delete(nodeId);
    descendantSets[nodeId] = all;
    teamSizes[nodeId] = all.size;
    return all;
  }
  nodes.forEach((n) => getDescendants(n.id));

  const visibleNodes = nodes.filter((n) => !hidden.has(n.id));
  const visibleEdges = edges.filter(
    (e) => !hidden.has(e.source) && !hidden.has(e.target),
  );

  return { visibleNodes, visibleEdges, childCounts, teamSizes };
}
