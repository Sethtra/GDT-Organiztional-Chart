import { ArrowDownRight, ArrowUpRight, UserRound } from "lucide-react";

import type { RecentMovement } from "../../../hooks/useDashboardAnalytics";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 animate-pulse">
      <div className="size-8 shrink-0 rounded-full bg-[var(--pa-border)]" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-28 rounded bg-[var(--pa-border)]" />
        <div className="h-2.5 w-40 rounded bg-[var(--pa-border)]" />
      </div>
      <div className="h-3 w-16 rounded bg-[var(--pa-border)]" />
    </div>
  );
}

function MovementRow({ item }: { item: RecentMovement }) {
  const isJoined = item.type === "joined";
  return (
    <div className="flex items-center gap-3 py-3 transition-colors">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${
          isJoined
            ? "border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]"
            : "border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] text-[var(--pa-danger)]"
        }`}
      >
        {isJoined ? (
          <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
        ) : (
          <ArrowDownRight size={14} strokeWidth={2} aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-extrabold text-[var(--pa-text)]">
          {item.name}
        </div>
        {item.department && (
          <div className="truncate text-[10px] text-[var(--pa-faint)]">
            {item.department}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <StatusBadge tone={isJoined ? "success" : "danger"} dot={false}>
          {isJoined ? "Joined" : "Departed"}
        </StatusBadge>
        <div className="pa-tabular mt-1 text-[10px] font-medium text-[var(--pa-faint)]">
          {formatDate(item.date)}
        </div>
      </div>
    </div>
  );
}

export default function RecentMovementPanel({
  joiners,
  departures,
  loading,
  hasError,
}: {
  joiners: RecentMovement[];
  departures: RecentMovement[];
  loading: boolean;
  hasError: boolean;
}) {
  // Merge and sort by date, most recent first — cap at 8
  const merged = [...joiners, ...departures]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <section
      className="flex h-[380px] flex-col overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
      aria-label="Recent staff movement"
    >
      <PanelHeader
        eyebrow="Personnel movement"
        title="Recent joiners & departures"
        description={
          loading
            ? "Loading…"
            : hasError
              ? "Data unavailable"
              : `${joiners.length} joined, ${departures.length} departed in last 90 days`
        }
        action={
          <StatusBadge tone={hasError ? "danger" : "info"}>
            {loading
              ? "Loading"
              : hasError
                ? "Unavailable"
                : "Last 90 days"}
          </StatusBadge>
        }
      />

      <div
        aria-live="polite"
        className="pa-scrollbar flex flex-1 min-h-0 flex-col overflow-y-auto px-5 sm:px-6"
      >
        {loading && (
          <div className="divide-y divide-[var(--pa-border)]">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {!loading && !hasError && merged.length === 0 && (
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center text-center">
            <UserRound
              size={22}
              className="text-[var(--pa-faint)]"
              aria-hidden="true"
            />
            <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
              No recent movement
            </div>
            <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-[var(--pa-muted)]">
              No officers joined or departed in the last 90 days.
            </p>
          </div>
        )}

        {!loading && !hasError && merged.length > 0 && (
          <div className="divide-y divide-[var(--pa-border)]">
            {merged.map((item) => (
              <MovementRow key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </div>

      <footer className="mt-auto flex min-h-12 shrink-0 items-center justify-between border-t border-[var(--pa-border)] px-5 sm:px-6">
        <span className="text-[11px] font-bold text-[var(--pa-muted)]">
          {merged.length} movement event{merged.length === 1 ? "" : "s"}
        </span>
        <span className="text-[11px] font-semibold text-[var(--pa-faint)]">
          Last 90 days
        </span>
      </footer>
    </section>
  );
}
