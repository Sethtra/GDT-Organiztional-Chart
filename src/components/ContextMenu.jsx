import { useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit2,
  LockKeyhole,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";

export default function ContextMenu({
  x,
  y,
  isCollapsed,
  onViewDetails,
  profileRestricted = false,
  onEdit,
  onAddChild,
  onDuplicate,
  onToggleCollapse,
  onDelete,
  onClose,
}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.addEventListener("click", onClose);
    return () => {
      document.removeEventListener("keydown", handler);
      document.removeEventListener("click", onClose);
    };
  }, [onClose]);

  const items = [];

  if (onViewDetails) {
    items.push({
      icon: <UserRound size={13} />,
      label: "View Details",
      action: onViewDetails,
      className: "",
    });
  } else if (profileRestricted) {
    items.push({
      icon: <LockKeyhole size={13} />,
      label: "Profile requires invitation",
      action: null,
      className: "",
      disabled: true,
    });
  }

  if (onEdit) {
    if (items.length > 0) items.push({ separator: true });
    items.push(
      { icon: <Edit2 size={13} />, label: "Edit Properties", action: onEdit, className: "" },
      { icon: <Plus size={13} />, label: "Add Child Node", action: onAddChild, className: "" },
      { icon: <Copy size={13} />, label: "Duplicate", action: onDuplicate, className: "" },
      {
        icon: isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />,
        label: isCollapsed ? "Expand Subtree" : "Collapse Subtree",
        action: onToggleCollapse,
        className: "",
      },
      { separator: true },
      {
        icon: <Trash2 size={13} />,
        label: "Delete Node",
        action: onDelete,
        className: "ctx-item--danger",
      },
    );
  }

  return (
    <div
      className="ctx-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      role="menu"
      aria-label="Node actions"
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="ctx-separator" />
        ) : (
          <button
            key={i}
            className={`ctx-item ${item.className}`}
            disabled={item.disabled}
            role="menuitem"
            onClick={() => {
              if (item.disabled) return;
              item.action?.();
              onClose();
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}
