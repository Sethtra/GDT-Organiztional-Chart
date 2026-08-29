import { Fragment, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  LayoutDashboard,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface AdminSidebarProps {
  currentTab?: "analytics" | "activity" | "staff" | "org-structure" | "jobs";
  onNavigate?: () => void;
}

const NAV_ITEMS = [
  {
    id: "analytics",
    label: "Executive overview",
    description: "Workforce intelligence",
    path: "/admin",
    icon: LayoutDashboard,
  },
  {
    id: "staff",
    label: "Staff directory",
    description: "People and placements",
    path: "/admin/staff",
    icon: UsersRound,
  },
  {
    id: "org-structure",
    label: "Organization",
    description: "Departments and offices",
    path: "/admin/org-structure",
    icon: Building2,
  },
  {
    id: "jobs",
    label: "Job architecture",
    description: "Positions and skills",
    path: "/admin/job-architecture",
    icon: BriefcaseBusiness,
  },
] as const;

export default function AdminSidebar({ currentTab, onNavigate }: AdminSidebarProps) {
  const location = useLocation();

  const getActiveTab = () => {
    if (currentTab) return currentTab;
    const path = location.pathname;
    if (path === "/admin/activity") return "activity";
    if (path.includes("/admin/staff")) return "staff";
    if (path.includes("/admin/org-structure")) return "org-structure";
    if (path.includes("/admin/job-architecture")) return "jobs";
    return "analytics";
  };

  const activeId = getActiveTab();
  const [overviewExpanded, setOverviewExpanded] = useState(
    activeId === "activity",
  );

  useEffect(() => {
    if (activeId === "activity") setOverviewExpanded(true);
  }, [activeId]);

  return (
    <div className="flex h-full w-full flex-col bg-[var(--pa-sidebar)]">
      {/* Brand Header */}
      <div className="border-b border-[var(--pa-sidebar-border)] px-4 py-4 shrink-0">
        <div className="flex items-center justify-center">
          <img
            src="/GDT-Logo (Soft).png"
            alt="GDT Administration"
            className="h-20 w-auto object-contain"
          />
        </div>
      </div>

      {/* Navigation items */}
      <nav
        className="flex flex-1 flex-col gap-0.5 px-2 py-3 overflow-y-auto pa-scrollbar"
        aria-label="Admin navigation"
      >
        <div className="mb-1.5 px-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--pa-sidebar-muted)]">
          Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;
          const isOverview = item.id === "analytics";
          const showOverviewSubnav = isOverview && overviewExpanded;

          return (
            <Fragment key={item.id}>
              <div className="flex items-stretch">
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "pa-focus-ring group relative flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left no-underline transition-colors duration-150",
                    isActive
                      ? "bg-white/[0.11] text-white font-bold"
                      : "text-[var(--pa-sidebar-muted)] hover:bg-[var(--pa-sidebar-hover)] hover:text-white",
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute -left-2 h-6 w-0.5 rounded-r-full bg-[#d8bd79]"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                      isActive
                        ? "border-white/10 bg-white/10 text-[#efd78d]"
                        : "border-white/[0.06] bg-white/[0.035] text-[var(--pa-sidebar-muted)] group-hover:text-white",
                    )}
                  >
                    <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-bold">
                      {item.label}
                    </span>
                    <span className="block truncate text-[10px] font-medium opacity-70">
                      {item.description}
                    </span>
                  </span>
                </Link>

                {isOverview && (
                  <button
                    type="button"
                    onClick={() => setOverviewExpanded((expanded) => !expanded)}
                    aria-controls="admin-executive-overview-subnav"
                    aria-expanded={overviewExpanded}
                    aria-label={`${overviewExpanded ? "Collapse" : "Expand"} Executive overview`}
                    className="pa-focus-ring flex min-h-11 w-9 shrink-0 items-center justify-center rounded-[8px] text-[var(--pa-sidebar-muted)] transition-colors hover:bg-[var(--pa-sidebar-hover)] hover:text-white"
                  >
                    <ChevronDown
                      size={14}
                      strokeWidth={2}
                      className={cn(
                        "transition-transform duration-150",
                        overviewExpanded && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>

              {isOverview && showOverviewSubnav && (
                <div id="admin-executive-overview-subnav" className="pl-3">
                  <Link
                    to="/admin/activity"
                    onClick={onNavigate}
                    aria-current={activeId === "activity" ? "page" : undefined}
                    className={cn(
                      "pa-focus-ring group relative flex min-h-9 items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-left no-underline transition-colors duration-150",
                      activeId === "activity"
                        ? "bg-white/[0.11] text-white font-bold"
                        : "text-[var(--pa-sidebar-muted)] hover:bg-[var(--pa-sidebar-hover)] hover:text-white",
                    )}
                  >
                    {activeId === "activity" && (
                      <span
                        className="absolute -left-2 h-4 w-0.5 rounded-r-full bg-[#d8bd79]"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                        activeId === "activity"
                          ? "border-white/10 bg-white/10 text-[#efd78d]"
                          : "border-white/[0.06] bg-white/[0.035] text-[var(--pa-sidebar-muted)] group-hover:text-white",
                      )}
                    >
                      <Activity size={12} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className="block truncate text-[11.5px] font-bold">
                      Recent activity
                    </span>
                  </Link>
                </div>
              )}
            </Fragment>
          );
        })}
      </nav>

      {/* Security Footer Notice */}
      <div className="m-2 rounded-lg border border-[var(--pa-sidebar-border)] bg-white/[0.045] p-3 shrink-0">
        <div className="flex items-start gap-2.5">
          <ShieldCheck
            size={15}
            className="mt-0.5 shrink-0 text-[#efd78d]"
            aria-hidden="true"
          />
          <div>
            <div className="text-[11px] font-bold text-white">
              GDT Command Center
            </div>
            <p className="mt-0.5 text-[10px] leading-[1.4] text-[var(--pa-sidebar-muted)]">
              Authorized HR administrator access. Live sync active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
