import { UserRound, UserRoundCheck, UsersRound } from "lucide-react";

import type { WorkforceMetrics } from "../../../hooks/useWorkforceMetrics";
import { cn } from "../../../lib/utils";
import {
  DASHBOARD_ACTIONS_KPI,
  type DashboardKpi,
} from "./dashboardPreviewData";
import { StatusBadge } from "./DashboardPrimitives";

interface DashboardMetricGridProps {
  metrics: WorkforceMetrics;
  loading: boolean;
  hasError: boolean;
}

function formatPercentage(count: number, total: number): string {
  if (total === 0) return "0%";
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format((count / total) * 100)}%`;
}

export default function DashboardMetricGrid({
  metrics,
  loading,
  hasError,
}: DashboardMetricGridProps) {
  const liveValue = (value: number) =>
    loading || hasError ? "—" : value.toLocaleString("en-US");
  const liveBadge = (count?: number) => {
    if (loading) return "Loading";
    if (hasError) return "Unavailable";
    return count === undefined
      ? "Live"
      : formatPercentage(count, metrics.total);
  };
  const liveDetail = (label: string) => {
    if (loading) return "Loading live workforce data…";
    if (hasError) return "Live workforce data unavailable";
    return label;
  };
  const liveTone = loading ? "neutral" : hasError ? "danger" : "success";

  const kpis: DashboardKpi[] = [
    {
      label: "Total workforce",
      value: liveValue(metrics.total),
      detail: liveDetail("Active officer records"),
      badge: liveBadge(),
      tone: liveTone,
      icon: UsersRound,
    },
    {
      label: "Male officers",
      value: liveValue(metrics.male),
      detail: liveDetail("Active male officer records"),
      badge: liveBadge(metrics.male),
      tone: loading || hasError ? liveTone : "info",
      icon: UserRoundCheck,
    },
    {
      label: "Female officers",
      value: liveValue(metrics.female),
      detail: liveDetail("Active female officer records"),
      badge: liveBadge(metrics.female),
      tone: loading || hasError ? liveTone : "info",
      icon: UserRound,
    },
    DASHBOARD_ACTIONS_KPI,
  ];

  return (
    <section
      className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-[var(--pa-border)] shadow-[var(--pa-shadow)] xl:grid-cols-4"
      aria-label="Key workforce metrics"
      aria-busy={loading}
    >
      {kpis.map((item) => {
        const Icon = item.icon;
        return (
          <article
            key={item.label}
            className={cn(
              "relative min-w-0 bg-white p-4 sm:p-5",
              item.highlighted && "bg-[#fffcf4]",
            )}
          >
            {item.highlighted && (
              <span
                className="absolute inset-x-0 top-0 h-0.5 bg-[var(--pa-gold)]"
                aria-hidden="true"
              />
            )}
            <div className="mb-4 flex min-w-0 items-start justify-between gap-2 sm:mb-5 sm:gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
                <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
              </div>
              <StatusBadge tone={item.tone}>{item.badge}</StatusBadge>
            </div>
            <div className="text-[10px] font-extrabold uppercase leading-4 tracking-[0.075em] text-[var(--pa-muted)] sm:text-[11px]">
              {item.label}
            </div>
            <div className="pa-tabular mt-2 text-[26px] font-extrabold leading-none tracking-[-0.04em] text-[var(--pa-text)] sm:text-[30px]">
              {item.value}
            </div>
            <p className="mt-3 text-[11px] font-medium leading-4 text-[var(--pa-faint)]">
              {item.detail}
            </p>
          </article>
        );
      })}
    </section>
  );
}
