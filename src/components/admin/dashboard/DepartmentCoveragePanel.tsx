import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "../../../lib/utils";
import { DASHBOARD_DEPARTMENTS } from "./dashboardPreviewData";
import { PanelHeader, StatusBadge } from "./DashboardPrimitives";

function coveragePercent(current: number, plan: number) {
  return Math.round((current / plan) * 100);
}

function CoverageBar({ coverage }: { coverage: number }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--pa-surface-muted)]">
      <div
        className={cn(
          "h-full rounded-full",
          coverage < 90 ? "bg-[var(--pa-gold)]" : "bg-[var(--pa-primary)]",
        )}
        style={{ width: `${coverage}%` }}
      />
    </div>
  );
}

export default function DepartmentCoveragePanel() {
  return (
    <section
      id="department-capacity"
      className="scroll-mt-20 overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-7"
    >
      <PanelHeader
        eyebrow="Organizational capacity"
        title="Department coverage"
        description="Active officers compared with approved staffing plans"
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
      <div className="divide-y divide-[var(--pa-border)] sm:hidden">
        {DASHBOARD_DEPARTMENTS.map((department) => {
          const coverage = coveragePercent(department.current, department.plan);
          return (
            <article key={department.name} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[12px] font-extrabold leading-5 text-[var(--pa-text)]">
                  {department.name}
                </h3>
                <StatusBadge tone={department.tone}>{department.status}</StatusBadge>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <CoverageBar coverage={coverage} />
                <span className="pa-tabular text-[11px] font-bold text-[var(--pa-muted)]">
                  {coverage}%
                </span>
              </div>
              <div className="pa-tabular mt-2 text-[11px] font-semibold text-[var(--pa-faint)]">
                {department.current} active of {department.plan} planned
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[620px] border-collapse text-left">
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
              <th className="px-6 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--pa-border)]">
            {DASHBOARD_DEPARTMENTS.map((department) => {
              const coverage = coveragePercent(department.current, department.plan);
              return (
                <tr key={department.name} className="transition-colors hover:bg-[var(--pa-canvas)]">
                  <td className="px-6 py-4">
                    <div className="text-[12px] font-extrabold text-[var(--pa-text)]">
                      {department.name}
                    </div>
                  </td>
                  <td className="w-[190px] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <CoverageBar coverage={coverage} />
                      <span className="pa-tabular w-8 text-right text-[11px] font-bold text-[var(--pa-muted)]">
                        {coverage}%
                      </span>
                    </div>
                  </td>
                  <td className="pa-tabular px-4 py-4 text-right text-[12px] font-bold text-[var(--pa-text)]">
                    {department.current}
                    <span className="font-medium text-[var(--pa-faint)]"> / {department.plan}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <StatusBadge tone={department.tone}>{department.status}</StatusBadge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
