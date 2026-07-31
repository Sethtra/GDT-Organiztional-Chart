import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "../lib/utils";
import "./AdminDashboardTestPage.css";

type BadgeTone = "success" | "warning" | "info" | "neutral" | "danger";
type TrendPeriod = "30d" | "90d" | "12m";

const NAV_ITEMS: Array<{
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  active?: boolean;
}> = [
  {
    label: "Executive overview",
    description: "Workforce intelligence",
    path: "/test-admin",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "Staff directory",
    description: "People and placements",
    path: "/admin/staff",
    icon: UsersRound,
  },
  {
    label: "Organization",
    description: "Departments and offices",
    path: "/admin/org-structure",
    icon: Building2,
  },
  {
    label: "Job architecture",
    description: "Positions and skills",
    path: "/admin/job-architecture",
    icon: BriefcaseBusiness,
  },
];

const KPI_ITEMS: Array<{
  label: string;
  value: string;
  detail: string;
  badge: string;
  tone: BadgeTone;
  icon: LucideIcon;
  highlighted?: boolean;
}> = [
  {
    label: "Total workforce",
    value: "1,248",
    detail: "40 added this quarter",
    badge: "+3.2%",
    tone: "success",
    icon: UsersRound,
  },
  {
    label: "Position coverage",
    value: "96.8%",
    detail: "1,206 roles staffed",
    badge: "+1.4%",
    tone: "success",
    icon: UserRoundCheck,
  },
  {
    label: "Open positions",
    value: "42",
    detail: "Across 9 departments",
    badge: "12 priority",
    tone: "warning",
    icon: BriefcaseBusiness,
  },
  {
    label: "Actions due",
    value: "18",
    detail: "5 need attention today",
    badge: "Review",
    tone: "info",
    icon: Clock3,
    highlighted: true,
  },
];

const TREND_SERIES: Record<
  TrendPeriod,
  { label: string; values: number[]; axis: string[]; change: string }
> = {
  "30d": {
    label: "Last 30 days",
    values: [1168, 1181, 1177, 1204, 1216, 1232, 1248],
    axis: ["01 Jul", "06 Jul", "11 Jul", "16 Jul", "21 Jul", "26 Jul", "31 Jul"],
    change: "+80 officers",
  },
  "90d": {
    label: "Last 90 days",
    values: [1128, 1144, 1160, 1172, 1198, 1215, 1248],
    axis: ["May", "15 May", "Jun", "15 Jun", "Jul", "15 Jul", "31 Jul"],
    change: "+120 officers",
  },
  "12m": {
    label: "Last 12 months",
    values: [1018, 1044, 1086, 1110, 1146, 1188, 1248],
    axis: ["Aug", "Oct", "Dec", "Feb", "Apr", "Jun", "Jul"],
    change: "+230 officers",
  },
};

const APPROVALS: Array<{
  title: string;
  description: string;
  count: number;
  tone: BadgeTone;
  icon: LucideIcon;
}> = [
  {
    title: "Position assignments",
    description: "New placements awaiting validation",
    count: 8,
    tone: "warning",
    icon: UserRoundCheck,
  },
  {
    title: "Transfer requests",
    description: "Inter-department movement",
    count: 6,
    tone: "info",
    icon: ArrowUpRight,
  },
  {
    title: "Profile updates",
    description: "Officer records ready to publish",
    count: 4,
    tone: "neutral",
    icon: FileText,
  },
];

const DEPARTMENTS: Array<{
  name: string;
  current: number;
  plan: number;
  status: string;
  tone: BadgeTone;
}> = [
  {
    name: "Large Taxpayer Operations",
    current: 236,
    plan: 248,
    status: "On track",
    tone: "success",
  },
  {
    name: "Provincial Tax Operations",
    current: 292,
    plan: 310,
    status: "On track",
    tone: "success",
  },
  {
    name: "Digital Tax Systems",
    current: 184,
    plan: 198,
    status: "On track",
    tone: "info",
  },
  {
    name: "Audit & Enterprise",
    current: 164,
    plan: 190,
    status: "Needs review",
    tone: "warning",
  },
];

