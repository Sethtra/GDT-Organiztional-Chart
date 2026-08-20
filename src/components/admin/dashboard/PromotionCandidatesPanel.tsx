import { useState } from "react";
import { Award, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import type { PromotionReadiness } from "../../../contracts/hr";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";

const PAGE_SIZE = 3;

function getStatusLabel(loading: boolean, hasError: boolean, count: number) {
  if (loading) return "Checking promotions";
  if (hasError) return "Promotion data unavailable";
  return `${count} ready`;
}

export default function PromotionCandidatesPanel({
  candidates,
  loading,
  hasError,
}: {
  candidates: PromotionReadiness[];
  loading: boolean;
  hasError: boolean;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleCandidates = candidates.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const paginationDisabled = loading || hasError || candidates.length === 0;

  return (
    <section
      id="approvals"
      className="scroll-mt-20 flex flex-col overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-4 xl:self-stretch"
    >
      <PanelHeader
        eyebrow="Decision queue"
        title="Promotion candidates"
        description="Verified for the officer's next position level"
        action={
          <StatusBadge tone={hasError ? "danger" : "success"}>
            {getStatusLabel(loading, hasError, candidates.length)}
          </StatusBadge>
        }
      />
      <div aria-live="polite" className="flex flex-1 flex-col bg-white">
        {loading ? (
          <p role="status" className="flex flex-1 items-center justify-center px-5 py-5 text-center text-[12px] font-semibold text-[var(--pa-muted)] sm:px-6">
            Checking officer skills and title requirements…
          </p>
        ) : hasError ? (
          <p role="alert" className="flex flex-1 items-center justify-center px-5 py-5 text-center text-[12px] font-semibold text-[var(--pa-danger)] sm:px-6">
            Promotion readiness could not be loaded.
          </p>
        ) : candidates.length === 0 ? (
          <div className="flex flex-1 items-center justify-center gap-3 px-5 py-5 sm:px-6">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[var(--pa-surface-muted)] text-[var(--pa-muted)]">
              <Award size={17} strokeWidth={1.9} aria-hidden="true" />
            </div>
            <div>
              <div className="text-[12px] font-extrabold text-[var(--pa-text)]">
                No candidates are ready
              </div>
              <p className="mt-1 text-[11px] font-medium leading-4 text-[var(--pa-muted)]">
                No officer currently meets every skill required for the next title.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-[var(--pa-border)] bg-[var(--pa-primary-soft)] px-5 py-2.5 text-[11px] font-bold text-[var(--pa-primary)] sm:px-6">
              <Award size={14} strokeWidth={2} aria-hidden="true" />
              All required skills verified
            </div>
            <ul className="grid flex-1 grid-rows-3 divide-y divide-[var(--pa-border)]">
              {visibleCandidates.map((candidate) => (
                <li key={candidate.staffId} className="min-h-0">
                  <Link
                    to={`/admin/staff?profile=${encodeURIComponent(candidate.staffId)}`}
                    className="pa-focus-ring group flex h-full min-w-0 items-center gap-3 px-5 py-4 text-inherit no-underline transition-colors hover:bg-[var(--pa-canvas)] sm:px-6"
                    aria-label={`Open profile for ${candidate.name}, ready to promote to ${candidate.targetJobTitle?.name ?? "the next title"}`}
                  >
                    {candidate.photoUrl ? (
                      <img
                        src={candidate.photoUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-[10px] object-cover"
                      />
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[var(--pa-primary)] text-[12px] font-extrabold text-white">
                        {(candidate.nameEn || candidate.name).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(108px,1fr))] sm:items-start sm:gap-x-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-extrabold text-[var(--pa-text)]">
                          {candidate.name}
                        </span>
                        {candidate.departmentName && (
                          <span className="mt-0.5 block truncate text-[10px] font-medium text-[var(--pa-faint)]">
                            {candidate.departmentName}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold">
                          <span className="truncate text-[var(--pa-muted)]">
                            {candidate.currentJobTitle?.name}
                          </span>
                          <ChevronRight size={12} className="shrink-0 text-[var(--pa-faint)]" aria-hidden="true" />
                          <span className="truncate text-[var(--pa-primary)]">
                            {candidate.targetJobTitle?.name}
                          </span>
                        </span>
                        <span className="mt-1 block text-[10px] font-semibold text-[var(--pa-muted)]">
                          {candidate.metSkillCount}/{candidate.requiredSkillCount} required skills met
                        </span>
                      </span>
                    </span>
                    <ChevronRight
                      size={15}
                      className="shrink-0 text-[var(--pa-faint)] transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <footer className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center border-t border-[var(--pa-border)] px-5 sm:px-6">
        <span aria-hidden="true" />
        <nav
          aria-label="Promotion candidate pages"
          className="flex items-center justify-center gap-1"
        >
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={paginationDisabled || currentPage === 1}
            className="pa-focus-ring grid size-8 place-items-center rounded-md text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-canvas)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Previous promotion candidates page"
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
            aria-label="Next promotion candidates page"
            title="Next page"
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </nav>
        <Link
          to="/admin/staff?promotion=ready"
          className="pa-focus-ring inline-flex min-h-10 items-center gap-1 justify-self-end rounded-md text-[11px] font-extrabold text-[var(--pa-primary)] no-underline"
          aria-label="View all promotion-ready officers"
        >
          View all
          <ChevronRight size={13} aria-hidden="true" />
        </Link>
      </footer>
    </section>
  );
}
