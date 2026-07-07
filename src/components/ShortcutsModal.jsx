import { useEffect } from "react";
import { X } from "lucide-react";

const SHORTCUTS = [
  { key: "Ctrl + Z",             desc: "Undo" },
  { key: "Ctrl + Shift + Z",     desc: "Redo" },
  { key: "Ctrl + Y",             desc: "Redo (alternate)" },
  { key: "Ctrl + F",             desc: "Search nodes" },
  { key: "Ctrl + D",             desc: "Duplicate selected node" },
  { key: "Delete / Backspace",   desc: "Delete selected node or edge" },
  { key: "Escape",               desc: "Close panel / modal / search" },
  { key: "?",                    desc: "Show this shortcuts panel" },
  { key: "Scroll",               desc: "Zoom in / out" },
  { key: "Drag canvas",          desc: "Pan the canvas" },
  { key: "Drag node handle",     desc: "Connect two nodes" },
  { key: "Shift + drag handle",  desc: "Extended connection radius" },
  { key: "Double-click edge",    desc: "Delete edge instantly" },
  { key: "Right-click node",     desc: "Open context menu" },
];

export default function ShortcutsModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-shortcuts-header">
          <span className="modal-title">Keyboard Shortcuts</span>
          <button className="pp-close" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="shortcuts-grid">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="shortcut-row">
              <kbd className="shortcut-key">{s.key}</kbd>
              <span className="shortcut-desc">{s.desc}</span>
            </div>
          ))}
        </div>
        <p className="shortcuts-footer">Press <kbd className="shortcut-key">?</kbd> to toggle this panel</p>
      </div>
    </div>
  );
}
