import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "../../../lib/utils";
import {
  sliceTrendRange,
  summarizeTrendRange,
  TREND_RANGE_LABELS,
  TREND_RANGES,
  type TrendRange,
  type WorkforceYear,
} from "../../../utils/workforceTrend";
import { PanelHeader } from "./DashboardPrimitives";

const RANGE_BUTTON_LABELS: Record<TrendRange, string> = {
  "5y": "5Y",
  "10y": "10Y",
  all: "All",
};

// Headcount line occupies the upper region; joined/departed bars sit in a
// separate band below so the two different scales are never read as one.
const LINE_TOP = 20;
const LINE_BOTTOM = 138;
const BAR_TOP = 166;
const BAR_BASELINE = 222;
const CHART_WIDTH = 720;
const PAD_X = 14;

export default function WorkforceTrendPanel({
  years,
  range,
  onRangeChange,
  loading,
  hasError,
}: {
  years: WorkforceYear[];
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  loading: boolean;
  hasError: boolean;
}) {
  const visible = useMemo(() => sliceTrendRange(years, range), [years, range]);
  const summary = useMemo(() => summarizeTrendRange(visible), [visible]);

  const chart = useMemo(() => {
    if (visible.length === 0) return null;

    const usableWidth = CHART_WIDTH - PAD_X * 2;
    const slotWidth = usableWidth / visible.length;
    // A single year has no span to interpolate across, so it is centred.
    const xFor = (index: number) =>
      visible.length === 1
        ? CHART_WIDTH / 2
        : PAD_X + (index * usableWidth) / (visible.length - 1);

    const headcounts = visible.map((year) => year.headcount);
    const minValue = Math.min(...headcounts);
    const maxValue = Math.max(...headcounts);
    // Pad the domain so a flat series renders mid-band instead of dividing by 0.
    const padding = Math.max(10, Math.round((maxValue - minValue) * 0.15));
    const domainMin = Math.max(0, minValue - padding);
    const domainMax = maxValue + padding;
    const span = domainMax - domainMin || 1;

    const points = visible.map((year, index) => ({
      x: xFor(index),
      y: LINE_BOTTOM - ((year.headcount - domainMin) / span) * (LINE_BOTTOM - LINE_TOP),
      year,
    }));

    const polyline = points.map(({ x, y }) => `${x},${y}`).join(" ");
    const area =
      points.length === 1
        ? ""
        : `M ${points[0]!.x} ${LINE_BOTTOM} L ${points
            .map(({ x, y }) => `${x} ${y}`)
            .join(" L ")} L ${points.at(-1)!.x} ${LINE_BOTTOM} Z`;

    const movementMax = Math.max(
      1,
      ...visible.map((year) => Math.max(year.joined, year.departed)),
    );
    const barWidth = Math.min(16, Math.max(3, slotWidth * 0.28));
    const barHeight = (value: number) =>
      value === 0 ? 0 : Math.max(2, (value / movementMax) * (BAR_BASELINE - BAR_TOP));

    const bars = visible.map((year, index) => {
      const centre = xFor(index);
      const joinedHeight = barHeight(year.joined);
      const departedHeight = barHeight(year.departed);
      return {
        year,
        joined: {
          x: centre - barWidth - 1,
          y: BAR_BASELINE - joinedHeight,
          height: joinedHeight,
        },
        departed: {
          x: centre + 1,
          y: BAR_BASELINE - departedHeight,
          height: departedHeight,
        },
      };
    });

    return { points, polyline, area, bars, barWidth, domainMin, domainMax };
  }, [visible]);

  const rangeLabel = TREND_RANGE_LABELS[range];
  const description = loading
    ? "Loading live workforce data…"
    : hasError
      ? "Live workforce data unavailable"
      : `${rangeLabel} · Derived from officer joined and departure dates`;

  const NetIcon =
    summary.net > 0 ? ArrowUpRight : summary.net < 0 ? ArrowDownRight : Minus;
  const netTone =
    summary.net > 0
      ? "text-[var(--pa-primary)]"
      : summary.net < 0
        ? "text-[var(--pa-danger)]"
        : "text-[var(--pa-muted)]";
  const netLabel = `${summary.net > 0 ? "+" : ""}${summary.net.toLocaleString("en-US")} officers`;

  const showChart = !loading && !hasError && chart !== null;

  return (
    <section
      id="workforce-trend"
      className="overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-8"
      aria-busy={loading}
    >
      <PanelHeader
        eyebrow="Workforce movement"
        title="Headcount trend"
        description={description}
        action={
          <div
            className="flex rounded-lg border border-[var(--pa-border)] bg-[var(--pa-canvas)] p-1"
            aria-label="Trend range"
          >
            {TREND_RANGES.map((trendRange) => (
              <button
                key={trendRange}
                type="button"
                onClick={() => onRangeChange(trendRange)}
                aria-pressed={range === trendRange}
                className={cn(
                  "pa-focus-ring h-9 min-w-10 rounded-md px-2.5 text-[10px] font-extrabold uppercase transition-colors",
                  range === trendRange
                    ? "bg-white text-[var(--pa-text)] shadow-sm"
                    : "text-[var(--pa-muted)] hover:text-[var(--pa-text)]",
                )}
              >
                {RANGE_BUTTON_LABELS[trendRange]}
              </button>
            ))}
          </div>
        }
      />
      <div className="px-4 pb-5 pt-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="pa-tabular text-[24px] font-extrabold tracking-[-0.03em]">
              {loading || hasError
                ? "—"
                : summary.headcount.toLocaleString("en-US")}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-[var(--pa-muted)]">
              Officers serving today
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--pa-muted)]">
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-sm bg-[var(--pa-primary)]"
                  aria-hidden="true"
                />
                Joined
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-sm bg-[var(--pa-danger)]"
                  aria-hidden="true"
                />
                Departed
              </span>
            </div>
            {!loading && !hasError && (
              <div
                className={cn(
                  "flex items-center gap-2 text-[11px] font-extrabold",
                  netTone,
                )}
              >
                <NetIcon size={14} aria-hidden="true" />
                {netLabel}
              </div>
            )}
          </div>
        </div>

        <div className="h-[262px] w-full">
          {showChart ? (
            <>
              <svg
                viewBox="0 0 720 232"
                preserveAspectRatio="none"
                className="h-[228px] w-full overflow-visible"
                role="img"
                aria-labelledby="workforce-chart-title workforce-chart-description"
              >
                <title id="workforce-chart-title">
                  Officer headcount, arrivals and departures by year
                </title>
                <desc id="workforce-chart-description">
                  {`${rangeLabel}. Headcount moves from ${visible[0]!.headcount} officers in ${visible[0]!.year} to ${summary.headcount} in ${visible.at(-1)!.year}, with ${summary.joined} joining and ${summary.departed} departing over the period. Arrival and departure bars use their own scale, shown beneath the headcount line.`}
                </desc>

                {[LINE_TOP, 49, 79, 108, LINE_BOTTOM].map((y) => (
                  <line
                    key={y}
                    x1={PAD_X}
                    y1={y}
                    x2={CHART_WIDTH - PAD_X}
                    y2={y}
                    stroke="var(--pa-border)"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    className="pa-chart-grid"
                  />
                ))}

                {chart.area && (
                  <path
                    d={chart.area}
                    fill="var(--pa-primary-soft)"
                    opacity="0.8"
                  />
                )}
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
                      key={`headcount-${point.year.year}`}
                      cx={point.x}
                      cy={point.y}
                      r={isLast ? 5.5 : 3.5}
                      fill={isLast ? "var(--pa-gold)" : "var(--pa-surface)"}
                      stroke={isLast ? "var(--pa-surface)" : "var(--pa-primary)"}
                      strokeWidth={isLast ? 3 : 2}
                      className="pa-chart-line"
                    >
                      <title>{`${point.year.year}: ${point.year.headcount} serving`}</title>
                    </circle>
                  );
                })}

                <line
                  x1={PAD_X}
                  y1={BAR_BASELINE}
                  x2={CHART_WIDTH - PAD_X}
                  y2={BAR_BASELINE}
                  stroke="var(--pa-border)"
                  strokeWidth="1"
                />
                {chart.bars.map((bar) => (
                  <g key={`movement-${bar.year.year}`}>
                    {bar.joined.height > 0 && (
                      <rect
                        x={bar.joined.x}
                        y={bar.joined.y}
                        width={chart.barWidth}
                        height={bar.joined.height}
                        rx="1.5"
                        fill="var(--pa-primary)"
                      >
                        <title>{`${bar.year.year}: ${bar.year.joined} joined`}</title>
                      </rect>
                    )}
                    {bar.departed.height > 0 && (
                      <rect
                        x={bar.departed.x}
                        y={bar.departed.y}
                        width={chart.barWidth}
                        height={bar.departed.height}
                        rx="1.5"
                        fill="var(--pa-danger)"
                      >
                        <title>{`${bar.year.year}: ${bar.year.departed} departed`}</title>
                      </rect>
                    )}
                  </g>
                ))}
              </svg>
              <div
                className="-mt-1 grid gap-1 px-1"
                style={{
                  gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))`,
                }}
              >
                {visible.map((year) => (
                  <span
                    key={year.year}
                    className="truncate text-center text-[9px] font-semibold text-[var(--pa-faint)]"
                  >
                    {year.year}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[var(--pa-border)] text-[11.5px] font-semibold text-[var(--pa-muted)]">
              {loading
                ? "Loading headcount timeline…"
                : hasError
                  ? "Headcount timeline unavailable"
                  : "No joined or departure dates recorded yet"}
            </div>
          )}
        </div>

        <div className="mt-1 grid grid-cols-3 divide-x divide-[var(--pa-border)] border-t border-[var(--pa-border)] pt-4">
          {[
            ["New joiners", summary.joined],
            ["Departures", summary.departed],
            ["Net change", summary.net],
          ].map(([label, value]) => (
            <div key={label as string} className="min-w-0 px-2 first:pl-0 sm:px-3">
              <div className="pa-tabular text-[16px] font-extrabold text-[var(--pa-text)]">
                {loading || hasError
                  ? "—"
                  : `${label === "Net change" && (value as number) > 0 ? "+" : ""}${(value as number).toLocaleString("en-US")}`}
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
