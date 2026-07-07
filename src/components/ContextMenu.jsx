import { useEffect } from "react";
import { Edit2, Plus, Copy, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

export default function ContextMenu({ x, y, node, isCollapsed, onEdit, onAddChild, onDuplicate, onToggleCollapse, onDelete, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.addEventListener("mousedown", onClose);
    return () => {
      document.removeEventListener("keydown", handler);
      document.removeEventListener("mousedown", onClose);
    };
  }, [onClose]);

  const items = [
    { icon: <Edit2 size={13} />,     label: "Edit Properties",    action: onEdit,           className: "" },
    { icon: <Plus size={13} />,      label: "Add Child Node",     action: onAddChild,       className: "" },
    { icon: <Copy size={13} />,      label: "Duplicate",          action: onDuplicate,      className: "" },
    {
      icon: isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />,
      label: isCollapsed ? "Expand Subtree" : "Collapse Subtree",
      action: onToggleCollapse,
      className: "",
    },
    { separator: true },
    { icon: <Trash2 size={13} />,    label: "Delete Node",        action: onDelete,         className: "ctx-item--danger" },
  ];

  return (
    <div
      className="ctx-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="ctx-separator" />
        ) : (
          <button
            key={i}
            className={`ctx-item ${item.className}`}
            onClick={() => { item.action?.(); onClose(); }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}
