export function moveSelectedNodesToLayer(nodes, layer) {
  const selectedIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
  if (selectedIds.size === 0) return nodes;

  const ordered = nodes
    .map((node, index) => ({ node, index }))
    .sort((a, b) => (a.node.zIndex ?? 0) - (b.node.zIndex ?? 0) || a.index - b.index);
  const selected = ordered.filter(({ node }) => selectedIds.has(node.id));
  const unselected = ordered.filter(({ node }) => !selectedIds.has(node.id));
  const layered = layer === "front" ? [...unselected, ...selected] : [...selected, ...unselected];
  const zIndexById = new Map(layered.map(({ node }, index) => [node.id, index]));

  return nodes.map((node) => ({ ...node, zIndex: zIndexById.get(node.id) }));
}
