import { useState } from "react";
import { Activity, AlertCircle, Building2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link } from "react-router-dom";

import type { ActivityEvent } from "../../../contracts/activityLog";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_TONES,
  getInitials,
} from "../../../contracts/activityLog";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";
import { cn } from "../../../lib/utils";

const PAGE_SIZE = 4;

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
    <div className="flex items-center justify-between gap-3 py-3 animate-pulse">
      <div className="flex min-w-0 items-center gap-3">
        <div className="size-9 shrink-0 rounded-[9px] bg-[var(--pa-border)]" />
        <div className="space-y-1.5 py-0.5">
          <div className="h-3 w-28 rounded bg-[var(--pa-border)]" />
          <div className="h-2.5 w-36 rounded bg-[var(--pa-border)]" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-5 w-20 rounded-full bg-[var(--pa-border)]" />
        <div className="h-2.5 w-24 rounded bg-[var(--pa-border)]" />
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
  const [page, setPage] = useState(1);

  // Filter by search query
  const filtered = query.trim()
    ? events.filter((e) =>
        [e.staffName, e.staffNameEn, e.description, e.departmentName, e.officeName]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(query.trim().toLowerCase())),
      )
    : events;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleEvents = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const paginationDisabled = loading || hasError || filtered.length === 0;

  const description = loading
    ? "Loading live activity…"
    : hasError
      ? "Activity data unavailable"
      : query
        ? `${filtered.length} matching update${filtered.length === 1 ? "" : "s"}`
        : "Latest changes across the administration";

  return (
    <section
      className="scroll-mt-20 flex flex-col overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-5 xl:self-stretch"
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

      <div aria-live="polite" className="flex flex-1 flex-col bg-white">
        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-[var(--pa-border)] px-5 sm:px-6">
            {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* Error state */}
        {!loading && hasError && (
          <div className="flex flex-1 min-h-[220px] flex-col items-center justify-center px-6 text-center">
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
        {!loading && !hasError && visibleEvents.length === 0 && (
          <div className="flex flex-1 min-h-[220px] flex-col items-center justify-center px-6 text-center">
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
        {!loading && !hasError && visibleEvents.length > 0 && (
          <div className="flex flex-1 flex-col">
            <ul className="divide-y divide-[var(--pa-border)] px-5 sm:px-6">
              {visibleEvents.map((event) => {
                const initials = getInitials(event.staffName, event.staffNameEn);
                const tone = EVENT_TYPE_TONES[event.eventType];
                const label = EVENT_TYPE_LABELS[event.eventType];
                const location = [event.officeName, event.departmentName]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={event.id} className="flex items-center justify-between gap-3 py-3">
                    {/* Left: Avatar + Staff Info */}
                    <div className="flex min-w-0 items-center gap-3">
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
                        ) : event.eventType === "unit_created" || event.eventType === "unit_updated" ? (
                          <Building2 size={16} aria-hidden="true" />
                        ) : (
                          initials
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="text-[12px] font-extrabold text-[var(--pa-text)]">
                            {event.staffName}
                          </span>
                          <span className="pa-tabular text-[10px] font-semibold text-[var(--pa-faint)]">
                            {relativeTime(event.occurredAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium text-[var(--pa-muted)]">
                          {event.description}
                        </div>
                      </div>
                    </div>

                    {/* Right: Badge on top, Department below */}
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                      <StatusBadge tone={tone}>{label}</StatusBadge>
                      {location && (
                        <span className="max-w-[200px] truncate text-[10px] font-medium text-[var(--pa-faint)]">
                          {location}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <footer className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center border-t border-[var(--pa-border)] px-5 sm:px-6">
        <span aria-hidden="true" />
        <nav
          aria-label="Recent activity pages"
          className="flex items-center justify-center gap-1"
        >
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={paginationDisabled || currentPage === 1}
            className="pa-focus-ring grid size-8 place-items-center rounded-md text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-canvas)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Previous recent activity page"
            title="Previous page"
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <span className="pa-tabular min-w-12 text-center text-[10.5px] font-bold text-[var(--pa-muted)]">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((value) => Math.min(totalPages, value + 1))
            }
            disabled={paginationDisabled || currentPage === totalPages}
            className="pa-focus-ring grid size-8 place-items-center rounded-md text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-canvas)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Next recent activity page"
            title="Next page"
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </nav>
        <Link
          to="/admin/activity"
          className="pa-focus-ring inline-flex min-h-10 items-center gap-1 justify-self-end rounded-md text-[11px] font-extrabold text-[var(--pa-primary)] no-underline"
          aria-label="View all activity"
        >
          View all
          <ChevronRight size={13} aria-hidden="true" />
        </Link>
      </footer>
    </section>
  );
}
