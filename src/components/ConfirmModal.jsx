import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({ title, message, confirmLabel = "Confirm", onConfirm, onCancel, danger = false }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-icon ${danger ? "modal-icon--danger" : "modal-icon--info"}`}>
          <AlertTriangle size={22} />
        </div>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="pp-btn pp-btn--ghost" onClick={onCancel}>Cancel</button>
          <button
            className={`pp-btn ${danger ? "pp-btn--delete" : "pp-btn--confirm-add"}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