const ACTIVITY_ROWS: Array<{
  initials: string;
  name: string;
  action: string;
  department: string;
  timestamp: string;
  status: string;
  tone: BadgeTone;
}> = [
  {
    initials: "SR",
    name: "Sreyneang Ros",
    action: "Position assignment approved",
    department: "Finance & Personnel",
    timestamp: "10:42",
    status: "Completed",
    tone: "success",
  },
  {
    initials: "VK",
    name: "Vuthy Kim",
    action: "Transfer request submitted",
    department: "Large Taxpayer Operations",
    timestamp: "09:18",
    status: "In review",
    tone: "warning",
  },
  {
    initials: "CS",
    name: "Chantha Sok",
    action: "Skills profile updated",
    department: "Digital Tax Systems",
    timestamp: "Yesterday",
    status: "Published",
    tone: "info",
  },
  {
    initials: "MP",
    name: "Malis Pech",
    action: "New officer record created",
    department: "Provincial Tax Operations",
    timestamp: "Yesterday",
    status: "Draft",
    tone: "neutral",
  },
];

const BADGE_STYLES: Record<BadgeTone, string> = {
  success:
    "border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]",
  warning:
    "border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)] text-[#735413]",
  info:
    "border-[var(--pa-info-border)] bg-[var(--pa-info-soft)] text-[var(--pa-info)]",
  neutral:
    "border-[var(--pa-border)] bg-[var(--pa-surface-muted)] text-[#47524c]",
  danger:
    "border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] text-[var(--pa-danger)]",
};

const BADGE_DOT_STYLES: Record<BadgeTone, string> = {
  success: "bg-[var(--pa-primary)]",
  warning: "bg-[var(--pa-gold)]",
  info: "bg-[var(--pa-info)]",
  neutral: "bg-[var(--pa-muted)]",
  danger: "bg-[var(--pa-danger)]",
};

