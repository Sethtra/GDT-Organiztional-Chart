import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useOrgChart } from "../context/OrgChartContext";
import DepartmentColumn from "./DepartmentColumn";
import NodeEditor from "./NodeEditor";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";

// Renders a "division block" = one row: division header + horizontal row of department columns
function DivisionBlock({ nodeId, index, lang }) {
  const { state, reorderChildren } = useOrgChart();
  const node = state.nodes[nodeId];
  const deptIds = state.children[nodeId] || [];
  const [editing, setEditing] = useState(false);

  if (!node) return null;

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId, type } = result;

    if (type === "OFFICE") {
      // Reorder offices within a department
      if (source.droppableId === destination.droppableId) {
        const list = [...(state.children[source.droppableId] || [])];
        const [moved] = list.splice(source.index, 1);
        list.splice(destination.index, 0, moved);
        reorderChildren(source.droppableId, list);
      }
      return;
    }

    if (type === "DEPARTMENT") {
      const list = [...deptIds];
      const [moved] = list.splice(source.index, 1);
      list.splice(destination.index, 0, moved);
      reorderChildren(nodeId, list);
    }
  };

  return (
    <>
      <div className="division-block">
        {/* Division header row */}
        <div className="division-header-row">
          <div className="division-header">
            <span className="division-name">
              {lang === "en" && node.nameEn ? node.nameEn : node.name}
            </span>
            <div className="division-header-actions">
              <button className="node-btn edit" onClick={() => setEditing(true)} title="Edit"><Pencil size={11} /></button>
              <button className="node-btn add" onClick={() => setEditing("add")} title="Add department"><Plus size={11} /></button>
              <button className="node-btn delete" onClick={() => setEditing("delete")} title="Delete"><Trash2 size={11} /></button>
            </div>
          </div>
        </div>

        {/* Connector from division header to dept columns */}
        {deptIds.length > 0 && (
          <div className="division-connector">
            <div className="division-vert-line" />
            <div className="division-horiz-bar" style={{ width: `calc(${deptIds.length} * 220px - 220px)` }} />
          </div>
        )}

        {/* Horizontal scrollable dept columns */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId={nodeId} direction="horizontal" type="DEPARTMENT">
            {(provided, snapshot) => (
              <div
                className={`dept-row ${snapshot.isDraggingOver ? "drag-over" : ""}`}
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {deptIds.map((deptId, i) => (
                  <DepartmentColumn key={deptId} nodeId={deptId} index={i} lang={lang} />
                ))}
                {provided.placeholder}
                <button className="add-dept-btn" onClick={() => setEditing("add")}>
                  <Plus size={14} /> Add Department
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      {editing && <NodeEditor node={node} onClose={() => setEditing(false)} />}
    </>
  );
}

// Main OrgChart — renders root → central dept → divisions → dept columns
export default function OrgChart({ lang }) {
  const { state, addNode, reorderChildren } = useOrgChart();
  const [editingRoot, setEditingRoot] = useState(false);
  const [editingCentral, setEditingCentral] = useState(false);

  const rootId = "root-ministry";
  const root = state.nodes[rootId];
  const centralId = (state.children[rootId] || [])[0];
  const central = centralId ? state.nodes[centralId] : null;
  const divisionIds = centralId ? (state.children[centralId] || []) : [];

  // Top-level drag for divisions
  const onDivisionDragEnd = (result) => {
    if (!result.destination) return;
    const list = [...divisionIds];
    const [moved] = list.splice(result.source.index, 1);
    list.splice(result.destination.index, 0, moved);
    reorderChildren(centralId, list);
  };

  return (
    <div className="org-chart-root">
      {/* Ministry Header Node */}
      {root && (
        <div className="ministry-node-wrapper">
          <div className="ministry-node" onClick={() => setEditingRoot(true)}>
            <div className="ministry-logo">🏛️</div>
            <div className="ministry-text">
              <div className="ministry-name">{lang === "en" && root.nameEn ? root.nameEn : root.name}</div>
              {root.nameEn && lang !== "en" && <div className="ministry-name-en">{root.nameEn}</div>}
            </div>
          </div>
          {editingRoot && <NodeEditor node={root} onClose={() => setEditingRoot(false)} />}
        </div>
      )}

      {/* Connector: ministry → central dept */}
      {central && <div className="root-connector" />}

      {/* Central Department Node */}
      {central && (
        <div className="central-node-wrapper">
          <div className="central-node" onClick={() => setEditingCentral(true)}>
            <div className="central-logo">🏢</div>
            <div className="central-text">
              <div className="central-name">{lang === "en" && central.nameEn ? central.nameEn : central.name}</div>
              {central.nameEn && lang !== "en" && <div className="central-name-en">{central.nameEn}</div>}
            </div>
          </div>
          {editingCentral && <NodeEditor node={central} onClose={() => setEditingCentral(false)} />}
        </div>
      )}

      {/* Connector: central dept → division row */}
      {divisionIds.length > 0 && <div className="root-connector" />}

      {/* Division Blocks - vertically stacked, each with horizontal dept row */}
      {central && (
        <DragDropContext onDragEnd={onDivisionDragEnd}>
          <Droppable droppableId={centralId} direction="vertical" type="DIVISION">
            {(provided) => (
              <div className="divisions-stack" ref={provided.innerRef} {...provided.droppableProps}>
                {divisionIds.map((divId, i) => (
                  <Draggable key={divId} draggableId={divId + "__div"} index={i}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        className={`division-drag-wrapper ${dragSnapshot.isDragging ? "dragging" : ""}`}
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                      >
                        {/* Division drag handle */}
                        <div className="division-drag-handle" {...dragProvided.dragHandleProps}>
                          <GripVertical size={16} />
                        </div>
                        <DivisionBlock nodeId={divId} index={i} lang={lang} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <button className="add-division-btn" onClick={() => addNode(centralId, "ផ្នែកថ្មី", "New Division", "division")}>
                  <Plus size={14} /> Add Division
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
