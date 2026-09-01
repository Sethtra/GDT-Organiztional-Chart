import { useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "../../../lib/utils";
import { PanelHeader } from "./DashboardPrimitives";
import type { DepartmentCoverageRow } from "../../../hooks/useDepartmentCoverage";

const PAGE_SIZE = 3;

// ── Coverage bar ──────────────────────────────────────────────────────────────
function CoverageBar({ coverage }: { coverage: number }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--pa-surface-muted)]">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          coverage === 0
            ? "bg-[var(--pa-border)]"
            : coverage < 70
              ? "bg-[var(--pa-danger)]"
              : coverage < 90
                ? "bg-[var(--pa-gold)]"
                : "bg-[var(--pa-primary)]",
        )}
        style={{ width: coverage > 0 ? `${coverage}%` : "0%" }}
      />
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-[var(--pa-border)]">
      <td className="px-6 py-4">
        <div className="h-3 w-40 rounded bg-[var(--pa-border)]" />
        <div className="mt-1 h-2.5 w-28 rounded bg-[var(--pa-border)]" />
      </td>
      <td className="w-[190px] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-[var(--pa-border)]" />
          <div className="h-3 w-8 rounded bg-[var(--pa-border)]" />
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="ml-auto h-3 w-12 rounded bg-[var(--pa-border)]" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="ml-auto h-5 w-20 rounded-md bg-[var(--pa-border)]" />
      </td>
    </tr>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────
function MobileCard({ row }: { row: DepartmentCoverageRow }) {
  return (
    <article className="px-5 py-4">
      <div className="min-w-0">
        <h3 className="text-[12px] font-extrabold leading-5 text-[var(--pa-text)]">
          {row.name}
        </h3>
        {row.nameEn && (
          <p className="mt-0.5 text-[10px] text-[var(--pa-faint)]">
            {row.nameEn}{row.code ? ` (${row.code})` : ""}
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <CoverageBar coverage={row.coverage} />
        <span className="pa-tabular text-[11px] font-bold text-[var(--pa-muted)]">
          {row.current > 0 ? `${row.coverage}%` : "—"}
        </span>
      </div>
      <div className="pa-tabular mt-2 text-[11px] font-semibold text-[var(--pa-faint)]">
        {row.current} {row.current === 1 ? "officer" : "officers"}
      </div>
    </article>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DepartmentCoveragePanel({
  rows,
  loading,
  hasError,
}: {
  rows: DepartmentCoverageRow[];
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

  const description = loading
    ? "Loading live coverage data…"
    : hasError
      ? "Coverage data unavailable"
      : `Live officer counts across ${rows.length} organizational unit${rows.length === 1 ? "" : "s"}`;

  return (
    <section
      id="department-capacity"
      className="scroll-mt-20 flex flex-col overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-7"
      aria-label="Department coverage"
    >
      <PanelHeader
        eyebrow="Organizational capacity"
        title="Department coverage"
        description={description}
        action={
          <Link
            to="/admin/org-structure"
            className="pa-focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--pa-border)] px-3 text-[11px] font-extrabold text-[var(--pa-muted)] no-underline transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)]"
          >
            View structure
            <ChevronRight size={13} aria-hidden="true" />
          </Link>
        }
      />

      <div aria-live="polite" className="flex flex-1 flex-col">
        {/* ── Error state ── */}
        {!loading && hasError && (
          <div className="flex flex-1 min-h-[200px] flex-col items-center justify-center px-6 text-center">
            <AlertCircle size={22} className="text-[var(--pa-danger)]" aria-hidden="true" />
            <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
              Coverage data unavailable
            </div>
            <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-[var(--pa-muted)]">
              Could not load department data. Try refreshing the page.
            </p>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !hasError && rows.length === 0 && (
          <div className="flex flex-1 min-h-[200px] flex-col items-center justify-center px-6 text-center">
            <Building2 size={22} className="text-[var(--pa-faint)]" aria-hidden="true" />
            <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
              No departments found
            </div>
            <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-[var(--pa-muted)]">
              Add organizational units to see coverage here.
            </p>
          </div>
        )}

        {/* ── Mobile cards ── */}
        {!hasError && (
          <div className="divide-y divide-[var(--pa-border)] sm:hidden">
            {loading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse px-5 py-4">
                    <div className="h-3 w-40 rounded bg-[var(--pa-border)]" />
                    <div className="mt-3 h-1.5 rounded-full bg-[var(--pa-border)]" />
                  </div>
                ))
              : visible.map((row) => <MobileCard key={row.id} row={row} />)}
          </div>
        )}

        {/* ── Desktop table ── */}
        {!hasError && (
          <div className="hidden flex-1 overflow-x-auto sm:block">
            <table className="w-full min-w-[580px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--pa-border)] bg-[var(--pa-canvas)]">
                  <th className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                    Department
                  </th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                    Coverage
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                    Officers
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pa-border)]">
                {loading
                  ? [1, 2, 3].map((i) => <SkeletonRow key={i} />)
                  : visible.map((row) => (
                        <tr
                          key={row.id}
                          className="transition-colors hover:bg-[var(--pa-canvas)]"
                        >
                          <td className="px-6 py-4">
                            <div className="text-[12px] font-extrabold text-[var(--pa-text)]">
                              {row.name}
                            </div>
                            {row.nameEn && (
                              <div className="mt-0.5 text-[10px] text-[var(--pa-faint)]">
                                {row.nameEn}{row.code ? ` (${row.code})` : ""}
                              </div>
                            )}
                          </td>
                          <td className="w-[190px] px-4 py-4">
                            <div className="flex items-center gap-3">
                              <CoverageBar coverage={row.coverage} />
                              <span className="pa-tabular w-8 text-right text-[11px] font-bold text-[var(--pa-muted)]">
                                {row.current > 0 ? `${row.coverage}%` : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="pa-tabular px-6 py-4 text-right text-[12px] font-bold text-[var(--pa-text)]">
                            {row.current}
                            <span className="font-medium text-[var(--pa-faint)]">
                              {" / "}
                              {row.plan}
                            </span>
                          </td>
                        </tr>
                      ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer with pagination + View all ── */}
      <footer className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center border-t border-[var(--pa-border)] px-5 sm:px-6">
        <span aria-hidden="true" />
        <nav
          aria-label="Department coverage pages"
          className="flex items-center justify-center gap-1"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={paginationDisabled || currentPage === 1}
            className="pa-focus-ring grid size-8 place-items-center rounded-md text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-canvas)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Previous department page"
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
            aria-label="Next department page"
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </nav>
        <Link
          to="/admin/org-structure"
          className="pa-focus-ring inline-flex min-h-10 items-center gap-1 justify-self-end rounded-md text-[11px] font-extrabold text-[var(--pa-primary)] no-underline"
          aria-label="View all departments"
        >
          View all
          <ChevronRight size={13} aria-hidden="true" />
        </Link>
      </footer>
    </section>
  );
}
