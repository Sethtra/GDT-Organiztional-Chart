import { Activity, Search } from "lucide-react";

import type { DashboardActivity } from "./dashboardPreviewData";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";

export default function RecentActivityPanel({
  query,
  activity,
  onClearSearch,
}: {
  query: string;
  activity: DashboardActivity[];
  onClearSearch: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-5">
      <PanelHeader
        eyebrow="People operations"
        title="Recent activity"
        description={
          query
            ? `${activity.length} matching update${activity.length === 1 ? "" : "s"}`
            : "Latest changes across the administration"
        }
        action={
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
            <Activity size={15} aria-hidden="true" />
          </div>
        }
      />
      {activity.length > 0 ? (
        <div className="divide-y divide-[var(--pa-border)] px-5 sm:px-6">
          {activity.map((row) => (
            <div key={`${row.name}-${row.action}`} className="flex gap-3 py-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] text-[11px] font-extrabold text-[var(--pa-primary)]">
                {row.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[12px] font-extrabold text-[var(--pa-text)]">
                    {row.name}
                  </span>
                  <span className="pa-tabular text-[10px] font-semibold text-[var(--pa-faint)]">
                    {row.timestamp}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-[var(--pa-muted)]">
                  {row.action}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="max-w-[220px] truncate text-[10px] font-medium text-[var(--pa-faint)]">
                    {row.department}
                  </span>
                  <StatusBadge tone={row.tone}>{row.status}</StatusBadge>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
          <Search size={22} className="text-[var(--pa-faint)]" aria-hidden="true" />
          <div className="mt-3 text-[13px] font-extrabold text-[var(--pa-text)]">
            No activity found
          </div>
          <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-[var(--pa-muted)]">
            Try a person, department, action, or status.
          </p>
          <button
            type="button"
            onClick={onClearSearch}
            className="pa-focus-ring mt-4 min-h-10 rounded-lg border border-[var(--pa-border)] px-3 text-[11px] font-extrabold text-[var(--pa-primary)]"
          >
            Clear search
          </button>
        </div>
      )}
    </section>
  );
}
