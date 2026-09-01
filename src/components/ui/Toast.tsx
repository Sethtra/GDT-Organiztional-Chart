import { useEffect } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgStyles = {
    success: "bg-emerald-900/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/40",
    error: "bg-rose-950/95 border-rose-500/60 text-rose-100 shadow-rose-950/50",
    warning: "bg-amber-950/95 border-amber-500/50 text-amber-100 shadow-amber-950/40",
    info: "bg-slate-900/95 border-slate-600/50 text-slate-100 shadow-slate-950/40",
  }[toast.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[toast.type];

  const iconColor = {
    success: "text-emerald-400",
    error: "text-rose-400",
    warning: "text-amber-400",
    info: "text-sky-400",
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-200 ${bgStyles}`}
      role="alert"
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 text-xs font-semibold leading-relaxed break-words">
        {toast.message}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 rounded-md opacity-70 hover:opacity-100 transition-opacity hover:bg-white/10"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
