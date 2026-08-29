import { useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Link } from "react-router-dom";

import AdminFooter from "../components/admin/AdminFooter";
import AdminSidebar from "../components/admin/AdminSidebar";
import { StatusBadge } from "../components/admin/dashboard/DashboardPrimitives";
import { cn } from "../lib/utils";
import type { ActivityEvent, ActivityEventType } from "../contracts/activityLog";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_TONES,
  getInitials,
} from "../contracts/activityLog";
import { useRecentActivity } from "../hooks/useRecentActivity";

const PAGE_SIZE = 20;

const ALL_TYPES: ActivityEventType[] = [
  "officer_created",
  "promoted",
  "transferred",
  "assigned",
  "position_vacated",
  "profile_updated",
  "skills_updated",
];

/** Formats an ISO timestamp as a readable date + time. */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative human-readable timestamp. */
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

function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 border-b border-[var(--pa-border)] px-6 py-5 animate-pulse last:border-b-0">
      <div className="size-10 shrink-0 rounded-[10px] bg-[var(--pa-border)]" />
      <div className="flex-1 space-y-2.5 py-0.5">
        <div className="flex items-center gap-3">
          <div className="h-3 w-32 rounded bg-[var(--pa-border)]" />
          <div className="h-3 w-16 rounded bg-[var(--pa-border)]" />
        </div>
        <div className="h-2.5 w-56 rounded bg-[var(--pa-border)]" />
        <div className="h-2 w-40 rounded bg-[var(--pa-border)]" />
      </div>
      <div className="h-6 w-24 rounded-md bg-[var(--pa-border)]" />
    </div>
  );
}

