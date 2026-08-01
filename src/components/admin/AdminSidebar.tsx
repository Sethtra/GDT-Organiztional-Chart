import { Link, useLocation } from "react-router-dom";
import {
  BriefcaseBusiness,
  Building2,
  LayoutDashboard,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface AdminSidebarProps {
  currentTab?: "analytics" | "staff" | "org-structure" | "jobs";
  onNavigate?: () => void;
}

const NAV_ITEMS = [
  {
    id: "analytics",
    label: "Executive overview",
    description: "Workforce intelligence",
    path: "/test-admin",
    aliases: ["/test-admin", "/admin"],
    icon: LayoutDashboard,
  },
  {
    id: "staff",
    label: "Staff directory",
    description: "People and placements",
    path: "/admin/staff-preview",
    aliases: ["/admin/staff", "/admin/staff-preview"],
    icon: UsersRound,
  },
  {
    id: "org-structure",
    label: "Organization",
    description: "Departments and offices",
    path: "/admin/org-structure",
    aliases: ["/admin/org-structure"],
    icon: Building2,
  },
  {
    id: "jobs",
    label: "Job architecture",
    description: "Positions and skills",
    path: "/admin/job-architecture",
    aliases: ["/admin/job-architecture"],
    icon: BriefcaseBusiness,
  },
] as const;

export default function AdminSidebar({ currentTab, onNavigate }: AdminSidebarProps) {
  const location = useLocation();

  const getActiveTab = () => {
    if (currentTab) return currentTab;
    const path = location.pathname;
    if (path.includes("/admin/staff")) return "staff";
    if (path.includes("/admin/org-structure")) return "org-structure";
    if (path.includes("/admin/job-architecture")) return "jobs";
    return "analytics";
  };

  const activeId = getActiveTab();

  return (
    <div className="flex h-full w-full flex-col bg-[var(--pa-sidebar)]">
      {/* Brand Header */}
      <div className="border-b border-[var(--pa-sidebar-border)] px-4 pb-4 pt-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white">
            <img
              src="/gdt-seal.png"
              alt="GDT Seal"
              className="size-8 object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-extrabold tracking-[-0.015em] text-[var(--pa-sidebar-text)]">
              GDT Administration
            </div>
            <div className="mt-0.5 truncate text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--pa-sidebar-muted)]">
              People command center
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.055] px-2.5 py-1.5">
          <span className="text-[10.5px] font-semibold text-[var(--pa-sidebar-muted)]">
            Live database
          </span>
          <span className="rounded-md border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--pa-primary)]">
            Supabase
          </span>
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

          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "pa-focus-ring group relative flex min-h-11 items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left no-underline transition-colors duration-150",
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