function StatusBadge({
  children,
  tone = "neutral",
  dot = true,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10.5px] font-bold leading-none tracking-[0.015em]",
        BADGE_STYLES[tone],
      )}
    >
      {dot && (
        <span
          className={cn("size-1.5 rounded-full", BADGE_DOT_STYLES[tone])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="border-b border-[var(--pa-sidebar-border)] px-5 pb-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white">
            <img
              src="/gdt-seal.png"
              alt=""
              className="size-10 object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold tracking-[-0.015em] text-[var(--pa-sidebar-text)]">
              GDT Administration
            </div>
            <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--pa-sidebar-muted)]">
              People command center
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2.5">
          <span className="text-[11px] font-semibold text-[var(--pa-sidebar-muted)]">
            Design environment
          </span>
          <span className="rounded-md border border-[#d8bd79]/30 bg-[#d8bd79]/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#efd78d]">
            Preview
          </span>
        </div>
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 px-3 py-5"
        aria-label="Admin navigation"
      >
        <div className="mb-2 px-3 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[var(--pa-sidebar-muted)]">
          Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onNavigate}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "pa-focus-ring group relative flex min-h-14 items-center gap-3 rounded-[10px] px-3 py-2.5 text-left no-underline transition-colors duration-150",
                item.active
                  ? "bg-white/[0.11] text-white"
                  : "text-[var(--pa-sidebar-muted)] hover:bg-[var(--pa-sidebar-hover)] hover:text-white",
              )}
            >
              {item.active && (
                <span
                  className="absolute -left-3 h-7 w-0.5 rounded-r-full bg-[#d8bd79]"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                  item.active
                    ? "border-white/10 bg-white/10 text-[#efd78d]"
                    : "border-white/[0.06] bg-white/[0.035] text-[var(--pa-sidebar-muted)] group-hover:text-white",
                )}
              >
                <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold">
                  {item.label}
                </span>
                <span className="mt-0.5 block truncate text-[10.5px] font-medium opacity-70">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-[var(--pa-sidebar-border)] bg-white/[0.045] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={17}
            className="mt-0.5 shrink-0 text-[#efd78d]"
            aria-hidden="true"
          />
          <div>
            <div className="text-[11.5px] font-bold text-white">
              Sample data only
            </div>
            <p className="mt-1 text-[10.5px] leading-[1.55] text-[var(--pa-sidebar-muted)]">
              This page is isolated from live HR records.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--pa-border)] px-5 py-4 sm:px-6">
      <div>
        <div className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--pa-primary)]">
          {eyebrow}
        </div>
        <h2 className="mt-1.5 text-[16px] font-extrabold tracking-[-0.015em] text-[var(--pa-text)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[11.5px] leading-5 text-[var(--pa-muted)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export default function AdminDashboardTestPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("30d");
  const [query, setQuery] = useState("");

  const trend = TREND_SERIES[trendPeriod];
  const chart = useMemo(() => {
    const chartWidth = 720;
    const chartTop = 24;
    const chartBottom = 190;
    const minValue = Math.min(...trend.values) - 20;
    const maxValue = Math.max(...trend.values) + 20;
    const usableWidth = chartWidth - 24;
    const points = trend.values.map((value, index) => {
      const x = 12 + (index * usableWidth) / (trend.values.length - 1);
      const ratio = (value - minValue) / (maxValue - minValue);
      const y = chartBottom - ratio * (chartBottom - chartTop);
      return { x, y, value };
    });
    const polyline = points.map(({ x, y }) => `${x},${y}`).join(" ");
    const area = `M ${points[0]?.x ?? 12} ${chartBottom} L ${points
      .map(({ x, y }) => `${x} ${y}`)
      .join(" L ")} L ${points.at(-1)?.x ?? chartWidth - 12} ${chartBottom} Z`;
    return { points, polyline, area };
  }, [trend]);

  const filteredActivity = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ACTIVITY_ROWS;
    return ACTIVITY_ROWS.filter((row) =>
      [row.name, row.action, row.department, row.status].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [query]);

  return (
    <div className="admin-dashboard-test flex">
      <aside className="hidden w-[268px] shrink-0 flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] lg:flex">
        <NavigationContent />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#081a12]/55 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="relative flex h-full w-[min(86vw,288px)] flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-200">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="pa-focus-ring absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-lg text-[var(--pa-sidebar-muted)] transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <NavigationContent onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="pa-scrollbar min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-[var(--pa-border)] bg-white/95 px-4 backdrop-blur-md sm:px-7 lg:px-10">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="pa-focus-ring flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--pa-border)] bg-white text-[var(--pa-text)] transition-colors hover:bg-[var(--pa-surface-muted)] lg:hidden"
            aria-label="Open admin navigation"
            aria-expanded={mobileNavOpen}
          >
            <Menu size={19} aria-hidden="true" />
          </button>

          <div className="hidden min-w-0 flex-1 items-center md:flex">
            <div className="relative w-full max-w-[430px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pa-faint)]"
                aria-hidden="true"
              />
              <label htmlFor="admin-test-search" className="sr-only">
                Search recent activity
              </label>
              <input
                id="admin-test-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people, actions, or departments"
                className="pa-focus-ring h-10 w-full rounded-[9px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] pl-10 pr-3 text-[12.5px] font-medium text-[var(--pa-text)] outline-none placeholder:text-[var(--pa-faint)]"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] px-3 py-2 text-[10.5px] font-bold text-[var(--pa-primary)] sm:flex">
              <span className="size-1.5 rounded-full bg-[var(--pa-primary)]" />
              Synced 2 min ago
            </div>
            <a
              href="#approvals"
              className="pa-focus-ring relative flex size-10 items-center justify-center rounded-lg border border-[var(--pa-border)] bg-white text-[var(--pa-muted)] transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)]"
              aria-label="View 18 pending actions"
            >
              <Bell size={17} aria-hidden="true" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--pa-danger)] ring-2 ring-white" />
            </a>
            <div className="h-8 w-px bg-[var(--pa-border)]" aria-hidden="true" />
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--pa-sidebar)] text-[11px] font-extrabold text-white">
                DA
              </div>
              <div className="hidden sm:block">
                <div className="text-[11.5px] font-extrabold leading-4 text-[var(--pa-text)]">
                  Dara Admin
                </div>
                <div className="text-[9.5px] font-semibold text-[var(--pa-muted)]">
                  HR Administrator
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1540px] px-4 pb-12 pt-7 sm:px-7 lg:px-10 lg:pt-9">
          <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <StatusBadge tone="success">Live operations</StatusBadge>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[var(--pa-faint)]">
                  Design preview · Sample data
                </span>
              </div>
              <h1 className="text-[28px] font-extrabold tracking-[-0.035em] text-[var(--pa-text)] sm:text-[32px]">
                Executive overview
              </h1>
              <p className="mt-2 max-w-2xl text-[12.5px] leading-5 text-[var(--pa-muted)] sm:text-[13px]">
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

          <section
            className="mb-4 grid gap-px overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-[var(--pa-border)] shadow-[var(--pa-shadow)] sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Key workforce metrics"
          >
            {KPI_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className={cn(
                    "relative min-w-0 bg-white p-5",
                    item.highlighted && "bg-[#fffcf4]",
                  )}
                >
                  {item.highlighted && (
                    <span
                      className="absolute inset-x-0 top-0 h-0.5 bg-[var(--pa-gold)]"
                      aria-hidden="true"
                    />
                  )}
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex size-9 items-center justify-center rounded-[9px] border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
                      <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                    </div>
                    <StatusBadge tone={item.tone}>{item.badge}</StatusBadge>
                  </div>
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-[var(--pa-muted)]">
                    {item.label}
                  </div>
                  <div className="pa-tabular mt-2 text-[30px] font-extrabold leading-none tracking-[-0.04em] text-[var(--pa-text)]">
                    {item.value}
                  </div>
                  <p className="mt-3 text-[11px] font-medium text-[var(--pa-faint)]">
                    {item.detail}
                  </p>
                </article>
              );
            })}
          </section>

          <div className="mb-4 grid gap-4 xl:grid-cols-12">
            <section className="overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-8">
              <PanelHeader
                eyebrow="Workforce movement"
                title="Headcount trend"
                description={`${trend.label} · Active officer records`}
                action={
                  <div
                    className="flex rounded-lg border border-[var(--pa-border)] bg-[var(--pa-canvas)] p-1"
                    aria-label="Trend period"
                  >
                    {(["30d", "90d", "12m"] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setTrendPeriod(period)}
                        aria-pressed={trendPeriod === period}
                        className={cn(
                          "pa-focus-ring h-7 rounded-md px-2.5 text-[10px] font-extrabold uppercase tracking-[0.04em] transition-colors",
                          trendPeriod === period
                            ? "bg-white text-[var(--pa-text)] shadow-sm"
                            : "text-[var(--pa-muted)] hover:text-[var(--pa-text)]",
                        )}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="px-4 pb-5 pt-5 sm:px-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="pa-tabular text-[24px] font-extrabold tracking-[-0.03em]">
                      1,248
                    </div>
                    <div className="mt-1 text-[10.5px] font-semibold text-[var(--pa-muted)]">
                      Active officers today
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold text-[var(--pa-primary)]">
                    <ArrowUpRight size={14} aria-hidden="true" />
                    {trend.change}
                  </div>
                </div>

                <div className="h-[236px] w-full">
                  <svg
                    viewBox="0 0 720 210"
                    preserveAspectRatio="none"
                    className="h-[205px] w-full overflow-visible"
                    role="img"
                    aria-labelledby="workforce-chart-title workforce-chart-description"
                  >
                    <title id="workforce-chart-title">
                      Active workforce trend
                    </title>
                    <desc id="workforce-chart-description">
                      Headcount rises from {trend.values[0]} to{" "}
                      {trend.values.at(-1)} officers during {trend.label}.
                    </desc>
                    {[24, 65, 106, 147, 190].map((y) => (
                      <line
                        key={y}
                        x1="12"
                        y1={y}
                        x2="708"
                        y2={y}
                        stroke="var(--pa-border)"
                        strokeWidth="1"
                        strokeDasharray="3 5"
                        className="pa-chart-grid"
                      />
                    ))}
                    <path
                      d={chart.area}
                      fill="var(--pa-primary-soft)"
                      opacity="0.8"
                    />
                    <polyline
                      points={chart.polyline}
                      fill="none"
                      stroke="var(--pa-primary)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pa-chart-line"
                    />
                    {chart.points.map((point, index) => (
                      <circle
                        key={`${trendPeriod}-${point.x}`}
                        cx={point.x}
                        cy={point.y}
                        r={index === chart.points.length - 1 ? 5.5 : 3.5}
                        fill={
                          index === chart.points.length - 1
                            ? "var(--pa-gold)"
                            : "var(--pa-surface)"
                        }
                        stroke={
                          index === chart.points.length - 1
                            ? "var(--pa-surface)"
                            : "var(--pa-primary)"
                        }
                        strokeWidth={
                          index === chart.points.length - 1 ? 3 : 2
                        }
                        className="pa-chart-line"
                      />
                    ))}
                  </svg>
                  <div className="-mt-1 grid grid-cols-7 gap-1 px-1">
                    {trend.axis.map((label) => (
                      <span
                        key={label}
                        className="truncate text-center text-[9px] font-semibold text-[var(--pa-faint)]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-1 grid grid-cols-3 divide-x divide-[var(--pa-border)] border-t border-[var(--pa-border)] pt-4">
                  {[
                    ["New joiners", "54"],
                    ["Internal moves", "31"],
                    ["Departures", "14"],
                  ].map(([label, value]) => (
                    <div key={label} className="px-3 first:pl-0">
                      <div className="pa-tabular text-[16px] font-extrabold text-[var(--pa-text)]">
                        {value}
                      </div>
                      <div className="mt-1 text-[9.5px] font-semibold text-[var(--pa-muted)]">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section
              id="approvals"
              className="scroll-mt-20 overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-4"
            >
              <PanelHeader
                eyebrow="Decision queue"
                title="Approvals requiring action"
                description="Prioritized by service impact"
                action={<StatusBadge tone="warning">18 pending</StatusBadge>}
              />
              <div className="divide-y divide-[var(--pa-border)] px-5 sm:px-6">
                {APPROVALS.map((approval) => {
                  const Icon = approval.icon;
                  return (
                    <Link
                      key={approval.title}
                      to="/admin/staff"
                      className="pa-focus-ring group flex items-center gap-3 py-4 text-inherit no-underline"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[var(--pa-surface-muted)] text-[var(--pa-muted)] transition-colors group-hover:bg-[var(--pa-primary-soft)] group-hover:text-[var(--pa-primary)]">
                        <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-extrabold text-[var(--pa-text)]">
                          {approval.title}
                        </div>
                        <div className="mt-1 truncate text-[10px] font-medium text-[var(--pa-muted)]">
                          {approval.description}
                        </div>
                      </div>
                      <StatusBadge tone={approval.tone} dot={false}>
                        {approval.count}
                      </StatusBadge>
                      <ChevronRight
                        size={15}
                        className="shrink-0 text-[var(--pa-faint)] transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  );
                })}
              </div>
              <div className="mx-5 mb-5 mt-1 flex gap-3 rounded-[10px] border border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)] p-3.5 sm:mx-6">
                <CircleAlert
                  size={16}
                  className="mt-0.5 shrink-0 text-[#735413]"
                  aria-hidden="true"
                />
                <p className="text-[10.5px] font-semibold leading-[1.55] text-[#624a19]">
                  Five assignments affect priority service teams and are due
                  before 16:00 today.
                </p>
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
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
                    className="pa-focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--pa-border)] px-2.5 text-[10px] font-extrabold text-[var(--pa-muted)] no-underline transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)]"
                  >
                    View structure
                    <ChevronRight size={13} aria-hidden="true" />
                  </Link>
                }
              />
              <div className="divide-y divide-[var(--pa-border)] sm:hidden">
                {DEPARTMENTS.map((department) => {
                  const coverage = Math.round(
                    (department.current / department.plan) * 100,
                  );
                  return (
                    <article key={department.name} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[11.5px] font-extrabold leading-5 text-[var(--pa-text)]">
                          {department.name}
                        </h3>
                        <StatusBadge tone={department.tone}>
                          {department.status}
                        </StatusBadge>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--pa-surface-muted)]">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              coverage < 90
                                ? "bg-[var(--pa-gold)]"
                                : "bg-[var(--pa-primary)]",
                            )}
                            style={{ width: `${coverage}%` }}
                          />
                        </div>
                        <span className="pa-tabular text-[10.5px] font-bold text-[var(--pa-muted)]">
                          {coverage}%
                        </span>
                      </div>
                      <div className="pa-tabular mt-2 text-[10px] font-semibold text-[var(--pa-faint)]">
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
                      <th className="px-6 py-3 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                        Department
                      </th>
                      <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                        Coverage
                      </th>
                      <th className="px-4 py-3 text-right text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                        Officers
                      </th>
                      <th className="px-6 py-3 text-right text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--pa-border)]">
                    {DEPARTMENTS.map((department) => {
                      const coverage = Math.round(
                        (department.current / department.plan) * 100,
                      );
                      return (
                        <tr
                          key={department.name}
                          className="transition-colors hover:bg-[var(--pa-canvas)]"
                        >
                          <td className="px-6 py-4">
                            <div className="text-[11.5px] font-extrabold text-[var(--pa-text)]">
                              {department.name}
                            </div>
                          </td>
                          <td className="w-[190px] px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--pa-surface-muted)]">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    coverage < 90
                                      ? "bg-[var(--pa-gold)]"
                                      : "bg-[var(--pa-primary)]",
                                  )}
                                  style={{ width: `${coverage}%` }}
                                />
                              </div>
                              <span className="pa-tabular w-8 text-right text-[10.5px] font-bold text-[var(--pa-muted)]">
                                {coverage}%
                              </span>
                            </div>
                          </td>
                          <td className="pa-tabular px-4 py-4 text-right text-[11px] font-bold text-[var(--pa-text)]">
                            {department.current}
                            <span className="font-medium text-[var(--pa-faint)]">
                              {" "}
                              / {department.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <StatusBadge tone={department.tone}>
                              {department.status}
                            </StatusBadge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)] xl:col-span-5">
              <PanelHeader
                eyebrow="People operations"
                title="Recent activity"
                description={
                  query
                    ? `${filteredActivity.length} matching update${filteredActivity.length === 1 ? "" : "s"}`
                    : "Latest changes across the administration"
                }
                action={
                  <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
                    <Activity size={15} aria-hidden="true" />
                  </div>
                }
              />
              {filteredActivity.length > 0 ? (
                <div className="divide-y divide-[var(--pa-border)] px-5 sm:px-6">
                  {filteredActivity.map((row) => (
                    <div key={`${row.name}-${row.action}`} className="flex gap-3 py-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] text-[10px] font-extrabold text-[var(--pa-primary)]">
                        {row.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[11.5px] font-extrabold text-[var(--pa-text)]">
                            {row.name}
                          </span>
                          <span className="pa-tabular text-[9.5px] font-semibold text-[var(--pa-faint)]">
                            {row.timestamp}
                          </span>
                        </div>
                        <div className="mt-1 text-[10.5px] font-semibold text-[var(--pa-muted)]">
                          {row.action}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="max-w-[220px] truncate text-[9.5px] font-medium text-[var(--pa-faint)]">
                            {row.department}
                          </span>
                          <StatusBadge tone={row.tone}>
                            {row.status}
                          </StatusBadge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
                  <Search
                    size={22}
                    className="text-[var(--pa-faint)]"
                    aria-hidden="true"
                  />
                  <div className="mt-3 text-[12px] font-extrabold text-[var(--pa-text)]">
                    No activity found
                  </div>
                  <p className="mt-1 max-w-[240px] text-[10.5px] leading-5 text-[var(--pa-muted)]">
                    Try a person, department, action, or status.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="pa-focus-ring mt-4 h-8 rounded-lg border border-[var(--pa-border)] px-3 text-[10px] font-extrabold text-[var(--pa-primary)]"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </section>
          </div>

          <footer className="mt-6 flex flex-col gap-2 border-t border-[var(--pa-border)] pt-5 text-[9.5px] font-semibold text-[var(--pa-faint)] sm:flex-row sm:items-center sm:justify-between">
            <span>GDT People Command Center · Design preview</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} aria-hidden="true" />
              Prototype isolated from production data
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
