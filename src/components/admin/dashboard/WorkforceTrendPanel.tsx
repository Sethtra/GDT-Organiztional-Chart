import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Check,
  ChevronDown,
  Minus,
} from "lucide-react";

import { cn } from "../../../lib/utils";
import {
  aggregateTrendPeriodsToMaxPillars,
  sliceTrendYearRange,
  summarizeTrendRange,
  type WorkforceYear,
} from "../../../utils/workforceTrend";
import { PanelHeader } from "./DashboardPrimitives";

// Headcount line occupies the upper region; joined/departed bars sit in a
// separate band below so the two different scales are never read as one.
const LINE_TOP = 20;
const LINE_BOTTOM = 138;
const BAR_TOP = 166;
const BAR_BASELINE = 222;
const CHART_WIDTH = 720;
const PAD_X = 14;

function WorkforceYearRangePicker({
  years,
  startYear,
  endYear,
  onStartYearChange,
  onEndYearChange,
  disabled,
}: {
  years: number[];
  startYear: number | null;
  endYear: number | null;
  onStartYearChange: (year: number | null) => void;
  onEndYearChange: (year: number | null) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label =
    startYear !== null && endYear !== null
      ? `${startYear} – ${endYear}`
      : startYear !== null
        ? `${startYear} – Latest`
        : endYear !== null
          ? `Earliest – ${endYear}`
          : "All years";

  useEffect(() => {
    if (!open) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const chooseStart = (year: number | null) => {
    onStartYearChange(year);
    if (year !== null && endYear !== null && endYear < year) {
      onEndYearChange(year);
    }
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="pa-focus-ring inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--pa-border)] bg-[var(--pa-canvas)] px-2.5 text-[10.5px] font-extrabold text-[var(--pa-text)] transition-colors hover:border-[var(--pa-border-strong)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="dialog"
        aria-label="Filter headcount by year range"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarRange size={14} className="text-[var(--pa-primary)]" aria-hidden="true" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown
          size={13}
          className={`text-[var(--pa-muted)] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="dialog"
          aria-label="Headcount year range"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(90vw,320px)] overflow-hidden rounded-xl border border-[var(--pa-border)] bg-white shadow-[0_14px_32px_rgba(20,38,28,0.16)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--pa-border)] bg-[var(--pa-canvas)] px-3.5 py-2.5">
            <div>
              <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--pa-primary)]">
                Year range
              </div>
              <div className="mt-0.5 text-[11px] font-bold text-[var(--pa-text)]">{label}</div>
            </div>
            {(startYear !== null || endYear !== null) && (
              <button
                type="button"
                className="pa-focus-ring rounded-md px-2 py-1 text-[10px] font-extrabold text-[var(--pa-primary)] transition-colors hover:bg-[var(--pa-primary-soft)]"
                onClick={() => {
                  onStartYearChange(null);
                  onEndYearChange(null);
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 divide-x divide-[var(--pa-border)] p-2">
            {[
              {
                title: "From",
                value: startYear,
                onChange: chooseStart,
              },
              {
                title: "To",
                value: endYear,
                onChange: onEndYearChange,
              },
            ].map((column) => (
              <div key={column.title} className="min-w-0 px-1.5 first:pr-2.5 last:pl-2.5">
                <div className="mb-1.5 px-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                  {column.title}
                </div>
                <div className="max-h-48 overflow-y-auto pr-0.5">
                  <button
                    type="button"
                    className={cn(
                      "pa-focus-ring flex min-h-8 w-full items-center justify-between rounded-md px-2 text-left text-[10.5px] font-bold transition-colors hover:bg-[var(--pa-canvas)]",
                      column.value === null
                        ? "bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]"
                        : "text-[var(--pa-muted)]",
                    )}
                    onClick={() => column.onChange(null)}
                  >
                    Any year
                    {column.value === null && <Check size={13} aria-hidden="true" />}
                  </button>
                  {years.map((year) => {
                    const unavailable =
                      column.title === "To" && startYear !== null && year < startYear;
                    const selected = column.value === year;
                    return (
                      <button
                        key={`${column.title}-${year}`}
                        type="button"
                        disabled={unavailable}
                        className={cn(
                          "pa-focus-ring mt-0.5 flex min-h-8 w-full items-center justify-between rounded-md px-2 text-left text-[10.5px] font-bold transition-colors disabled:pointer-events-none disabled:opacity-25",
                          selected
                            ? "bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]"
                            : "text-[var(--pa-text)] hover:bg-[var(--pa-canvas)]",
                        )}
                        onClick={() => column.onChange(year)}
                      >
                        {year}
                        {selected && <Check size={13} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function endpointPositionPercent(index: number, count: number): number {
  return count === 1 ? 50 : (index / (count - 1)) * 100;
}

export default function WorkforceTrendPanel({
  years,
  loading,
  hasError,
}: {
  years: WorkforceYear[];
  loading: boolean;
  hasError: boolean;
}) {
  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);
  const yearOptions = useMemo(() => years.map(({ year }) => year), [years]);
  const selectedStartYear =
    startYear !== null && yearOptions.includes(startYear) ? startYear : null;
  const selectedEndYear =
    endYear !== null && yearOptions.includes(endYear) ? endYear : null;
  const sliced = useMemo(
    () => sliceTrendYearRange(years, selectedStartYear, selectedEndYear),
    [years, selectedStartYear, selectedEndYear],
  );
  const visible = useMemo(
    () => aggregateTrendPeriodsToMaxPillars(sliced),
    [sliced],
  );
  const summary = useMemo(() => summarizeTrendRange(visible), [visible]);

  const chart = useMemo(() => {
    if (visible.length === 0) return null;

    const usableWidth = CHART_WIDTH - PAD_X * 2;
    const slotWidth = usableWidth / visible.length;
    // A single year has no span to interpolate across, so it is centred.
    const xFor = (index: number) =>
      PAD_X + (endpointPositionPercent(index, visible.length) / 100) * usableWidth;

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

  const rangeLabel =
    selectedStartYear === null && selectedEndYear === null
      ? "All recorded years"
      : `${selectedStartYear ?? years[0]?.year ?? ""}-${selectedEndYear ?? years.at(-1)?.year ?? ""}`;
  const description = loading
    ? "Loading live workforce data…"
    : hasError
      ? "Live workforce data unavailable"
      : `${rangeLabel} · Grouped into up to five periods`;

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
          <WorkforceYearRangePicker
            years={yearOptions}
            startYear={selectedStartYear}
            endYear={selectedEndYear}
            onStartYearChange={setStartYear}
            onEndYearChange={setEndYear}
            disabled={loading || years.length === 0}
          />
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
                  Officer headcount, arrivals and departures by period
                </title>
                <desc id="workforce-chart-description">
                  {`${rangeLabel}. Headcount moves from ${visible[0]!.headcount} officers in ${visible[0]!.label ?? visible[0]!.year} to ${summary.headcount} in ${visible.at(-1)!.label ?? visible.at(-1)!.year}, with ${summary.joined} joining and ${summary.departed} departing over the period. Arrival and departure bars use their own scale, shown beneath the headcount line.`}
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
                      <title>{`${point.year.label ?? point.year.year}: ${point.year.headcount} serving`}</title>
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
                        <title>{`${bar.year.label ?? bar.year.year}: ${bar.year.joined} joined`}</title>
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
                        <title>{`${bar.year.label ?? bar.year.year}: ${bar.year.departed} departed`}</title>
                      </rect>
                    )}
                  </g>
                ))}
              </svg>
              <div
                className="relative -mt-1 h-4"
                style={{
                  marginLeft: `${(PAD_X / CHART_WIDTH) * 100}%`,
                  marginRight: `${(PAD_X / CHART_WIDTH) * 100}%`,
                }}
              >
                {visible.map((year, index) => (
                  <span
                    key={year.year}
                    className="absolute -translate-x-1/2 truncate whitespace-nowrap text-center text-[9px] font-semibold text-[var(--pa-faint)]"
                    style={{
                      left: `${endpointPositionPercent(index, visible.length)}%`,
                    }}
                  >
                    {year.label ?? year.year}
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