function EventRow({ event }: { event: ActivityEvent }) {
  const initials = getInitials(event.staffName, event.staffNameEn);
  const tone = EVENT_TYPE_TONES[event.eventType];
  const label = EVENT_TYPE_LABELS[event.eventType];
  const location = [event.officeName, event.departmentName].filter(Boolean).join(" · ");

  return (
    <div className="flex items-start gap-4 border-b border-[var(--pa-border)] px-6 py-5 transition-colors hover:bg-[var(--pa-canvas)] last:border-b-0">
      {/* Avatar */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[10px] border text-[11.5px] font-extrabold",
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
            className="size-full rounded-[9px] object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-extrabold text-[var(--pa-text)]">
            {event.staffName}
          </span>
          {event.staffNameEn && event.staffNameEn !== event.staffName && (
            <span className="text-[11px] text-[var(--pa-muted)]">({event.staffNameEn})</span>
          )}
          <span
            className="pa-tabular text-[10.5px] font-semibold text-[var(--pa-faint)]"
            title={formatDateTime(event.occurredAt)}
          >
            {relativeTime(event.occurredAt)}
          </span>
        </div>
        <div className="mt-1 text-[12px] font-semibold text-[var(--pa-muted)]">
          {event.description}
        </div>
        {location && (
          <div className="mt-1 text-[10.5px] font-medium text-[var(--pa-faint)]">
            {location}
          </div>
        )}
      </div>

      {/* Badge + profile link */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <StatusBadge tone={tone}>{label}</StatusBadge>
        {event.staffId && (
          <Link
            to={`/admin/staff?profile=${event.staffId}`}
            className="pa-focus-ring text-[10.5px] font-bold text-[var(--pa-primary)] no-underline transition-opacity hover:opacity-70"
          >
            View profile →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AdminActivityPage() {
  const { events, loading, hasError } = useRecentActivity(15);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<ActivityEventType | "all">("all");
  const [page, setPage] = useState(1);

  // Filter
  const filtered = useMemo(() => {
    let result = events;
    if (activeType !== "all") {
      result = result.filter((e) => e.eventType === activeType);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((e) =>
        [e.staffName, e.staffNameEn, e.description, e.departmentName, e.officeName]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [events, activeType, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when filters change
  const handleTypeChange = (t: ActivityEventType | "all") => {
    setActiveType(t);
    setPage(1);
  };
  const handleQueryChange = (q: string) => {
    setQuery(q);
    setPage(1);
  };

  return (
    <div className="admin-dashboard-test flex h-dvh overflow-hidden bg-[var(--pa-canvas)]">
      {/* Sidebar */}
      <aside className="hidden h-full w-[240px] shrink-0 flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] lg:flex">
        <AdminSidebar currentTab="activity" />
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Page header */}
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--pa-border)] bg-white px-5 py-4 sm:px-7">
          <Link
            to="/admin"
            className="pa-focus-ring flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--pa-border)] text-[var(--pa-muted)] no-underline transition-colors hover:bg-[var(--pa-canvas)]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={14} aria-hidden="true" />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
              <Activity size={14} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold tracking-[-0.02em] text-[var(--pa-text)]">
                Recent activity
              </h1>
              <p className="text-[11px] text-[var(--pa-muted)]">15-day rolling log</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full max-w-[280px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pa-muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              role="searchbox"
              aria-label="Search activity log"
              placeholder="Search by officer or action…"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--pa-border)] bg-[var(--pa-canvas)] pl-8 pr-8 text-[12px] text-[var(--pa-text)] placeholder:text-[var(--pa-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--pa-primary)]/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--pa-muted)] hover:text-[var(--pa-text)]"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </header>

        <main className="pa-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-7 lg:px-10">

            {/* Filter chips */}
            <div
              className="mb-5 flex flex-wrap gap-2"
              role="group"
              aria-label="Filter by event type"
            >
              <button
                type="button"
                onClick={() => handleTypeChange("all")}
                aria-pressed={activeType === "all"}
                className={cn(
                  "pa-focus-ring inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-bold transition-colors",
                  activeType === "all"
                    ? "border-[var(--pa-primary)] bg-[var(--pa-primary)] text-white"
                    : "border-[var(--pa-border)] bg-white text-[var(--pa-muted)] hover:border-[var(--pa-primary)] hover:text-[var(--pa-primary)]",
                )}
              >
                All events
              </button>
              {ALL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  aria-pressed={activeType === type}
                  className={cn(
                    "pa-focus-ring inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-bold transition-colors",
                    activeType === type
                      ? "border-[var(--pa-primary)] bg-[var(--pa-primary)] text-white"
                      : "border-[var(--pa-border)] bg-white text-[var(--pa-muted)] hover:border-[var(--pa-primary)] hover:text-[var(--pa-primary)]",
                  )}
                >
                  {EVENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>

            {/* Summary bar */}
            {!loading && !hasError && (
              <div className="mb-4 text-[11.5px] font-semibold text-[var(--pa-muted)]">
                {filtered.length === 0
                  ? "No events match your filters"
                  : `${filtered.length} event${filtered.length === 1 ? "" : "s"} · Page ${safePage} of ${totalPages}`}
              </div>
            )}

            {/* Log card */}
            <div className="overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]">

              {/* Loading */}
              {loading && (
                <>
                  {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonRow key={i} />)}
                </>
              )}

              {/* Error */}
              {!loading && hasError && (
                <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                  <AlertCircle size={26} className="text-[var(--pa-danger)]" aria-hidden="true" />
                  <div className="mt-3 text-[14px] font-extrabold text-[var(--pa-text)]">
                    Activity data unavailable
                  </div>
                  <p className="mt-1.5 max-w-[280px] text-[12px] leading-5 text-[var(--pa-muted)]">
                    Live data could not be loaded. Check your connection and refresh the page.
                  </p>
                </div>
              )}

              {/* Empty */}
              {!loading && !hasError && paginated.length === 0 && (
                <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                  <Search size={26} className="text-[var(--pa-faint)]" aria-hidden="true" />
                  <div className="mt-3 text-[14px] font-extrabold text-[var(--pa-text)]">
                    {query || activeType !== "all" ? "No matching events" : "No recent activity"}
                  </div>
                  <p className="mt-1.5 max-w-[280px] text-[12px] leading-5 text-[var(--pa-muted)]">
                    {query || activeType !== "all"
                      ? "Try adjusting your search or filter."
                      : "Events will appear here as HR actions are performed."}
                  </p>
                  {(query || activeType !== "all") && (
                    <button
                      type="button"
                      onClick={() => { handleQueryChange(""); handleTypeChange("all"); }}
                      className="pa-focus-ring mt-4 min-h-9 rounded-lg border border-[var(--pa-border)] px-3 text-[11px] font-extrabold text-[var(--pa-primary)]"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {/* Event rows */}
              {!loading && !hasError && paginated.length > 0 && (
                paginated.map((event) => <EventRow key={event.id} event={event} />)
              )}
            </div>

            {/* Pagination */}
            {!loading && !hasError && totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                  className="pa-focus-ring flex h-9 items-center gap-1.5 rounded-lg border border-[var(--pa-border)] px-3 text-[11.5px] font-bold text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-canvas)] disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  Previous
                </button>
                <span className="text-[11.5px] font-semibold text-[var(--pa-muted)]">
                  Page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  aria-label="Next page"
                  className="pa-focus-ring flex h-9 items-center gap-1.5 rounded-lg border border-[var(--pa-border)] px-3 text-[11.5px] font-bold text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-canvas)] disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </main>

        <AdminFooter />
      </div>
    </div>
  );
}
