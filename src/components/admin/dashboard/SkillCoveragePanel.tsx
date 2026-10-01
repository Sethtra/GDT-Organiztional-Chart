import { useEffect, useState } from "react";
import { Award, AlertCircle } from "lucide-react";

import type { PromotionReadiness } from "../../../contracts/hr";
import { listPromotionReadiness } from "../../../services/promotionReadinessService";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";

export default function SkillCoveragePanel() {
  const [data, setData] = useState<PromotionReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listPromotionReadiness()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setHasError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Officers that have a meaningful evaluation (not no_current_title / no_next_title)
  const evaluated = data.filter(
    (r) =>
      r.status === "ready" ||
      r.status === "not_ready" ||
      r.status === "not_configured",
  );
  const readyCount = data.filter((r) => r.status === "ready").length;
  const notReadyCount = data.filter((r) => r.status === "not_ready").length;
  const notConfiguredCount = data.filter(
    (r) => r.status === "not_configured",
  ).length;
  const totalEvaluated = evaluated.length;
  const compliancePct =
    totalEvaluated > 0 ? Math.round((readyCount / totalEvaluated) * 100) : 0;

  const tone =
    compliancePct >= 80 ? "success" : compliancePct >= 50 ? "warning" : "danger";

  return (
    <section
      className="flex h-[380px] flex-col overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
      aria-label="Skill coverage"
    >
      <PanelHeader
        eyebrow="Capability readiness"
        title="Skill coverage"
        description={
          loading
            ? "Checking skill compliance…"
            : hasError
              ? "Data unavailable"
              : `${totalEvaluated} officer${totalEvaluated === 1 ? "" : "s"} evaluated for promotion readiness`
        }
        action={
          <StatusBadge tone={hasError ? "danger" : "success"}>
            {loading ? "Loading" : hasError ? "Unavailable" : "Live"}
          </StatusBadge>
        }
      />

      <div aria-live="polite" className="pa-scrollbar flex flex-1 min-h-0 flex-col justify-between overflow-y-auto px-5 py-4 sm:px-6">
        {loading && (
          <div className="flex flex-1 min-h-0 items-center justify-center py-6 animate-pulse">
            <div className="h-16 w-16 rounded-full bg-[var(--pa-border)]" />
          </div>
        )}

        {!loading && hasError && (
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center text-center">
            <AlertCircle
              size={22}
              className="text-[var(--pa-danger)]"
              aria-hidden="true"
            />
            <p className="mt-3 text-[12px] font-semibold text-[var(--pa-muted)]">
              Could not load skill coverage data.
            </p>
          </div>
        )}

        {!loading && !hasError && totalEvaluated === 0 && (
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center text-center">
            <Award
              size={22}
              className="text-[var(--pa-faint)]"
              aria-hidden="true"
            />
            <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
              No evaluations
            </div>
            <p className="mt-1 text-[12px] leading-5 text-[var(--pa-muted)]">
              Configure skill requirements in Job Architecture.
            </p>
          </div>
        )}

        {!loading && !hasError && totalEvaluated > 0 && (
          <>
            {/* Big percentage */}
            <div className="flex items-center gap-5 my-auto py-2">
              <div className="relative flex size-20 shrink-0 items-center justify-center">
                <svg
                  viewBox="0 0 36 36"
                  className="size-20 -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="var(--pa-surface-muted)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke={
                      tone === "success"
                        ? "var(--pa-primary)"
                        : tone === "warning"
                          ? "var(--pa-gold)"
                          : "var(--pa-danger)"
                    }
                    strokeWidth="3"
                    strokeDasharray={`${compliancePct} ${100 - compliancePct}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[16px] font-extrabold text-[var(--pa-text)]">
                  {compliancePct}%
                </span>
              </div>
              <div>
                <div className="text-[13px] font-extrabold text-[var(--pa-text)]">
                  Promotion-ready
                </div>
                <p className="mt-1 text-[11px] leading-4 text-[var(--pa-muted)]">
                  Officers meeting all skill requirements for their next rank
                </p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[var(--pa-border)] bg-[var(--pa-border)]">
              <div className="bg-white px-3 py-2.5 text-center">
                <div className="pa-tabular text-[17px] font-extrabold text-[var(--pa-primary)]">
                  {readyCount}
                </div>
                <div className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--pa-muted)]">
                  Ready
                </div>
              </div>
              <div className="bg-white px-3 py-2.5 text-center">
                <div className="pa-tabular text-[17px] font-extrabold text-[var(--pa-danger)]">
                  {notReadyCount}
                </div>
                <div className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--pa-muted)]">
                  Not ready
                </div>
              </div>
              <div className="bg-white px-3 py-2.5 text-center">
                <div className="pa-tabular text-[17px] font-extrabold text-[var(--pa-faint)]">
                  {notConfiguredCount}
                </div>
                <div className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[var(--pa-muted)]">
                  No reqs
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="mt-auto flex min-h-12 shrink-0 items-center justify-between border-t border-[var(--pa-border)] px-5 sm:px-6">
        <span className="text-[11px] font-bold text-[var(--pa-muted)]">
          Readiness standard: 80%
        </span>
        <span className="pa-tabular text-[11px] font-semibold text-[var(--pa-faint)]">
          {readyCount} of {totalEvaluated} ready
        </span>
      </footer>
    </section>
  );
}
