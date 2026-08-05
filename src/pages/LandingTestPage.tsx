import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  Landmark,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plus,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useChart } from "../hooks/useChart";
import { useHrAdmin } from "../hooks/useHrAdmin";
import "./LandingTestPage.css";

type BadgeTone = "success" | "warning" | "info" | "neutral";

type LandingAuthState = {
  user: { id?: string; email?: string | null } | null;
  loading: boolean;
  displayName: string;
  avatarUrl: string | null;
  signOut: () => Promise<{ error: unknown | null }>;
};

type ChartRecord = {
  id: string;
  name: string | null;
  updated_at: string | null;
  owner_id: string | null;
  is_public: boolean | null;
  folder_id: string | null;
};

type FolderRecord = { id: string; name: string | null };

/** Entries shown per page of the register. */
const ENTRIES_PER_PAGE = 4;

/** The three levels the organization is recorded at, in Khmer-first order. */
const STRUCTURE_CLAUSES: Array<{
  labelKm: string;
  labelEn: string;
  detail: string;
  icon: LucideIcon;
}> = [
  {
    labelKm: "នាយកដ្ឋាន",
    labelEn: "Department",
    detail: "The top level of record. Every office belongs to exactly one.",
    icon: Landmark,
  },
  {
    labelKm: "ការិយាល័យ",
    labelEn: "Office",
    detail: "Functional units within a department, each with its own reporting line.",
    icon: Building2,
  },
  {
    labelKm: "មុខតំណែង",
    labelEn: "Position",
    detail: "One active occupant per position, one active position per officer.",
    icon: UserRound,
  },
];

/** How an ordinary officer comes to hold entries in the register. */
const ACCESS_STEPS: Array<{ title: string; detail: string }> = [
  {
    title: "Sign in",
    detail: "Create an account or sign in with your work email.",
  },
  {
    title: "Your charts appear",
    detail: "Charts you own and charts you were invited to sit together.",
  },
  {
    title: "Owners invite the rest",
    detail: "A chart owner grants view or edit access, one chart at a time.",
  },
];

/** Access tiers as the database actually enforces them. */
const ACCESS_TIERS: Array<{ tier: string; sees: string; tone: BadgeTone }> = [
  {
    tier: "Public visitor",
    sees: "Chart display data only. Staff profiles do not open.",
    tone: "neutral",
  },
  {
    tier: "Invited viewer",
    sees: "The chart and permitted profiles. National ID stays masked.",
    tone: "info",
  },
  {
    tier: "Invited editor",
    sees: "Everything a viewer sees, plus assign, transfer and vacate.",
    tone: "success",
  },
  {
    tier: "Chart owner",
    sees: "Full control of the chart, its layout and its invitations.",
    tone: "warning",
  },
];

const BADGE_STYLES: Record<BadgeTone, string> = {
  success:
    "border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]",
  warning: "border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)] text-[#735413]",
  info: "border-[var(--pa-info-border)] bg-[var(--pa-info-soft)] text-[var(--pa-info)]",
  neutral: "border-[var(--pa-border)] bg-[var(--pa-surface-muted)] text-[#47524c]",
};

