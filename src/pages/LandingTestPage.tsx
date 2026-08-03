import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  LayoutDashboard,
  Lock,
  Menu,
  Network,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { useHrAdmin } from "../hooks/useHrAdmin";
import "./AdminDashboardTestPage.css";

type OrgLevel = "directorate" | "department" | "office" | "position";

const ORG_LEVEL_COPY: Record<OrgLevel, { title: string; description: string }> = {
  directorate: {
    title: "Directorate",
    description:
      "The root of every chart — one directorate, owning the full department and office hierarchy beneath it.",
  },
  department: {
    title: "Department",
    description:
      "Departments group offices by function. Each department determines which offices are available to place staff into.",
  },
  office: {
    title: "Office",
    description:
      "Offices sit inside a department and hold the actual reporting positions officers are assigned to.",
  },
  position: {
    title: "Position",
    description:
      "One officer per active position, one active position per officer — enforced at the database layer, not just the form.",
  },
};

const NAV_LINKS = [
  { label: "Overview", path: "/admin", icon: LayoutDashboard },
  { label: "Staff Directory", path: "/admin/staff", icon: UsersRound },
  { label: "Organization", path: "/admin/org-structure", icon: Building2 },
  { label: "Job Architecture", path: "/admin/job-architecture", icon: BriefcaseBusiness },
] as const;

/** A short connector between hierarchy levels, with node dots at each end. */
function Connector({ depth }: { depth: number }) {
  return (
    <div
      className="relative flex h-7 w-px items-center justify-center"
      style={{ transform: `translateZ(${depth}px)` }}
      aria-hidden="true"
    >
      <span className="absolute -top-1 size-1.5 rounded-full bg-[var(--pa-border-strong)]" />
      <span className="h-full w-px bg-[var(--pa-border-strong)]" />
      <span className="absolute -bottom-1 size-1.5 rounded-full bg-[var(--pa-border-strong)]" />
    </div>
  );
}

/**
 * A hierarchy level rendered as a shallow stack of cards — two faint ghost
 * cards behind the real, clickable one — to honestly represent "many of
 * these exist" without inventing specific names or counts.
 */
