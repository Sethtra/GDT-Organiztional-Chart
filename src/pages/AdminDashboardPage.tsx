import { useMemo, useState } from "react";
import { CalendarDays, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";

import AdminFooter from "../components/admin/AdminFooter";
import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";
import DashboardMetricGrid from "../components/admin/dashboard/DashboardMetricGrid";
import DepartmentCoveragePanel from "../components/admin/dashboard/DepartmentCoveragePanel";
import PromotionCandidatesPanel from "../components/admin/dashboard/PromotionCandidatesPanel";
import RecentActivityPanel from "../components/admin/dashboard/RecentActivityPanel";
import { StatusBadge } from "../components/admin/dashboard/DashboardPrimitives";
import WorkforceTrendPanel from "../components/admin/dashboard/WorkforceTrendPanel";
import {
  DASHBOARD_ACTIVITY,
  type TrendPeriod,
} from "../components/admin/dashboard/dashboardPreviewData";
import { usePromotionReadiness } from "../hooks/usePromotionReadiness";
import "./AdminDashboardTestPage.css";

export default function AdminDashboardPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("30d");
  const [query, setQuery] = useState("");
  const promotion = usePromotionReadiness();

  const filteredActivity = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return DASHBOARD_ACTIVITY;
    return DASHBOARD_ACTIVITY.filter((row) =>
      [row.name, row.action, row.department, row.status].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [query]);

  return (
    <div className="admin-dashboard-test flex h-dvh overflow-hidden bg-[var(--pa-canvas)]">
      <aside className="hidden h-full w-[240px] shrink-0 flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] lg:flex">
        <AdminSidebar currentTab="analytics" />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#081a12]/55 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="relative flex h-full w-[min(84vw,260px)] flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-200">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="pa-focus-ring absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-lg text-[var(--pa-sidebar-muted)] transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <AdminSidebar
              currentTab="analytics"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader
          mobileNavOpen={mobileNavOpen}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search activity"
          searchLabel="Search recent activity"
        />

        <main className="pa-scrollbar mx-auto w-full max-w-[1540px] flex-1 overflow-y-auto px-4 pb-12 pt-7 sm:px-7 lg:px-10 lg:pt-9">
          <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <StatusBadge tone="warning">Preview data</StatusBadge>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[var(--pa-faint)]">
                  Illustrative — not yet wired to live data
                </span>
              </div>
              <h1 className="text-[28px] font-extrabold tracking-[-0.035em] text-[var(--pa-text)] sm:text-[32px]">
                Executive overview
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[var(--pa-muted)]">
                A focused view of workforce coverage, organizational capacity,
                and decisions that need your attention.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex h-10 items-center gap-2 rounded-[9px] border border-[var(--pa-border)] bg-white px-3 text-[11.5px] font-bold text-[var(--pa-muted)]">
                <CalendarDays size={15} aria-hidden="true" />
                31 July 2026
              </div>
              <Link
                to="/admin/staff"
                className="pa-focus-ring inline-flex h-10 items-center gap-2 rounded-[9px] bg-[var(--pa-primary)] px-4 text-[11.5px] font-extrabold text-white no-underline transition-colors hover:bg-[var(--pa-primary-hover)]"
              >
                <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
                Add officer
              </Link>
            </div>
          </div>

          <DashboardMetricGrid />

          <div className="mb-4 grid gap-4 xl:grid-cols-12">
            <WorkforceTrendPanel
              period={trendPeriod}
              onPeriodChange={setTrendPeriod}
            />
            <PromotionCandidatesPanel
              candidates={promotion.candidates}
              loading={promotion.loading}
              hasError={promotion.hasError}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <DepartmentCoveragePanel />
            <RecentActivityPanel
              query={query}
              activity={filteredActivity}
              onClearSearch={() => setQuery("")}
            />
          </div>
        </main>

        <AdminFooter />
      </div>
    </div>
  );
}
