import { GraduationCap } from "lucide-react";

import type { EducationRow } from "../../../hooks/useDashboardAnalytics";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";

const BAR_COLORS = [
  "bg-[var(--pa-primary)]",
  "bg-[var(--pa-info)]",
  "bg-[var(--pa-gold)]",
  "bg-[#8b6bc4]",
  "bg-[#e07853]",
  "bg-[var(--pa-muted)]",
  "bg-[var(--pa-border)]",
];

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-3 animate-pulse sm:px-6">
      <div className="h-3 w-24 rounded bg-[var(--pa-border)]" />
      <div className="h-1.5 flex-1 rounded-full bg-[var(--pa-border)]" />
      <div className="h-3 w-6 rounded bg-[var(--pa-border)]" />
    </div>
  );
}

export default function EducationDistributionPanel({
  rows,
  loading,
  hasError,
}: {
  rows: EducationRow[];
  loading: boolean;
  hasError: boolean;
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const maxCount = rows.length > 0 ? rows[0]!.count : 1;

  return (
    <section
      className="flex h-[390px] flex-col overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
      aria-label="Education level distribution"
    >
      <PanelHeader
        eyebrow="Qualifications"
        title="Education levels"
        description={
          loading
            ? "Loading…"
            : hasError
              ? "Data unavailable"
              : `Distribution across ${total} active officer${total === 1 ? "" : "s"}`
        }
        action={
          <StatusBadge tone={hasError ? "danger" : "success"}>
            {loading ? "Loading" : hasError ? "Unavailable" : "Live"}
          </StatusBadge>
        }
      />

      <div aria-live="polite" className="pa-scrollbar flex flex-1 min-h-0 flex-col overflow-y-auto">
        {!loading && !hasError && rows.length === 0 && (
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-6 text-center">
            <GraduationCap
              size={22}
              className="text-[var(--pa-faint)]"
              aria-hidden="true"
            />
            <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
              No education data
            </div>
            <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-[var(--pa-muted)]">
              Education levels will appear once officers have education records.
            </p>
          </div>
        )}

        {loading ? (
          <div className="divide-y divide-[var(--pa-border)]">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-[var(--pa-border)]">
            {rows.map((row, idx) => {
              const pct = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
              const barColor = BAR_COLORS[idx % BAR_COLORS.length];
              return (
                <div
                  key={row.label}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--pa-canvas)] sm:px-6"
                >
                  <div className="w-[120px] shrink-0 sm:w-[150px]">
                    <div className="truncate text-[12px] font-extrabold text-[var(--pa-text)]">
                      {row.label}
                    </div>
                    <div className="text-[10px] font-medium text-[var(--pa-faint)]">
                      {total > 0
                        ? `${((row.count / total) * 100).toFixed(1)}%`
                        : "—"}
                    </div>
                  </div>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--pa-surface-muted)]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="pa-tabular w-8 shrink-0 text-right text-[12px] font-bold text-[var(--pa-text)]">
                    {row.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="mt-auto flex min-h-12 shrink-0 items-center justify-between border-t border-[var(--pa-border)] px-5 sm:px-6">
        <span className="text-[11px] font-bold text-[var(--pa-muted)]">
          {rows.length} {rows.length === 1 ? "level category" : "level categories"}
        </span>
        <span className="pa-tabular text-[11px] font-semibold text-[var(--pa-faint)]">
          {total} {total === 1 ? "officer" : "officers"} recorded
        </span>
      </footer>
    </section>
  );
}
