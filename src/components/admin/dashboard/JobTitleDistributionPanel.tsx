import { useState } from "react";
import { BriefcaseBusiness, ChevronLeft, ChevronRight } from "lucide-react";

import type { JobTitleRow } from "../../../hooks/useDashboardAnalytics";
import { cn } from "../../../lib/utils";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";

const PAGE_SIZE = 5;

function TitleBar({ count, max }: { count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--pa-surface-muted)]">
      <div
        className="h-full rounded-full bg-[var(--pa-primary)] transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-3 animate-pulse sm:px-6">
      <div className="h-3 w-36 rounded bg-[var(--pa-border)]" />
      <div className="h-1.5 flex-1 rounded-full bg-[var(--pa-border)]" />
      <div className="h-3 w-6 rounded bg-[var(--pa-border)]" />
    </div>
  );
}

export default function JobTitleDistributionPanel({
  rows,
  loading,
  hasError,
}: {
  rows: JobTitleRow[];
  loading: boolean;
  hasError: boolean;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const maxCount = rows.length > 0 ? rows[0]!.count : 1;
  const paginationDisabled = loading || hasError || rows.length === 0;

  return (
    <section
      className="flex h-[390px] flex-col overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
      aria-label="Job title distribution"
    >
      <PanelHeader
        eyebrow="Position analytics"
        title="Officers by job title"
        description={
          loading
            ? "Loading…"
            : hasError
              ? "Data unavailable"
              : `${rows.length} active job title${rows.length === 1 ? "" : "s"}`
        }
        action={
          <StatusBadge tone={hasError ? "danger" : "success"}>
            {loading ? "Loading" : hasError ? "Unavailable" : "Live"}
          </StatusBadge>
        }
      />

      <div aria-live="polite" className="pa-scrollbar flex flex-1 min-h-0 flex-col overflow-y-auto">
        {!loading && !hasError && rows.length === 0 && (
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-6 text-center">
            <BriefcaseBusiness
              size={22}
              className="text-[var(--pa-faint)]"
              aria-hidden="true"
            />
            <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
              No job titles found
            </div>
            <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-[var(--pa-muted)]">
              Add job titles in the Job Architecture page.
            </p>
          </div>
        )}

        {loading ? (
          <div className="divide-y divide-[var(--pa-border)]">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-[var(--pa-border)]">
            {visible.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--pa-canvas)] sm:px-6"
              >
                <div className="min-w-0 shrink-0 w-[140px] sm:w-[180px]">
                  <div className="truncate text-[12px] font-extrabold text-[var(--pa-text)]">
                    {row.name}
                  </div>
                  {row.nameEn && (
                    <div className="truncate text-[10px] text-[var(--pa-faint)]">
                      {row.nameEn}
                    </div>
                  )}
                </div>
                <TitleBar count={row.count} max={maxCount} />
                <span className="pa-tabular w-8 shrink-0 text-right text-[12px] font-bold text-[var(--pa-text)]">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with pagination */}
      <footer className="mt-auto flex min-h-12 shrink-0 items-center justify-center border-t border-[var(--pa-border)] px-5">
        <nav
          aria-label="Job title pages"
          className="flex items-center gap-1"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={paginationDisabled || currentPage === 1}
            className="pa-focus-ring grid size-8 place-items-center rounded-md text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-canvas)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Previous page"
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <span className="pa-tabular min-w-12 text-center text-[10.5px] font-bold text-[var(--pa-muted)]">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={paginationDisabled || currentPage === totalPages}
            className={cn(
              "pa-focus-ring grid size-8 place-items-center rounded-md text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-canvas)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-35",
            )}
            aria-label="Next page"
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </nav>
      </footer>
    </section>
  );
}
