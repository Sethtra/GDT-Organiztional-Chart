import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface AdminConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function AdminConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  danger = false,
}: AdminConfirmModalProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
      onClick={onCancel}
      style={{ fontFamily: "'Manrope', 'Noto Sans Khmer', system-ui, sans-serif" }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="w-full max-w-md rounded-[16px] border border-[#d9e1dc] bg-white p-6 text-[#16211b] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`grid size-11 place-items-center rounded-[12px] border ${
            danger
              ? "border-[#efc8c4] bg-[#fdecea] text-[#9c332d]"
              : "border-[#ead7a1] bg-[#fff6dd] text-[#b48728]"
          }`}
        >
          <AlertTriangle size={20} aria-hidden="true" />
        </div>
        <h3
          id="admin-confirm-title"
          className="mt-4 text-[15px] font-extrabold tracking-[-0.01em] text-[#16211b]"
        >
          {title}
        </h3>
        <p className="mt-2 text-[12.5px] leading-5 font-medium text-[#66716b]">
          {message}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="min-h-10 rounded-[9px] border border-[#d9e1dc] px-4 text-[12.5px] font-bold text-[#16211b] transition hover:bg-[#eef2ee]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`min-h-10 rounded-[9px] px-4 text-[12.5px] font-extrabold text-white transition ${
              danger
                ? "bg-[#9c332d] hover:bg-[#832a25]"
                : "bg-[#136232] hover:bg-[#0f5129]"
            }`}
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
