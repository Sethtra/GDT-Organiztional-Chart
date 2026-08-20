import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "../../../lib/utils";
import {
  DASHBOARD_TRENDS,
  type TrendPeriod,
} from "./dashboardPreviewData";
import { PanelHeader } from "./DashboardPrimitives";

const PERIODS: TrendPeriod[] = ["30d", "90d", "12m"];
const MOVEMENT_SUMMARY = [
  ["New joiners", "54"],
  ["Internal moves", "31"],
  ["Departures", "14"],
];

export default function WorkforceTrendPanel({
  period,
  onPeriodChange,
}: {
  period: TrendPeriod;
  onPeriodChange: (period: TrendPeriod) => void;
}) {
  const trend = DASHBOARD_TRENDS[period];
  const chart = useMemo(() => {
    const chartWidth = 720;
    const chartTop = 24;
    const chartBottom = 190;
    const minValue = Math.min(...trend.values) - 20;
    const maxValue = Math.max(...trend.values) + 20;
    const usableWidth = chartWidth - 24;
    const points = trend.values.map((value, index) => {
      const x = 12 + (index * usableWidth) / (trend.values.length - 1);
      const ratio = (value - minValue) / (maxValue - minValue);
      const y = chartBottom - ratio * (chartBottom - chartTop);
      return { x, y };
    });
    const polyline = points.map(({ x, y }) => `${x},${y}`).join(" ");
    const area = `M ${points[0]?.x ?? 12} ${chartBottom} L ${points
      .map(({ x, y }) => `${x} ${y}`)
      .join(" L ")} L ${points.at(-1)?.x ?? chartWidth - 12} ${chartBottom} Z`;
    return { points, polyline, area };
  }, [trend]);

  return (
    <section
      id="workforce-trend"
      className="overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-8"
    >
      <PanelHeader
        eyebrow="Workforce movement"
        title="Headcount trend"
        description={`${trend.label} · Active officer records`}
        action={
          <div
            className="flex rounded-lg border border-[var(--pa-border)] bg-[var(--pa-canvas)] p-1"
            aria-label="Trend period"
          >
            {PERIODS.map((trendPeriod) => (
              <button
                key={trendPeriod}
                type="button"
                onClick={() => onPeriodChange(trendPeriod)}
                aria-pressed={period === trendPeriod}
                className={cn(
                  "pa-focus-ring h-9 min-w-10 rounded-md px-2.5 text-[10px] font-extrabold uppercase transition-colors",
                  period === trendPeriod
                    ? "bg-white text-[var(--pa-text)] shadow-sm"
                    : "text-[var(--pa-muted)] hover:text-[var(--pa-text)]",
                )}
              >
                {trendPeriod}
              </button>
            ))}
          </div>
        }
      />
      <div className="px-4 pb-5 pt-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="pa-tabular text-[24px] font-extrabold tracking-[-0.03em]">
              {trend.values.at(-1)?.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-[var(--pa-muted)]">
              Active officers today
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold text-[var(--pa-primary)]">
            <ArrowUpRight size={14} aria-hidden="true" />
            {trend.change}
          </div>
        </div>

        <div className="h-[236px] w-full">
          <svg
            viewBox="0 0 720 210"
            preserveAspectRatio="none"
            className="h-[205px] w-full overflow-visible"
            role="img"
            aria-labelledby="workforce-chart-title workforce-chart-description"
          >
            <title id="workforce-chart-title">Active workforce trend</title>
            <desc id="workforce-chart-description">
              Headcount rises from {trend.values[0]} to {trend.values.at(-1)}
              {" "}officers during {trend.label}.
            </desc>
            {[24, 65, 106, 147, 190].map((y) => (
              <line
                key={y}
                x1="12"
                y1={y}
                x2="708"
                y2={y}
                stroke="var(--pa-border)"
                strokeWidth="1"
                strokeDasharray="3 5"
                className="pa-chart-grid"
              />
            ))}
            <path d={chart.area} fill="var(--pa-primary-soft)" opacity="0.8" />
            <polyline
              points={chart.polyline}
              fill="none"
              stroke="var(--pa-primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pa-chart-line"
            />
            {chart.points.map((point, index) => {
              const isLast = index === chart.points.length - 1;
              return (
                <circle
                  key={`${period}-${point.x}`}
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? 5.5 : 3.5}
                  fill={isLast ? "var(--pa-gold)" : "var(--pa-surface)"}
                  stroke={isLast ? "var(--pa-surface)" : "var(--pa-primary)"}
                  strokeWidth={isLast ? 3 : 2}
                  className="pa-chart-line"
                />
              );
            })}
          </svg>
          <div className="-mt-1 grid grid-cols-7 gap-1 px-1">
            {trend.axis.map((label) => (
              <span
                key={label}
                className="truncate text-center text-[9px] font-semibold text-[var(--pa-faint)]"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-1 grid grid-cols-3 divide-x divide-[var(--pa-border)] border-t border-[var(--pa-border)] pt-4">
          {MOVEMENT_SUMMARY.map(([label, value]) => (
            <div key={label} className="min-w-0 px-2 first:pl-0 sm:px-3">
              <div className="pa-tabular text-[16px] font-extrabold text-[var(--pa-text)]">
                {value}
              </div>
              <div className="mt-1 text-[10px] font-semibold leading-4 text-[var(--pa-muted)]">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
