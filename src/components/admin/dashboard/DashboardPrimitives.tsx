import type { ReactNode } from "react";

import { cn } from "../../../lib/utils";
import type { BadgeTone } from "./dashboardPreviewData";

const BADGE_STYLES: Record<BadgeTone, string> = {
  success:
    "border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]",
  warning:
    "border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)] text-[#735413]",
  info:
    "border-[var(--pa-info-border)] bg-[var(--pa-info-soft)] text-[var(--pa-info)]",
  neutral:
    "border-[var(--pa-border)] bg-[var(--pa-surface-muted)] text-[#47524c]",
  danger:
    "border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] text-[var(--pa-danger)]",
};

const BADGE_DOT_STYLES: Record<BadgeTone, string> = {
  success: "bg-[var(--pa-primary)]",
  warning: "bg-[var(--pa-gold)]",
  info: "bg-[var(--pa-info)]",
  neutral: "bg-[var(--pa-muted)]",
  danger: "bg-[var(--pa-danger)]",
};

export function StatusBadge({
  children,
  tone = "neutral",
  dot = true,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10.5px] font-bold leading-none",
        BADGE_STYLES[tone],
      )}
    >
      {dot && (
        <span
          className={cn("size-1.5 rounded-full", BADGE_DOT_STYLES[tone])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--pa-border)] px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--pa-primary)]">
          {eyebrow}
        </div>
        <h2 className="mt-1.5 text-[16px] font-extrabold text-[var(--pa-text)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[12px] leading-5 text-[var(--pa-muted)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