const BADGE_DOT_STYLES: Record<BadgeTone, string> = {
  success: "bg-[var(--pa-primary)]",
  warning: "bg-[var(--pa-gold)]",
  info: "bg-[var(--pa-info)]",
  neutral: "bg-[var(--pa-muted)]",
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

function PanelHeader({
  eyebrow,
  index,
  title,
  description,
  action,
  titleId,
}: {
  eyebrow: string;
  index?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  titleId?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--pa-border)] px-5 py-4 sm:px-6">
      <div>
        <div className="flex items-center gap-2.5">
          {index && <span className="rg-index text-[11px]">{index}</span>}
          <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--pa-primary)]">
            {eyebrow}
          </span>
        </div>
        <h2
          id={titleId}
          className="mt-1.5 text-[16px] font-extrabold tracking-[-0.015em] text-[var(--pa-text)]"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[11.5px] leading-5 text-[var(--pa-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function formatRecordDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default function LandingTestPage() {
  const auth = useAuth() as unknown as LandingAuthState;
  const { user, loading: authLoading, displayName, avatarUrl, signOut } = auth;
  const { isHrAdmin } = useHrAdmin();
  const { charts, folders, loading: chartsLoading } = useChart() as unknown as {
    charts: ChartRecord[];
    folders: FolderRecord[];
    loading: boolean;
  };
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);

  const profileId = useId();
  const entriesTitleId = useId();
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!profileOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      profileButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  const folderNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const folder of folders ?? []) {
      if (folder?.id) map.set(folder.id, folder.name || "Untitled folder");
    }
    return map;
  }, [folders]);

  // Charts arrive ordered by `updated_at` descending, so page 1 is always the
  // four most recently touched.
  const allCharts = useMemo(() => charts ?? [], [charts]);
  const pageCount = Math.max(Math.ceil(allCharts.length / ENTRIES_PER_PAGE), 1);
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * ENTRIES_PER_PAGE;
  const entries = useMemo(
    () => allCharts.slice(pageStart, pageStart + ENTRIES_PER_PAGE),
    [allCharts, pageStart],
  );

  // Snap back into range when the register shrinks under the current page.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  // useChart never clears `loading` for a signed-out visitor, so the signed-in
  // check has to gate it rather than the hook's own flag.
  const entriesLoading = Boolean(user) && chartsLoading;
  const ownedCount = useMemo(
    () => (charts ?? []).filter((chart) => chart.owner_id === user?.id).length,
    [charts, user?.id],
  );
  const sharedCount = Math.max((charts ?? []).length - ownedCount, 0);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const primaryPath = user ? "/dashboard" : "/login";
  const primaryLabel = user ? "Open my charts" : "Sign in to the register";

  const closeMenus = () => setProfileOpen(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");

    try {
      const { error } = await signOut();
      if (error) {
        setSignOutError("We could not sign you out. Check your connection and try again.");
        return;
      }

      closeMenus();
      navigate("/login", { replace: true });
    } catch {
      setSignOutError("We could not sign you out. Check your connection and try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const avatar =
    avatarUrl && !avatarFailed ? (
      <img
        src={avatarUrl}
        alt=""
        className="size-full rounded-[7px] object-cover"
        referrerPolicy="no-referrer"
        onError={() => setAvatarFailed(true)}
      />
    ) : (
      <span aria-hidden="true">{(displayName || "U").charAt(0).toUpperCase()}</span>
    );

  return (
    <div className="gdt-register-landing pa-theme">
      {/* ── Masthead ─────────────────────────────────────── */}
      <header className="rg-double-rule sticky top-0 z-30 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] w-full max-w-[1540px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-10">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="pa-focus-ring group flex min-w-0 items-center rounded-lg no-underline transition-opacity hover:opacity-90 cursor-pointer"
            aria-label="GDT register home"
          >
            <img
              src="/GDT-Logo (Light).png"
              alt="GDT - General Department of Taxation"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-102"
            />
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {!authLoading && user && (
              <div
                className="relative"
                ref={profileRef}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setProfileOpen(false);
                  }
                }}
              >
                <button
                  ref={profileButtonRef}
                  type="button"
                  className="pa-focus-ring flex h-11 items-center gap-2 rounded-[9px] border border-[var(--pa-border)] bg-white px-2 transition-colors hover:border-[var(--pa-border-strong)] sm:px-2.5"
                  aria-expanded={profileOpen}
                  aria-controls={profileId}
                  aria-haspopup="menu"
                  onClick={() => {
                    setSignOutError("");
                    setProfileOpen((open) => !open);
                  }}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-[var(--pa-sidebar)] text-[10.5px] font-extrabold text-white">
                    {avatar}
                  </span>
                  <span className="hidden max-w-[150px] truncate text-[11.5px] font-extrabold text-[var(--pa-text)] sm:block">
                    {displayName}
                  </span>
                  <ChevronDown
                    size={14}
                    className="shrink-0 text-[var(--pa-muted)]"
                    aria-hidden="true"
                  />
                </button>

                {profileOpen && (
                  <div
                    id={profileId}
                    className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(84vw,272px)] overflow-hidden rounded-[12px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
                    aria-label="Account options"
                  >
                    <div className="flex items-center gap-2.5 border-b border-[var(--pa-border)] bg-[var(--pa-canvas)] px-3.5 py-3">
                      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[var(--pa-sidebar)] text-[12px] font-extrabold text-white">
                        {avatar}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-[12px] font-extrabold text-[var(--pa-text)]">
                          {displayName}
                        </strong>
                        <span className="block truncate text-[10px] font-medium text-[var(--pa-muted)]">
                          {user.email || "Signed-in account"}
                        </span>
                      </span>
                    </div>

                    <div className="p-1.5">
                      <Link
                        to="/dashboard"
                        onClick={closeMenus}
                        className="pa-focus-ring flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-bold text-[var(--pa-text)] no-underline transition-colors hover:bg-[var(--pa-canvas)]"
                      >
                        <LayoutDashboard
                          size={16}
                          className="text-[var(--pa-muted)]"
                          aria-hidden="true"
                        />
                        My charts
                      </Link>
                      <Link
                        to="/profile"
                        onClick={closeMenus}
                        className="pa-focus-ring flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-bold text-[var(--pa-text)] no-underline transition-colors hover:bg-[var(--pa-canvas)]"
                      >
                        <Settings2
                          size={16}
                          className="text-[var(--pa-muted)]"
                          aria-hidden="true"
                        />
                        Profile settings
                      </Link>
                      {isHrAdmin && (
                        <Link
                          to="/admin"
                          onClick={closeMenus}
                          className="pa-focus-ring mt-1 flex min-h-11 items-center gap-2.5 rounded-lg border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] px-2.5 text-[12px] font-extrabold text-[var(--pa-primary)] no-underline transition-colors hover:bg-[#dcebe2]"
                        >
                          <ShieldCheck size={16} aria-hidden="true" />
                          Admin portal
                          <ChevronRight size={14} className="ml-auto" aria-hidden="true" />
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-[var(--pa-border)] p-1.5">
                      <button
                        type="button"
                        className="pa-focus-ring flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-bold text-[var(--pa-danger)] transition-colors hover:bg-[var(--pa-danger-soft)] disabled:opacity-50"
                        onClick={handleSignOut}
                        disabled={signingOut}
                      >
                        {signingOut ? (
                          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <LogOut size={16} aria-hidden="true" />
                        )}
                        {signingOut ? "Signing out…" : "Sign out"}
                      </button>
                      {signOutError && (
                        <p
                          className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold leading-4 text-[var(--pa-danger)]"
                          role="alert"
                        >
                          {signOutError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {authLoading ? (
              <span
                className="flex h-11 items-center gap-2 rounded-[9px] border border-[var(--pa-border)] bg-white px-3.5 text-[11.5px] font-bold text-[var(--pa-muted)]"
                aria-live="polite"
              >
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Checking session
              </span>
            ) : (
              <Link
                to={primaryPath}
                className="pa-focus-ring inline-flex h-11 items-center gap-2 rounded-[9px] bg-[var(--pa-primary)] px-3.5 text-[11.5px] font-extrabold text-white no-underline transition-colors hover:bg-[var(--pa-primary-hover)] sm:px-4"
              >
                {user ? "My charts" : "Sign in"}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1540px] px-4 pb-16 pt-8 sm:px-7 lg:px-10 lg:pt-11">
        {/* ── Register head ──────────────────────────────── */}
        <section className="grid gap-6 lg:grid-cols-12 lg:gap-8" aria-labelledby="rg-head-title">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rg-index text-[11px]">01</span>
              <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--pa-primary)]">
                Register of organization
              </span>
            </div>

            <h1 id="rg-head-title" className="mt-4">
              <span className="rg-khmer-display block text-[24px] text-[var(--pa-text)] sm:text-[30px]">
                រចនាសម្ព័ន្ធតែមួយ
              </span>
              <span className="mt-2 block text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-[var(--pa-text)] sm:text-[42px] lg:text-[46px]">
                One organization,
                <br />
                kept as one record.
              </span>
            </h1>

            <p className="mt-5 max-w-[54ch] text-[13px] leading-6 text-[var(--pa-muted)] sm:text-[13.5px]">
              Departments, offices and positions are recorded once and referenced
              live by every chart. Charts hold structure; the register holds the
              people. Nothing personal is copied between them.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {authLoading ? (
                <span className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-[var(--pa-border)] bg-white px-5 text-[12.5px] font-bold text-[var(--pa-muted)]">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Checking session
                </span>
              ) : (
                <Link
                  to={primaryPath}
                  className="pa-focus-ring inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-[var(--pa-primary)] px-5 text-[12.5px] font-extrabold text-white no-underline shadow-[var(--pa-shadow)] transition-colors hover:bg-[var(--pa-primary-hover)]"
                >
                  {primaryLabel}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
              <span className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-[var(--pa-border)] bg-white px-4 text-[11.5px] font-bold text-[var(--pa-muted)]">
                <CalendarDays size={15} aria-hidden="true" />
                <span className="pa-tabular">{today}</span>
              </span>
            </div>
          </div>

          {/* Right-hand extract: the visitor's own standing in the register. */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]">
              {user ? (
                <>
                  <PanelHeader
                    eyebrow="Your standing"
                    title={displayName}
                    description={user.email || "Signed-in account"}
                  />
                  <div className="grid grid-cols-2 divide-x divide-[var(--pa-border)] border-b border-[var(--pa-border)]">
                    <div className="px-5 py-4">
                      <div className="pa-tabular text-[26px] font-extrabold leading-none tracking-[-0.035em] text-[var(--pa-text)]">
                        {entriesLoading ? (
                          <span className="rg-skeleton inline-block h-[26px] w-10 align-middle" />
                        ) : (
                          ownedCount
                        )}
                      </div>
                      <div className="mt-2.5 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[var(--pa-muted)]">
                        Charts you own
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <div className="pa-tabular text-[26px] font-extrabold leading-none tracking-[-0.035em] text-[var(--pa-text)]">
                        {entriesLoading ? (
                          <span className="rg-skeleton inline-block h-[26px] w-10 align-middle" />
                        ) : (
                          sharedCount
                        )}
                      </div>
                      <div className="mt-2.5 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[var(--pa-muted)]">
                        Shared with you
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <Link
                      to="/dashboard"
                      className="pa-focus-ring flex min-h-11 items-center justify-center gap-2 rounded-[9px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] px-4 text-[11.5px] font-extrabold text-[var(--pa-text)] no-underline transition-colors hover:border-[var(--pa-border-strong)] hover:bg-white"
                    >
                      <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
                      New chart
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <PanelHeader
                    eyebrow="Extract"
                    title="How you get an entry"
                    description="Three steps, in the order they happen."
                  />
                  <ol className="list-none divide-y divide-[var(--pa-border)]">
                    {ACCESS_STEPS.map((step, index) => (
                      <li key={step.title} className="flex gap-3.5 px-5 py-4 sm:px-6">
                        <span className="rg-index mt-px text-[11px]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] font-extrabold text-[var(--pa-text)]">
                            {step.title}
                          </div>
                          <p className="mt-1 text-[10.5px] leading-[1.55] text-[var(--pa-muted)]">
                            {step.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="border-t border-[var(--pa-border)] p-5">
                    <Link
                      to="/login"
                      className="pa-focus-ring flex min-h-11 items-center justify-center gap-2 rounded-[9px] bg-[var(--pa-primary)] px-4 text-[11.5px] font-extrabold text-white no-underline transition-colors hover:bg-[var(--pa-primary-hover)]"
                    >
                      Sign in
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Entries: the signed-in officer's own rows ──── */}
        {user && (
          <section
            className="mt-9 overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
            aria-labelledby={entriesTitleId}
          >
            <PanelHeader
              titleId={entriesTitleId}
              eyebrow="Entries in your name"
              title="Your charts"
              description={
                entriesLoading
                  ? "Reading the register…"
                  : `${(charts ?? []).length} chart${(charts ?? []).length === 1 ? "" : "s"} on record`
              }
              action={
                <Link
                  to="/dashboard"
                  className="pa-focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--pa-border)] px-3 text-[10.5px] font-extrabold text-[var(--pa-muted)] no-underline transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)]"
                >
                  View all
                  <ChevronRight size={13} aria-hidden="true" />
                </Link>
              }
            />

            {entriesLoading ? (
              <ul className="divide-y divide-[var(--pa-border)]">
                {[0, 1, 2].map((row) => (
                  <li key={row} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <span className="rg-skeleton h-3 w-6 shrink-0" />
                    <span className="rg-skeleton h-3.5 w-[42%]" />
                    <span className="rg-skeleton ml-auto hidden h-3 w-20 sm:block" />
                  </li>
                ))}
                <li className="sr-only" aria-live="polite">
                  Loading your charts
                </li>
              </ul>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <span className="flex size-11 items-center justify-center rounded-[10px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] text-[var(--pa-faint)]">
                  <Folder size={19} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[13px] font-extrabold text-[var(--pa-text)]">
                  No charts on record yet
                </h3>
                <p className="mt-1.5 max-w-[38ch] text-[11.5px] leading-5 text-[var(--pa-muted)]">
                  Your first chart starts the register in your name. You can begin
                  from the GDT template or from an empty canvas.
                </p>
                <Link
                  to="/dashboard"
                  className="pa-focus-ring mt-5 inline-flex min-h-11 items-center gap-2 rounded-[9px] bg-[var(--pa-primary)] px-4 text-[11.5px] font-extrabold text-white no-underline transition-colors hover:bg-[var(--pa-primary-hover)]"
                >
                  <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
                  Create your first chart
                </Link>
              </div>
            ) : (
              <>
                {/* Mobile: one ruled card per entry. */}
                <ul className="divide-y divide-[var(--pa-border)] sm:hidden">
                  {entries.map((chart, index) => (
                    <li key={chart.id}>
                      <Link
                        to={`/chart/${chart.id}`}
                        className="rg-entry flex items-start gap-3 px-5 py-4 no-underline"
                      >
                        <span className="rg-index mt-0.5 text-[11px]">
                          {String(pageStart + index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-extrabold text-[var(--pa-text)]">
                            {chart.name || "Untitled chart"}
                          </span>
                          <span className="pa-tabular mt-1 block text-[10px] font-semibold text-[var(--pa-faint)]">
                            Updated {formatRecordDate(chart.updated_at)}
                          </span>
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            <StatusBadge
                              tone={chart.owner_id === user.id ? "success" : "info"}
                              dot={false}
                            >
                              {chart.owner_id === user.id ? "Owner" : "Shared"}
                            </StatusBadge>
                            {chart.is_public && (
                              <StatusBadge tone="warning" dot={false}>
                                Public link
                              </StatusBadge>
                            )}
                          </span>
                        </span>
                        <ChevronRight
                          size={16}
                          className="rg-entry-arrow mt-0.5 shrink-0 text-[var(--pa-faint)]"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Desktop: the register table proper. */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[600px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[var(--pa-border)] bg-[var(--pa-canvas)]">
                        <th
                          scope="col"
                          className="w-14 py-3 pl-6 pr-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]"
                        >
                          No.
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-3 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]"
                        >
                          Chart
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]"
                        >
                          Folder
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]"
                        >
                          Updated
                        </th>
                        <th
                          scope="col"
                          className="py-3 pl-4 pr-6 text-right text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]"
                        >
                          Standing
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--pa-border)]">
                      {entries.map((chart, index) => (
                        <tr key={chart.id} className="rg-entry">
                          <td className="rg-index py-4 pl-6 pr-2 text-[11px]">
                            {String(pageStart + index + 1).padStart(2, "0")}
                          </td>
                          <td className="px-2 py-4">
                            <Link
                              to={`/chart/${chart.id}`}
                              className="pa-focus-ring inline-flex items-center gap-1.5 text-[12px] font-extrabold text-[var(--pa-text)] no-underline"
                            >
                              {chart.name || "Untitled chart"}
                              <ChevronRight
                                size={14}
                                className="rg-entry-arrow text-[var(--pa-faint)]"
                                aria-hidden="true"
                              />
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-[11px] font-semibold text-[var(--pa-muted)]">
                            {chart.folder_id
                              ? folderNames.get(chart.folder_id) || "Untitled folder"
                              : "—"}
                          </td>
                          <td className="pa-tabular px-4 py-4 text-[11px] font-semibold text-[var(--pa-muted)]">
                            {formatRecordDate(chart.updated_at)}
                          </td>
                          <td className="py-4 pl-4 pr-6 text-right">
                            <span className="inline-flex flex-wrap justify-end gap-1.5">
                              {chart.is_public && (
                                <StatusBadge tone="warning" dot={false}>
                                  Public link
                                </StatusBadge>
                              )}
                              <StatusBadge
                                tone={chart.owner_id === user.id ? "success" : "info"}
                              >
                                {chart.owner_id === user.id ? "Owner" : "Shared"}
                              </StatusBadge>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pageCount > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pa-border)] bg-[var(--pa-canvas)] px-5 py-3 sm:px-6">
                    <p
                      className="pa-tabular text-[10.5px] font-bold text-[var(--pa-muted)]"
                      aria-live="polite"
                    >
                      Entries {String(pageStart + 1).padStart(2, "0")}–
                      {String(pageStart + entries.length).padStart(2, "0")} of{" "}
                      {allCharts.length}
                    </p>

                    <nav className="flex items-center gap-1.5" aria-label="Register pages">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(current - 1, 1))}
                        disabled={safePage === 1}
                        aria-label="Previous entries"
                        className="pa-focus-ring flex size-11 items-center justify-center rounded-lg border border-[var(--pa-border)] bg-white text-[var(--pa-muted)] transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--pa-border)]"
                      >
                        <ChevronLeft size={16} aria-hidden="true" />
                      </button>

                      {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          aria-label={`Page ${pageNumber}`}
                          aria-current={pageNumber === safePage ? "page" : undefined}
                          className={cn(
                            "pa-tabular pa-focus-ring size-11 rounded-lg border text-[11px] font-extrabold transition-colors",
                            pageNumber === safePage
                              ? "border-[var(--pa-primary)] bg-[var(--pa-primary)] text-white"
                              : "border-[var(--pa-border)] bg-white text-[var(--pa-muted)] hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)]",
                          )}
                        >
                          {pageNumber}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.min(current + 1, pageCount))}
                        disabled={safePage === pageCount}
                        aria-label="Next entries"
                        className="pa-focus-ring flex size-11 items-center justify-center rounded-lg border border-[var(--pa-border)] bg-white text-[var(--pa-muted)] transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--pa-border)]"
                      >
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Article band: how the record is structured ─── */}
        <section
          className="rg-article mt-9 overflow-hidden rounded-[14px]"
          aria-labelledby="rg-article-title"
        >
          <div className="px-5 pb-2 pt-6 sm:px-8 sm:pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="flex items-center gap-2.5">
                <span className="rg-index text-[11px]">02</span>
                <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#efd78d]">
                  Structure of record
                </span>
              </div>
            </div>
            <h2
              id="rg-article-title"
              className="mt-3 max-w-[34ch] text-[22px] font-extrabold leading-[1.18] tracking-[-0.03em] text-white sm:text-[27px]"
            >
              Every officer sits at three levels at once.
            </h2>
          </div>

          <div className="rg-article-rule mx-5 mt-6 h-0.5 sm:mx-8" aria-hidden="true" />

          <ol className="grid list-none gap-px bg-[var(--pa-sidebar-border)] sm:grid-cols-3">
            {STRUCTURE_CLAUSES.map((clause, index) => {
              const Icon = clause.icon;
              return (
                <li
                  key={clause.labelEn}
                  className="rg-tick relative bg-[var(--pa-sidebar)] px-5 pb-7 pt-6 sm:px-8"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="rg-index text-[11px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.07] text-[#efd78d]">
                      <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-4">
                    <span className="rg-khmer block text-[14px] font-bold text-white">
                      {clause.labelKm}
                    </span>
                    <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#efd78d]">
                      {clause.labelEn}
                    </span>
                  </h3>
                  <p className="mt-3 max-w-[34ch] text-[11.5px] leading-[1.65] text-[var(--pa-sidebar-muted)]">
                    {clause.detail}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── Closing article: privacy by architecture ───── */}
        <section
          className="mt-9 overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
          aria-labelledby="rg-privacy-title"
        >
          <PanelHeader
            titleId="rg-privacy-title"
            index="03"
            eyebrow="Conditions of access"
            title="A chart never carries a personal record"
            description="Profile data loads live through permission-checked queries, so the same chart can be shared at different privacy tiers."
          />
          <div className="grid gap-px bg-[var(--pa-border)] sm:grid-cols-2 lg:grid-cols-4">
            {ACCESS_TIERS.map((row) => (
              <div key={row.tier} className="bg-white px-5 py-5 sm:px-6">
                <StatusBadge tone={row.tone}>{row.tier}</StatusBadge>
                <p className="mt-3.5 text-[11.5px] leading-[1.6] text-[var(--pa-muted)]">
                  {row.sees}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--pa-border)] bg-[var(--pa-canvas)] px-5 py-4 sm:px-6">
            <Users size={15} className="shrink-0 text-[var(--pa-primary)]" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[11px] font-semibold leading-5 text-[var(--pa-muted)]">
              A staff profile only opens on request — never on an ordinary click —
              so browsing a chart cannot expose a personal record by accident.
            </p>
            {!authLoading && !user && (
              <Link
                to="/login"
                className="pa-focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[9px] bg-[var(--pa-primary)] px-4 text-[11.5px] font-extrabold text-white no-underline transition-colors hover:bg-[var(--pa-primary-hover)]"
              >
                Sign in
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--pa-border)] bg-white">
        <div className="mx-auto flex w-full max-w-[1540px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-[10px] font-semibold text-[var(--pa-faint)] sm:px-7 lg:px-10">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rg-khmer text-[var(--pa-muted)]">អគ្គនាយកដ្ឋានពន្ធដារ</span>
            <span aria-hidden="true">·</span>
            <span>General Department of Taxation</span>
          </p>
          <p>Ministry of Economy and Finance · Kingdom of Cambodia</p>
        </div>
      </footer>
    </div>
  );
}