function HierarchyStack({
  depth,
  width,
  label,
  sublabel,
  active,
  onSelect,
  trailingIcon,
}: {
  depth: number;
  width: number;
  label: string;
  sublabel: string;
  active: boolean;
  onSelect: () => void;
  trailingIcon: React.ReactNode;
}) {
  return (
    <div className="relative" style={{ width, transform: `translateZ(${depth}px)` }}>
      <div
        className="absolute inset-0 rounded-lg border border-[var(--pa-border)] bg-white"
        style={{ transform: "translate(10px, 8px) rotate(3deg)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 rounded-lg border border-[var(--pa-border)] bg-white/85"
        style={{ transform: "translate(5px, 4px) rotate(1.5deg)" }}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onSelect}
        className={`relative flex w-full items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left shadow-md transition-colors ${
          active
            ? "border-[#136232] bg-[var(--pa-primary-soft)]"
            : "border-[var(--pa-border)] bg-white hover:border-[var(--pa-border-strong)]"
        }`}
      >
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-[var(--pa-text)]">{label}</div>
          <div className="truncate text-[9.5px] font-semibold text-[var(--pa-faint)]">
            {sublabel}
          </div>
        </div>
        {trailingIcon}
      </button>
    </div>
  );
}

export default function LandingTestPage() {
  const { user } = useAuth();
  const { isHrAdmin } = useHrAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLevel, setActiveLevel] = useState<OrgLevel>("directorate");

  const heroStageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const handleMove = (event: MouseEvent) => {
      if (!heroStageRef.current) return;
      const rect = heroStageRef.current.getBoundingClientRect();
      const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      setTilt({
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [reducedMotion]);

  // HR administrators land in the admin portal; every other signed-in user
  // (the broader audience — anyone who owns a chart) lands on their own
  // charts instead, not on a page their role can't open.
  const dashboardPath = !user ? "/login" : isHrAdmin ? "/admin" : "/dashboard";
  const ctaLabel = !user ? "Sign in" : isHrAdmin ? "Open the portal" : "My charts";

  // A signed-in, non-admin visitor is a known quantity — not "might not have
  // access yet" like a signed-out visitor, but "definitely doesn't." Links to
  // HR-admin-only pages render inert for them instead of dead-ending on the
  // HrAdminRoute access-denied wall after a click.
  const isBlocked = Boolean(user) && !isHrAdmin;

  return (
    <div
      className="admin-dashboard-test landing-test-page min-h-screen bg-[#f4f7f4] text-[#1c2826] antialiased selection:bg-[#136232] selection:text-white"
      style={{ height: "auto", minHeight: "100dvh", overflow: "visible" }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--pa-border)] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <img
              src="/gdt-seal.png"
              alt="General Department of Taxation seal"
              className="size-10 shrink-0 object-contain"
            />
            <div className="flex flex-col leading-tight">
              <span
                className="text-[15px] font-extrabold text-[#0f4d27]"
                style={{ fontFamily: "'Noto Sans Khmer', sans-serif" }}
                dir="auto"
              >
                អគ្គនាយកដ្ឋានពន្ធដារ
              </span>
              <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                General Department of Taxation
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) =>
              isBlocked ? (
                <span
                  key={link.label}
                  aria-disabled="true"
                  title="Requires HR administrator access"
                  className="cursor-not-allowed rounded-lg px-3.5 py-2 text-[12.5px] font-bold text-[var(--pa-faint)]"
                >
                  {link.label}
                </span>
              ) : (
                <Link
                  key={link.label}
                  to={link.path}
                  className="rounded-lg px-3.5 py-2 text-[12.5px] font-bold text-[var(--pa-muted)] no-underline transition-colors hover:bg-[var(--pa-surface-muted)] hover:text-[#0f4d27]"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user && isHrAdmin && (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-bold text-[var(--pa-muted)] no-underline transition-colors hover:bg-[var(--pa-surface-muted)] hover:text-[#0f4d27]"
              >
                <Network size={14} />
                My charts
              </Link>
            )}
            <Link
              to={dashboardPath}
              className="pa-focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-[#136232] px-4 text-[12px] font-extrabold text-white no-underline transition-colors hover:bg-[#0f4d27]"
            >
              {ctaLabel}
              <ArrowRight size={14} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex size-10 items-center justify-center rounded-lg border border-[var(--pa-border)] text-[var(--pa-text)] md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={19} />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="fixed inset-0 bg-[#081a12]/55"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />
          <nav className="relative flex h-full w-[min(85vw,300px)] flex-col bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--pa-border)] pb-4">
              <div className="flex items-center gap-2.5">
                <img src="/gdt-seal.png" alt="" className="size-8" />
                <span
                  className="text-[13px] font-extrabold text-[#0f4d27]"
                  style={{ fontFamily: "'Noto Sans Khmer', sans-serif" }}
                  dir="auto"
                >
                  អគ្គនាយកដ្ឋានពន្ធដារ
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-[var(--pa-muted)] hover:bg-[var(--pa-canvas)]"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 pt-5">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                if (isBlocked) {
                  return (
                    <span
                      key={link.label}
                      aria-disabled="true"
                      title="Requires HR administrator access"
                      className="flex items-center gap-2.5 rounded-lg p-3 text-[13px] font-bold text-[var(--pa-faint)]"
                    >
                      <Icon size={16} className="text-[var(--pa-faint)]" />
                      {link.label}
                      <Lock size={12} className="ml-auto shrink-0" aria-hidden="true" />
                    </span>
                  );
                }
                return (
                  <Link
                    key={link.label}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg p-3 text-[13px] font-bold text-[var(--pa-text)] no-underline hover:bg-[var(--pa-surface-muted)]"
                  >
                    <Icon size={16} className="text-[#136232]" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-auto flex flex-col gap-2">
              {user && isHrAdmin && (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg p-3 text-[13px] font-bold text-[var(--pa-text)] no-underline hover:bg-[var(--pa-surface-muted)]"
                >
                  <Network size={16} className="text-[#136232]" />
                  My charts
                </Link>
              )}
              <Link
                to={dashboardPath}
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#136232] text-[12.5px] font-extrabold text-white no-underline"
              >
                {ctaLabel}
              </Link>
            </div>
          </nav>
        </div>
      )}

      {/* ── Hero: the one authored depth moment ────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-4 pb-16 pt-14 sm:px-7 lg:px-10 lg:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <h1
              className="text-[32px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[#0f4d27] sm:text-[42px] lg:text-[46px]"
              style={{ fontFamily: "'Noto Sans Khmer', sans-serif" }}
              dir="auto"
            >
              ប្រព័ន្ធគ្រប់គ្រងរចនាសម្ព័ន្ធ និងបុគ្គលិក
            </h1>
            <p className="mt-4 max-w-xl text-[15px] font-medium leading-relaxed text-[var(--pa-muted)] sm:text-[16.5px]">
              A single, shared organizational chart and HR staff directory for
              the <span className="font-bold text-[var(--pa-text)]">General
              Department of Taxation</span> — one Department → Office →
              Position hierarchy, one record per officer, enforced where it
              actually matters: the database, not just the form.
            </p>

            <div className="mt-8 flex flex-col gap-3 max-w-md">
              {[
                "One shared staff directory across the whole department",
                "Skill proficiency levels 1–5, matched against position requirements",
                "Row-level security enforced in Postgres, not just hidden in the UI",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2.5">
                  <ShieldCheck
                    size={16}
                    className="mt-0.5 shrink-0 text-[#136232]"
                    aria-hidden="true"
                  />
                  <span className="text-[13px] font-semibold leading-5 text-[var(--pa-text)]">
                    {point}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to={dashboardPath}
                className="pa-focus-ring inline-flex h-12 items-center gap-2 rounded-lg bg-[#136232] px-6 text-[13.5px] font-extrabold text-white no-underline transition-colors hover:bg-[#0f4d27]"
              >
                {!user ? "Sign in to the portal" : ctaLabel}
                <ArrowRight size={16} />
              </Link>
              {isBlocked ? (
                <span
                  aria-disabled="true"
                  title="Requires HR administrator access"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-[var(--pa-border)] bg-[var(--pa-canvas)] px-5 text-[13.5px] font-extrabold text-[var(--pa-faint)]"
                >
                  <Lock size={14} aria-hidden="true" />
                  Structure view is admin-only
                </span>
              ) : (
                <Link
                  to="/admin/org-structure"
                  className="pa-focus-ring inline-flex h-12 items-center gap-2 rounded-lg border border-[var(--pa-border)] bg-white px-5 text-[13.5px] font-extrabold text-[var(--pa-text)] no-underline transition-colors hover:border-[var(--pa-border-strong)]"
                >
                  See the structure
                  <ChevronRight size={15} />
                </Link>
              )}
            </div>
          </div>

          {/* Interactive layered hierarchy — the real 3D moment */}
          <div className="lg:col-span-6">
            <div
              ref={heroStageRef}
              className="relative min-h-[560px] w-full overflow-hidden rounded-2xl border border-[var(--pa-border)] bg-white p-6 shadow-[0_30px_70px_-24px_rgba(19,98,50,0.25)]"
              style={{ perspective: "1400px" }}
            >
              <div className="relative z-10 mb-8 flex items-center justify-between border-b border-[var(--pa-border)] pb-4">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--pa-muted)]">
                  Reporting hierarchy
                </span>
                <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-[var(--pa-faint)]">
                  <span className="size-1.5 rounded-full bg-[#136232]" aria-hidden="true" />
                  Tap a level to explore
                </span>
              </div>

              <div
                className="relative flex flex-col items-center gap-8 py-4"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Depth grounding grid — a real spatial cue, not decoration */}
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-[0.35]"
                  style={{
                    transform: "translateZ(-40px) rotateX(62deg)",
                    backgroundImage:
                      "linear-gradient(var(--pa-border) 1px, transparent 1px), linear-gradient(90deg, var(--pa-border) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                    maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
                  }}
                  aria-hidden="true"
                />

                <div
                  className="relative transition-transform duration-200 ease-out"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: `rotateX(${tilt.y * -6}deg) rotateY(${tilt.x * 8}deg)`,
                  }}
                >
                  <div className="flex flex-col items-center gap-7">
                    {/* Level 1: Directorate — genuinely singular, no stack */}
                    <button
                      type="button"
                      onClick={() => setActiveLevel("directorate")}
                      style={{ transform: "translateZ(84px)" }}
                      className={`flex w-[300px] items-center gap-3 rounded-xl border p-4 text-left shadow-lg transition-colors ${
                        activeLevel === "directorate"
                          ? "border-[#136232] bg-[#136232] text-white"
                          : "border-[var(--pa-border)] bg-white text-[var(--pa-text)] hover:border-[var(--pa-border-strong)]"
                      }`}
                    >
                      <img src="/gdt-seal.png" alt="" className="size-8 shrink-0 object-contain" />
                      <div className="min-w-0">
                        <div
                          className="truncate text-[13.5px] font-extrabold"
                          style={{ fontFamily: "'Noto Sans Khmer', sans-serif" }}
                          dir="auto"
                        >
                          អគ្គនាយកដ្ឋានពន្ធដារ
                        </div>
                        <div
                          className={`text-[10.5px] font-bold ${
                            activeLevel === "directorate" ? "text-white/75" : "text-[var(--pa-muted)]"
                          }`}
                        >
                          Directorate · one, at the root
                        </div>
                      </div>
                    </button>

                    <Connector depth={64} />

                    {/* Level 2: Department — stacked, because many exist */}
                    <HierarchyStack
                      depth={64}
                      width={260}
                      label="Department"
                      sublabel="many, in parallel"
                      active={activeLevel === "department"}
                      onSelect={() => setActiveLevel("department")}
                      trailingIcon={<ChevronRight size={14} className="text-[var(--pa-faint)]" />}
                    />

                    <Connector depth={44} />

                    {/* Level 3: Office — stacked inside a department */}
                    <HierarchyStack
                      depth={44}
                      width={224}
                      label="Office"
                      sublabel="grouped by department"
                      active={activeLevel === "office"}
                      onSelect={() => setActiveLevel("office")}
                      trailingIcon={<ChevronRight size={13} className="text-[var(--pa-faint)]" />}
                    />

                    <Connector depth={22} />

                    {/* Level 4: Position — one officer each */}
                    <HierarchyStack
                      depth={22}
                      width={190}
                      label="Position"
                      sublabel="one officer, one seat"
                      active={activeLevel === "position"}
                      onSelect={() => setActiveLevel("position")}
                      trailingIcon={<UsersRound size={13} className="text-[var(--pa-faint)]" />}
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-8 rounded-lg border border-[var(--pa-border)] bg-[var(--pa-canvas)] p-3.5">
                <div className="text-[11px] font-extrabold text-[#136232]">
                  {ORG_LEVEL_COPY[activeLevel].title}
                </div>
                <p className="mt-1 text-[11px] leading-5 text-[var(--pa-muted)]">
                  {ORG_LEVEL_COPY[activeLevel].description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────── */}
      <section className="border-t border-[var(--pa-border)]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-3 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <Award size={20} className="shrink-0 text-[#136232]" aria-hidden="true" />
            <p className="text-[13px] font-semibold leading-5 text-[var(--pa-text)]">
              Built on Supabase Postgres with row-level security enforced at
              the database layer — permissions hold even if a request never
              goes through this interface.
            </p>
          </div>
          <Link
            to="/admin"
            className="pa-focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--pa-border)] px-3.5 text-[11.5px] font-extrabold text-[var(--pa-text)] no-underline transition-colors hover:border-[var(--pa-border-strong)]"
          >
            View the portal
            <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--pa-border)] bg-white py-6">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:px-7 sm:text-left lg:px-10">
          <div className="flex items-center gap-2.5">
            <img src="/gdt-seal.png" alt="" className="size-5 object-contain" />
            <span
              className="text-[12px] font-extrabold text-[#0f4d27]"
              style={{ fontFamily: "'Noto Sans Khmer', sans-serif" }}
              dir="auto"
            >
              អគ្គនាយកដ្ឋានពន្ធដារ
            </span>
            <span className="text-[11px] font-semibold text-[var(--pa-faint)]">
              General Department of Taxation
            </span>
          </div>
          <div className="text-[10.5px] font-semibold text-[var(--pa-faint)]">
            Ministry of Economy and Finance · Kingdom of Cambodia
          </div>
        </div>
      </footer>
    </div>
  );
}
