import { Activity, AlertCircle, ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";

import type { ActivityEvent } from "../../../contracts/activityLog";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_TONES,
  getInitials,
} from "../../../contracts/activityLog";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";
import { cn } from "../../../lib/utils";

/** Relative human-readable timestamp from an ISO string. */
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex gap-3 py-4 animate-pulse">
      <div className="size-9 shrink-0 rounded-[9px] bg-[var(--pa-border)]" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-3 w-2/5 rounded bg-[var(--pa-border)]" />
        <div className="h-2.5 w-3/5 rounded bg-[var(--pa-border)]" />
        <div className="h-2 w-1/3 rounded bg-[var(--pa-border)]" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RecentActivityPanel({
  events,
  loading,
  hasError,
  query,
  onClearSearch,
}: {
  events: ActivityEvent[];
  loading: boolean;
  hasError: boolean;
  query: string;
  onClearSearch: () => void;
}) {
  // Filter by search query
  const filtered = query.trim()
    ? events.filter((e) =>
        [e.staffName, e.staffNameEn, e.description, e.departmentName, e.officeName]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(query.trim().toLowerCase())),
      )
    : events;

  // Dashboard widget: cap to 10
  const preview = filtered.slice(0, 10);

  const description = loading
    ? "Loading live activity…"
    : hasError
      ? "Activity data unavailable"
      : query
        ? `${filtered.length} matching update${filtered.length === 1 ? "" : "s"}`
        : "Latest changes across the administration";

  return (
    <section
      className="overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-5"
      aria-label="Recent activity"
    >
      <PanelHeader
        eyebrow="People operations"
        title="Recent activity"
        description={description}
        action={
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
            <Activity size={15} aria-hidden="true" />
          </div>
        }
      />

      {/* Loading skeleton */}
      {loading && (
        <div className="divide-y divide-[var(--pa-border)] px-5 sm:px-6">
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* Error state */}
      {!loading && hasError && (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
          <AlertCircle size={22} className="text-[var(--pa-danger)]" aria-hidden="true" />
          <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
            Activity data unavailable
          </div>
          <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-[var(--pa-muted)]">
            Live data could not be loaded. Check your connection and try refreshing.
          </p>
        </div>
      )}

      {/* Empty / no match state */}
      {!loading && !hasError && preview.length === 0 && (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
          <Search size={22} className="text-[var(--pa-faint)]" aria-hidden="true" />
          <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
            {query ? "No activity found" : "No recent activity"}
          </div>
          <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-[var(--pa-muted)]">
            {query
              ? "Try a person, department, action, or status."
              : "Actions will appear here as officers are created, transferred, or promoted."}
          </p>
          {query && (
            <button
              type="button"
              onClick={onClearSearch}
              className="pa-focus-ring mt-4 min-h-10 rounded-lg border border-[var(--pa-border)] px-3 text-[11px] font-extrabold text-[var(--pa-primary)]"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Activity list */}
      {!loading && !hasError && preview.length > 0 && (
        <>
          <div className="divide-y divide-[var(--pa-border)] px-5 sm:px-6">
            {preview.map((event) => {
              const initials = getInitials(event.staffName, event.staffNameEn);
              const tone = EVENT_TYPE_TONES[event.eventType];
              const label = EVENT_TYPE_LABELS[event.eventType];
              const location = [event.officeName, event.departmentName]
                .filter(Boolean)
                .join(" · ");

              return (
                <div key={event.id} className="flex gap-3 py-4">
                  {/* Avatar / initials */}
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-[9px] border text-[11px] font-extrabold",
                      tone === "success"
                        ? "border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]"
                        : tone === "warning"
                          ? "border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)] text-[#735413]"
                          : "border-[var(--pa-border)] bg-[var(--pa-canvas)] text-[var(--pa-primary)]",
                    )}
                  >
                    {event.photoUrl ? (
                      <img
                        src={event.photoUrl}
                        alt={event.staffName}
                        className="size-full rounded-[8px] object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[12px] font-extrabold text-[var(--pa-text)]">
                        {event.staffName}
                      </span>
                      <span className="pa-tabular text-[10px] font-semibold text-[var(--pa-faint)]">
                        {relativeTime(event.occurredAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-[var(--pa-muted)]">
                      {event.description}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {location && (
                        <span className="max-w-[220px] truncate text-[10px] font-medium text-[var(--pa-faint)]">
                          {location}
                        </span>
                      )}
                      <StatusBadge tone={tone}>{label}</StatusBadge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View all footer link */}
          <div className="border-t border-[var(--pa-border)] px-5 py-3 sm:px-6">
            <Link
              to="/admin/activity"
              className="pa-focus-ring inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-[var(--pa-primary)] no-underline transition-opacity hover:opacity-70"
            >
              View all activity
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
