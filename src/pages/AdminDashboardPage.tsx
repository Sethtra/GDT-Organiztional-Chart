import { useState } from "react";
import { CalendarDays, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";

import AdminFooter from "../components/admin/AdminFooter";
import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";
import AgeDistributionPanel from "../components/admin/dashboard/AgeDistributionPanel";
import DashboardMetricGrid from "../components/admin/dashboard/DashboardMetricGrid";
import DepartmentCoveragePanel from "../components/admin/dashboard/DepartmentCoveragePanel";
import EducationDistributionPanel from "../components/admin/dashboard/EducationDistributionPanel";
import GenderByDepartmentPanel from "../components/admin/dashboard/GenderByDepartmentPanel";
import JobTitleDistributionPanel from "../components/admin/dashboard/JobTitleDistributionPanel";
import RecentActivityPanel from "../components/admin/dashboard/RecentActivityPanel";
import RecentMovementPanel from "../components/admin/dashboard/RecentMovementPanel";
import SkillCoveragePanel from "../components/admin/dashboard/SkillCoveragePanel";
import { StatusBadge } from "../components/admin/dashboard/DashboardPrimitives";
import WorkforceTrendPanel from "../components/admin/dashboard/WorkforceTrendPanel";
import { useDashboardAnalytics } from "../hooks/useDashboardAnalytics";
import { useDepartmentCoverage } from "../hooks/useDepartmentCoverage";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useWorkforceMetrics } from "../hooks/useWorkforceMetrics";
import "./AdminDashboardPage.css";

export default function AdminDashboardPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const workforce = useWorkforceMetrics();
  const activity = useRecentActivity();
  const coverage = useDepartmentCoverage();
  const analytics = useDashboardAnalytics(
    workforce.staffList,
    workforce.loading,
  );

  // Filtering is now handled inside RecentActivityPanel to keep this page lean.

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
                <StatusBadge tone="info">Mixed data</StatusBadge>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[var(--pa-faint)]">
                  Workforce totals are live — remaining analytics are illustrative
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
                {new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}
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

          <DashboardMetricGrid
            metrics={workforce.metrics}
            loading={workforce.loading}
            hasError={workforce.hasError}
          />

          <div className="mb-4">
            <WorkforceTrendPanel
              years={workforce.years}
              loading={workforce.loading}
              hasError={workforce.hasError}
            />
          </div>

          {/* Row 3: Department coverage + Recent activity */}
          <div className="mb-4 grid gap-4 xl:grid-cols-12">
            <DepartmentCoveragePanel
              rows={coverage.rows}
              loading={coverage.loading}
              hasError={coverage.hasError}
            />
            <RecentActivityPanel
              events={activity.events}
              loading={activity.loading}
              hasError={activity.hasError}
              query={query}
              onClearSearch={() => setQuery("")}
            />
          </div>

          {/* Row 4: Job title distribution + Education levels */}
          <div className="mb-4 grid gap-4 xl:grid-cols-2">
            <JobTitleDistributionPanel
              rows={analytics.jobTitleDistribution}
              loading={workforce.loading}
              hasError={workforce.hasError}
            />
            <EducationDistributionPanel
              rows={analytics.educationDistribution}
              loading={workforce.loading}
              hasError={workforce.hasError}
            />
          </div>

          {/* Row 5: Age distribution + Gender by department */}
          <div className="mb-4 grid gap-4 xl:grid-cols-2">
            <AgeDistributionPanel
              bands={analytics.ageBands}
              retirementSoonCount={analytics.retirementSoonCount}
              loading={workforce.loading}
              hasError={workforce.hasError}
            />
            <GenderByDepartmentPanel
              rows={analytics.genderByDepartment}
              loading={workforce.loading}
              hasError={workforce.hasError}
            />
          </div>

          {/* Row 6: Recent movement + Skill coverage */}
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="flex flex-col xl:col-span-7">
              <RecentMovementPanel
                joiners={analytics.recentJoiners}
                departures={analytics.recentDepartures}
                loading={workforce.loading}
                hasError={workforce.hasError}
              />
            </div>
            <div className="flex flex-col xl:col-span-5">
              <SkillCoveragePanel />
            </div>
          </div>
        </main>

        <AdminFooter />
      </div>
    </div>
  );
}

