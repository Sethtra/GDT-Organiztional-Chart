import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  danger = false,
}) {
  const [confirmText, setConfirmText] = useState("");
  const isConfirmed = !danger || confirmText === "CONFIRM";

  // Close on Escape
  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") onCancel();
    };
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

        {danger && (
          <div className="modal-confirm-wrap">
            <label className="modal-confirm-label">
              Type <code>CONFIRM</code> to proceed
            </label>
            <input
              type="text"
              className="modal-confirm-input"
              placeholder="Type CONFIRM here"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        )}

        <div className="modal-actions">
          <button className="pp-btn pp-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`pp-btn ${danger ? "pp-btn--delete" : "pp-btn--confirm-add"}`}
            onClick={onConfirm}
            disabled={!isConfirmed}
            autoFocus={!danger}
          >
            {confirmLabel || (danger ? "Delete" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
