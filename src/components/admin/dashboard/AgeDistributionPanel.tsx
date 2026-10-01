import { AlertTriangle, Calendar } from "lucide-react";

import type { AgeBandRow } from "../../../hooks/useDashboardAnalytics";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-3 animate-pulse sm:px-6">
      <div className="h-3 w-12 rounded bg-[var(--pa-border)]" />
      <div className="h-2 flex-1 rounded-full bg-[var(--pa-border)]" />
      <div className="h-3 w-6 rounded bg-[var(--pa-border)]" />
    </div>
  );
}

export default function AgeDistributionPanel({
  bands,
  retirementSoonCount,
  loading,
  hasError,
}: {
  bands: AgeBandRow[];
  retirementSoonCount: number;
  loading: boolean;
  hasError: boolean;
}) {
  const total = bands.reduce((sum, b) => sum + b.count, 0);
  const maxCount = Math.max(...bands.map((b) => b.count), 1);

  return (
    <section
      className="flex h-[420px] flex-col overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
      aria-label="Age distribution"
    >
      <PanelHeader
        eyebrow="Demographics"
        title="Age distribution"
        description={
          loading
            ? "Loading…"
            : hasError
              ? "Data unavailable"
              : `Age bands across ${total} officer${total === 1 ? "" : "s"} with recorded dates of birth`
        }
        action={
          <StatusBadge tone={hasError ? "danger" : "success"}>
            {loading ? "Loading" : hasError ? "Unavailable" : "Live"}
          </StatusBadge>
        }
      />

      <div aria-live="polite" className="pa-scrollbar flex flex-1 min-h-0 flex-col overflow-y-auto">
        {loading ? (
          <div className="divide-y divide-[var(--pa-border)]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-[var(--pa-border)]">
            {bands.map((band) => {
              const pct = maxCount > 0 ? (band.count / maxCount) * 100 : 0;
              const isRetirementBand =
                band.band === "60+" || band.band === "50–59";
              return (
                <div
                  key={band.band}
                  className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--pa-canvas)] sm:px-6"
                >
                  <span className="pa-tabular w-12 shrink-0 text-[12px] font-extrabold text-[var(--pa-text)]">
                    {band.band}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--pa-surface-muted)]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isRetirementBand
                          ? "bg-[var(--pa-gold)]"
                          : "bg-[var(--pa-primary)]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="pa-tabular w-8 shrink-0 text-right text-[12px] font-bold text-[var(--pa-text)]">
                    {band.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Retirement warning badge */}
        {!loading && !hasError && retirementSoonCount > 0 && (
          <div className="mx-5 my-3 shrink-0 flex items-start gap-3 rounded-lg border border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)] px-4 py-2.5 sm:mx-6">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-[#735413]"
              aria-hidden="true"
            />
            <div>
              <div className="text-[12px] font-extrabold text-[#735413]">
                Retirement forecast
              </div>
              <p className="mt-0.5 text-[11px] leading-4 text-[#735413]/80">
                {retirementSoonCount}{" "}
                {retirementSoonCount === 1 ? "officer is" : "officers are"}{" "}
                aged 58 or above — within 2 years of statutory retirement
                age.
              </p>
            </div>
          </div>
        )}

        {!loading && !hasError && total === 0 && (
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-6 text-center">
            <Calendar
              size={22}
              className="text-[var(--pa-faint)]"
              aria-hidden="true"
            />
            <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
              No date of birth data
            </div>
          </div>
        )}
      </div>

      <footer className="mt-auto flex min-h-12 shrink-0 items-center justify-between border-t border-[var(--pa-border)] px-5 sm:px-6">
        <span className="text-[11px] font-bold text-[var(--pa-muted)]">
          Statutory retirement age: 60
        </span>
        <span className="pa-tabular text-[11px] font-semibold text-[var(--pa-faint)]">
          {total} {total === 1 ? "officer" : "officers"} with DOB
        </span>
      </footer>
    </section>
  );
}
