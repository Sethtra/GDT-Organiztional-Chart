import React, { useState, useRef, useEffect } from "react";
import { useOrgChart } from "../context/OrgChartContext";
import { Pencil, Trash2, Plus, Check, X, GripVertical } from "lucide-react";

export default function NodeEditor({ node, onClose }) {
  const { updateNode, addNode, deleteNode, state } = useOrgChart();
  const [name, setName] = useState(node?.name || "");
  const [nameEn, setNameEn] = useState(node?.nameEn || "");
  const [mode, setMode] = useState("edit"); // "edit" | "add"
  const [addType, setAddType] = useState("office");
  const [newName, setNewName] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const childCount = (state.children[node?.id] || []).length;

  const typeOptions = {
    ministry: ["department"],
    department: ["division", "department"],
    division: ["department", "office"],
    office: ["office"],
  };

  const handleSave = () => {
    if (name.trim()) {
      updateNode(node.id, name.trim(), nameEn.trim());
      onClose();
    }
  };

  const handleAdd = () => {
    if (newName.trim()) {
      addNode(node.id, newName.trim(), newNameEn.trim(), addType);
      setNewName("");
      setNewNameEn("");
    }
  };

  const handleDelete = () => {
    deleteNode(node.id);
    onClose();
  };

  if (!node) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit Node</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-tabs">
          <button className={`modal-tab ${mode === "edit" ? "active" : ""}`} onClick={() => setMode("edit")}>
            <Pencil size={13} /> Edit
          </button>
          <button className={`modal-tab ${mode === "add" ? "active" : ""}`} onClick={() => setMode("add")}>
            <Plus size={13} /> Add Child
          </button>
          <button className={`modal-tab delete-tab ${confirmDelete ? "active" : ""}`} onClick={() => setConfirmDelete(true)}>
            <Trash2 size={13} /> Delete
          </button>
        </div>

        {mode === "edit" && (
          <div className="modal-body">
            <label className="input-label">Khmer Name *</label>
            <input ref={inputRef} className="modal-input" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()} placeholder="ឈ្មោះ..." />
            <label className="input-label">English Name</label>
            <input className="modal-input" value={nameEn} onChange={(e) => setNameEn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()} placeholder="English name..." />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={onClose}>Cancel</button>
              <button className="btn-save" onClick={handleSave}><Check size={14} /> Save</button>
            </div>
          </div>
        )}

        {mode === "add" && (
          <div className="modal-body">
            <label className="input-label">Child Type</label>
            <select className="modal-input" value={addType} onChange={(e) => setAddType(e.target.value)}>
              {(typeOptions[node.type] || ["office"]).map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <label className="input-label">Khmer Name *</label>
            <input className="modal-input" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder="ឈ្មោះ..." />
            <label className="input-label">English Name</label>
            <input className="modal-input" value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder="English name..." />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={onClose}>Cancel</button>
              <button className="btn-save" onClick={handleAdd}><Plus size={14} /> Add</button>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="modal-body">
            <div className="delete-warning">
              <Trash2 size={24} className="delete-icon" />
              <p>Delete <strong>"{node.name}"</strong>?</p>
              {childCount > 0 && <p className="delete-note">This will also delete <strong>{childCount}</strong> child node(s).</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn-delete" onClick={handleDelete}><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
