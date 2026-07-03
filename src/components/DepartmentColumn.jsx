import React, { useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useOrgChart } from "../context/OrgChartContext";
import NodeEditor from "./NodeEditor";

// Single office row item
function OfficeRow({ nodeId, index, lang }) {
  const { state } = useOrgChart();
  const node = state.nodes[nodeId];
  const [editing, setEditing] = useState(false);
  if (!node) return null;

  return (
    <>
      <Draggable draggableId={nodeId} index={index}>
        {(provided, snapshot) => (
          <div
            className={`office-item ${snapshot.isDragging ? "dragging" : ""}`}
            ref={provided.innerRef}
            {...provided.draggableProps}
          >
            <span className="drag-handle" {...provided.dragHandleProps}>
              <GripVertical size={12} />
            </span>
            <span className="office-arrow">→</span>
            <span className="office-name">
              {lang === "en" && node.nameEn ? node.nameEn : node.name}
            </span>
            <span className="node-actions">
              <button className="node-btn edit" onClick={() => setEditing(true)} title="Edit">
                <Pencil size={11} />
              </button>
              <button className="node-btn delete" onClick={() => setEditing(true)} title="Delete">
                <Trash2 size={11} />
              </button>
            </span>
          </div>
        )}
      </Draggable>
      {editing && <NodeEditor node={node} onClose={() => setEditing(false)} />}
    </>
  );
}

// Department column — contains header + droppable list of offices
export default function DepartmentColumn({ nodeId, index, lang }) {
  const { state, addNode } = useOrgChart();
  const node = state.nodes[nodeId];
  const childIds = state.children[nodeId] || [];
  const [editing, setEditing] = useState(false);
  const [addingChild, setAddingChild] = useState(false);

  if (!node) return null;

  return (
    <>
      <Draggable draggableId={nodeId} index={index}>
        {(provided, snapshot) => (
          <div
            className={`dept-column ${snapshot.isDragging ? "dragging" : ""}`}
            ref={provided.innerRef}
            {...provided.draggableProps}
          >
            {/* Department Header */}
            <div className="dept-header" {...provided.dragHandleProps}>
              <span className="dept-name">
                {lang === "en" && node.nameEn ? node.nameEn : node.name}
              </span>
              <div className="dept-type-badge">{node.type}</div>
              <div className="dept-header-actions">
                <button className="node-btn edit" onClick={() => setEditing(true)} title="Edit">
                  <Pencil size={11} />
                </button>
                <button className="node-btn add" onClick={() => setEditing("add")} title="Add child">
                  <Plus size={11} />
                </button>
                <button className="node-btn delete" onClick={() => setEditing("delete")} title="Delete">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>

            {/* Connector line from header to offices */}
            {childIds.length > 0 && <div className="dept-connector-line" />}

            {/* Droppable office list */}
            <Droppable droppableId={nodeId} type="OFFICE">
              {(dropProvided, dropSnapshot) => (
                <div
                  className={`office-list ${dropSnapshot.isDraggingOver ? "drag-over" : ""}`}
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                >
                  {childIds.map((offId, i) => (
                    <OfficeRow key={offId} nodeId={offId} index={i} lang={lang} />
                  ))}
                  {dropProvided.placeholder}
                  <button className="add-office-btn" onClick={() => setEditing("add")}>
                    <Plus size={12} /> Add Office
                  </button>
                </div>
              )}
            </Droppable>
          </div>
        )}
      </Draggable>
      {editing && <NodeEditor node={node} onClose={() => setEditing(false)} />}
    </>
  );
}
