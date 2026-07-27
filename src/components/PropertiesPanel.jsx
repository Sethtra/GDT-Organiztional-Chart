import EdgePropertiesPanel from "./properties/EdgePropertiesPanel";
import NodePropertiesPanel from "./properties/NodePropertiesPanel";

export default function PropertiesPanel({
  chartId,
  nodes,
  edge,
  onUpdateNodes,
  onUpdateEdge,
  onDelete,
  onAddChild,
  onDuplicate,
  onClose,
  onSave,
  onViewStaffProfile,
}) {
  if (edge) {
    return (
      <EdgePropertiesPanel
        edge={edge}
        onUpdate={onUpdateEdge}
        onDelete={onDelete}
        onClose={onClose}
      />
    );
  }

  if (nodes?.length > 0) {
    return (
      <NodePropertiesPanel
        chartId={chartId}
        nodes={nodes}
        onUpdateNodes={onUpdateNodes}
        onDelete={onDelete}
        onAddChild={onAddChild}
        onDuplicate={onDuplicate}
        onClose={onClose}
        onSave={onSave}
        onViewStaffProfile={onViewStaffProfile}
      />
    );
  }

  return null;
}
