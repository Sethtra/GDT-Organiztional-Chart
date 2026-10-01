import { useState } from "react";
import { ChevronLeft, ChevronRight, UsersRound } from "lucide-react";

import type { GenderByDepartmentRow } from "../../../hooks/useDashboardAnalytics";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";

const PAGE_SIZE = 5;

function GenderBar({ male, female, other, total }: GenderByDepartmentRow) {
  if (total === 0) return <div className="h-2.5 flex-1 rounded-full bg-[var(--pa-surface-muted)]" />;
  const malePct = (male / total) * 100;
  const femalePct = (female / total) * 100;
  return (
    <div
      className="flex h-2.5 flex-1 overflow-hidden rounded-full"
      role="img"
      aria-label={`${male} male, ${female} female${other > 0 ? `, ${other} other` : ""}`}
    >
      <div
        className="h-full bg-[var(--pa-info)] transition-all duration-500"
        style={{ width: `${malePct}%` }}
      />
      <div
        className="h-full bg-[var(--pa-gold)] transition-all duration-500"
        style={{ width: `${femalePct}%` }}
      />
      {other > 0 && (
        <div
          className="h-full bg-[var(--pa-border)] transition-all duration-500"
          style={{ width: `${((other / total) * 100)}%` }}
        />
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 animate-pulse sm:px-6">
      <div className="h-3 w-28 rounded bg-[var(--pa-border)]" />
      <div className="h-2.5 flex-1 rounded-full bg-[var(--pa-border)]" />
      <div className="h-3 w-16 rounded bg-[var(--pa-border)]" />
    </div>
  );
}

export default function GenderByDepartmentPanel({
  rows,
  loading,
  hasError,
}: {
  rows: GenderByDepartmentRow[];
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
  const paginationDisabled = loading || hasError || rows.length === 0;

  return (
    <section
      className="flex h-[420px] flex-col overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
      aria-label="Gender distribution by department"
    >
      <PanelHeader
        eyebrow="Workforce diversity"
        title="Gender by department"
        description={
          loading
            ? "Loading…"
            : hasError
              ? "Data unavailable"
              : `Gender split across ${rows.length} department${rows.length === 1 ? "" : "s"}`
        }
        action={
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-[var(--pa-info)]" aria-hidden="true" />
              Male
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-[var(--pa-gold)]" aria-hidden="true" />
              Female
            </span>
          </div>
        }
      />

      <div aria-live="polite" className="pa-scrollbar flex flex-1 min-h-0 flex-col overflow-y-auto">
        {!loading && !hasError && rows.length === 0 && (
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-6 text-center">
            <UsersRound size={22} className="text-[var(--pa-faint)]" aria-hidden="true" />
            <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
              No department data
            </div>
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
                key={row.departmentId}
                className="flex flex-col gap-1.5 px-5 py-2.5 transition-colors hover:bg-[var(--pa-canvas)] sm:px-6"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-[12px] font-extrabold text-[var(--pa-text)]">
                    {row.departmentName}
                  </span>
                  <span className="pa-tabular shrink-0 text-[11px] font-semibold text-[var(--pa-muted)]">
                    {row.male}M · {row.female}F
                  </span>
                </div>
                <GenderBar {...row} />
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="mt-auto flex min-h-12 shrink-0 items-center justify-center border-t border-[var(--pa-border)] px-5">
        <nav aria-label="Gender distribution pages" className="flex items-center gap-1">
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
            className="pa-focus-ring grid size-8 place-items-center rounded-md text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-canvas)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Next page"
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </nav>
      </footer>
    </section>
  );
}
