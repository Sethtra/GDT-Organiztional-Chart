import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Award,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  UserRound,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";

import AdminConfirmModal from "../components/admin/AdminConfirmModal";
import AdminFooter from "../components/admin/AdminFooter";
import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";
import StaffFormDialog from "../components/staff/StaffFormDialog";
import StaffProfileDialog from "../components/staff/StaffProfileDialog";
import StaffSkillsDialog from "../components/staff/StaffSkillsDialog";
import { cn } from "../lib/utils";
import type { HrStaffDirectoryRecord } from "../contracts/hr";
import { useOrgStructure } from "../hooks/useOrgStructure";
import { archiveStaff, listHrStaff } from "../services/staffService";
import {
  getStaffLocationLabel,
  getStaffPositionTitle,
} from "../utils/staffDisplay";
import "./AdminDashboardTestPage.css";

type BadgeTone = "success" | "warning" | "info" | "neutral" | "danger";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const GENDER_LABELS: Record<HrStaffDirectoryRecord["gender"], string> = {
  male: "ប្រុស",
  female: "ស្រី",
  other: "ផ្សេងៗ",
  unspecified: "—",
};

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

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function StaffDirectoryPage() {
  const { units, getOfficesForUnit } = useOrgStructure();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [staff, setStaff] = useState<HrStaffDirectoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HrStaffDirectoryRecord | null>(null);
  const [archiveTarget, setArchiveTarget] =
    useState<HrStaffDirectoryRecord | null>(null);
  const [skillsTarget, setSkillsTarget] =
    useState<HrStaffDirectoryRecord | null>(null);
  const [profileTarget, setProfileTarget] =
    useState<HrStaffDirectoryRecord | null>(null);
  const [archiving, setArchiving] = useState(false);

  const availableOffices = useMemo(
    () => (selectedDepartment ? getOfficesForUnit(selectedDepartment) : []),
    [getOfficesForUnit, selectedDepartment],
  );

  const load = useCallback(async (): Promise<HrStaffDirectoryRecord[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await listHrStaff(true);
      setStaff(data);
      return data;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the staff directory.",
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveStaff(archiveTarget.id);
      setArchiveTarget(null);
      await load();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive this officer record.",
      );
      setArchiveTarget(null);
    } finally {
      setArchiving(false);
    }
  };

  const handleOfficerSaved = async (
    savedStaffId: string,
    manageSkills: boolean,
  ) => {
    const nextStaff = await load();
    if (!manageSkills) return;
    const savedStaff = nextStaff.find((person) => person.id === savedStaffId);
    if (savedStaff) setSkillsTarget(savedStaff);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return staff.filter((person) => {
      if (!includeArchived && person.status === "archived") {
        return false;
      }
      if (selectedDepartment) {
        const dept =
          person.organizationalPlacement?.departmentName ??
          person.currentPosition?.departmentName;
        if (dept !== selectedDepartment) return false;
      }
      if (selectedDepartment && selectedOffice) {
        const office =
          person.organizationalPlacement?.officeName ??
          person.currentPosition?.officeName;
        if (office !== selectedOffice) return false;
      }
      if (!query) return true;
      return [
        person.name,
        person.nameEn,
        person.employeeId,
        person.jobTitle?.name,
        person.jobTitle?.nameEn,
        getStaffLocationLabel(person),
      ].some((value) => value?.toLocaleLowerCase().includes(query));
    });
  }, [includeArchived, search, selectedDepartment, selectedOffice, staff]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedDepartment, selectedOffice, includeArchived, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const kpis = useMemo(() => {
    const active = staff.filter((person) => person.status === "active").length;
    const archived = staff.filter((person) => person.status === "archived").length;
    const departments = new Set(
      staff
        .map(
          (person) =>
            person.organizationalPlacement?.departmentName ??
            person.currentPosition?.departmentName ??
            null,
        )
        .filter((name): name is string => Boolean(name)),
    ).size;
    return {
      total: staff.length,
      active,
      archived,
      departments,
    };
  }, [staff]);

  return (
    <div className="admin-dashboard-test flex h-screen overflow-hidden bg-[var(--pa-canvas)]">
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] lg:flex h-full">
        <AdminSidebar currentTab="staff" />
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
              className="pa-focus-ring absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-lg text-[var(--pa-sidebar-muted)] transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <AdminSidebar currentTab="staff" onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col h-full overflow-hidden min-w-0">
        <AdminHeader
          mobileNavOpen={mobileNavOpen}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search officers, employee IDs, or positions"
          searchLabel="Search officers"
        />

        <main className="pa-scrollbar flex-1 overflow-y-auto mx-auto w-full max-w-[1540px] px-4 pb-12 pt-7 sm:px-7 lg:px-10 lg:pt-9">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-3 rounded-[12px] border border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] p-4"
            >
              <CircleAlert
                size={17}
                className="mt-0.5 shrink-0 text-[var(--pa-danger)]"
                aria-hidden="true"
              />
              <p className="text-[12px] font-semibold leading-5 text-[var(--pa-danger)]">
                {error}
              </p>
            </div>
          )}

          <section
            className="mb-4 grid gap-px overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-[var(--pa-border)] shadow-[var(--pa-shadow)] sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Key workforce metrics"
          >
            {(
              [
                {
                  label: "Total officers",
                  value: kpis.total,
                  detail: "Across all records loaded",
                  icon: UsersRound,
                },
                {
                  label: "Active officers",
                  value: kpis.active,
                  detail: "Currently in service",
                  icon: UserRoundCheck,
                },
                {
                  label: "Archived",
                  value: kpis.archived,
                  detail: "Retired, resigned, or removed",
                  icon: Archive,
                },
                {
                  label: "Departments",
                  value: kpis.departments,
                  detail: "Represented in this view",
                  icon: Building2,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="relative min-w-0 bg-white p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
                      <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 truncate text-[11px] font-extrabold uppercase tracking-[0.075em] text-[var(--pa-muted)]">
                      {item.label}
                    </div>
                  </div>
                  <div className="pa-tabular mt-2 text-[24px] font-extrabold leading-none tracking-[-0.04em] text-[var(--pa-text)]">
                    {loading ? "—" : item.value}
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-[var(--pa-faint)]">
                    {item.detail}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--pa-border)] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <img
                    src="/gdt-logo.png"
                    alt=""
                    className="h-10 w-auto object-contain"
                  />
                  <div className="flex flex-col">
                    <span
                      className="text-[16px] leading-tight text-[var(--pa-text)]"
                      style={{ fontFamily: "'Moul', 'Noto Sans Khmer', sans-serif" }}
                      dir="auto"
                    >
                      តារាងទិន្នន័យមន្ត្រី
                    </span>
                    <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--pa-faint)]">
                      Officer Data Table
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedDepartment}
                    onChange={(event) => {
                      setSelectedDepartment(event.target.value);
                      setSelectedOffice("");
                    }}
                    className="pa-focus-ring h-8 rounded-lg border border-[var(--pa-border)] bg-white px-2 text-[10.5px] font-bold text-[var(--pa-muted)]"
                    aria-label="Filter by department"
                  >
                    <option value="">All departments</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.name}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedOffice}
                    onChange={(event) => setSelectedOffice(event.target.value)}
                    disabled={!selectedDepartment}
                    className={cn(
                      "pa-focus-ring h-8 rounded-lg border border-[var(--pa-border)] bg-white px-2 text-[10.5px] font-bold text-[var(--pa-muted)] transition-opacity",
                      !selectedDepartment &&
                        "cursor-not-allowed bg-[var(--pa-canvas)] text-[var(--pa-faint)] opacity-50",
                    )}
                    aria-label="Filter by office"
                    title={
                      !selectedDepartment
                        ? "Select a department first to filter by office"
                        : undefined
                    }
                  >
                    <option value="">
                      {selectedDepartment
                        ? "All offices"
                        : "Select department first"}
                    </option>
                    {availableOffices.map((office) => (
                      <option key={office.id} value={office.name}>
                        {office.name}
                      </option>
                    ))}
                  </select>
                  <label className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--pa-border)] px-2 text-[10.5px] font-bold text-[var(--pa-muted)]">
                    <input
                      type="checkbox"
                      checked={includeArchived}
                      onChange={(event) =>
                        setIncludeArchived(event.target.checked)
                      }
                    />
                    Include archived
                  </label>
                  <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    aria-label="Refresh staff directory"
                    className="pa-focus-ring flex size-8 items-center justify-center rounded-lg border border-[var(--pa-border)] text-[var(--pa-muted)] transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)]"
                  >
                    <RefreshCw
                      size={14}
                      className={loading ? "animate-spin" : ""}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                    className="pa-focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--pa-primary)] px-3 text-[10.5px] font-extrabold text-white transition-colors hover:bg-[var(--pa-primary-hover)]"
                  >
                    <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
                    New Officer
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex min-h-[260px] items-center justify-center gap-2 text-[12px] font-semibold text-[var(--pa-muted)]">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Loading officer records…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
                  <UserRound
                    size={22}
                    className="text-[var(--pa-faint)]"
                    aria-hidden="true"
                  />
                  <div className="mt-3 text-[12px] font-extrabold text-[var(--pa-text)]">
                    No officers found
                  </div>
                  <p className="mt-1 max-w-[280px] text-[10.5px] leading-5 text-[var(--pa-muted)]">
                    Try a different name, employee ID, or department filter.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[var(--pa-border)] bg-[var(--pa-canvas)]">
                          <th className="px-6 py-3 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                            No.
                          </th>
                          <th className="px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                            Officer
                          </th>
                          <th className="px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                            Employee ID
                          </th>
                          <th className="px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                            Position &amp; placement
                          </th>
                          <th className="px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                            Gender
                          </th>
                          <th className="px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                            Education
                          </th>
                          <th className="px-4 py-3 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                            Joined date
                          </th>
                          <th className="px-6 py-3 text-right text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--pa-border)]">
                        {paginated.map((person, index) => (
                          <tr
                            key={person.id}
                            className="transition-colors hover:bg-[var(--pa-canvas)]"
                          >
                            <td className="px-6 py-4 text-[14.5px] font-bold text-[var(--pa-faint)]">
                              {(currentPage - 1) * pageSize + index + 1}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[12px] font-extrabold text-[var(--pa-primary)]">
                                  {person.photoUrl ? (
                                    <img
                                      src={person.photoUrl}
                                      alt=""
                                      className="size-full object-cover"
                                    />
                                  ) : (
                                    (person.nameEn || person.name).charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="truncate text-[15px] font-extrabold text-[var(--pa-text)]"
                                      dir="auto"
                                    >
                                      {person.name}
                                    </span>
                                    {person.status === "archived" && (
                                      <StatusBadge tone="danger">
                                        Archived
                                      </StatusBadge>
                                    )}
                                  </div>
                                  {person.nameEn && (
                                    <div className="truncate text-[12.5px] font-medium text-[var(--pa-faint)]">
                                      {person.nameEn}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {person.employeeId ? (
                                <StatusBadge tone="neutral" dot={false}>
                                  {person.employeeId}
                                </StatusBadge>
                              ) : (
                                <span className="text-[13.5px] font-medium text-[var(--pa-faint)]">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div
                                className="max-w-[180px] truncate text-[14px] font-semibold text-[var(--pa-text)]"
                                dir="auto"
                              >
                                {getStaffPositionTitle(person)}
                              </div>
                              <div
                                className="mt-1 max-w-[140px] truncate text-[12.5px] font-medium text-[var(--pa-faint)]"
                                dir="auto"
                                title="View profile for full placement details"
                              >
                                {getStaffLocationLabel(person)}
                              </div>
                            </td>
                            <td
                              className="px-4 py-4 text-[13.5px] font-semibold text-[var(--pa-text)]"
                              dir="auto"
                            >
                              {GENDER_LABELS[person.gender]}
                            </td>
                            <td className="px-4 py-4">
                              <div
                                className="max-w-[200px] truncate text-[13.5px] font-semibold text-[var(--pa-text)]"
                                dir="auto"
                              >
                                {person.education ?? "—"}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--pa-muted)]">
                                <CalendarDays size={13} aria-hidden="true" />
                                {formatDate(person.joinedDate)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setProfileTarget(person)}
                                  title="View profile"
                                  aria-label={`View profile for ${person.name}`}
                                  className="pa-focus-ring flex size-9 items-center justify-center rounded-lg border border-[var(--pa-border)] text-[var(--pa-muted)] transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)]"
                                >
                                  <Eye size={15} strokeWidth={1.9} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSkillsTarget(person)}
                                  title="Manage skills"
                                  aria-label={`Manage skills for ${person.name}`}
                                  className="pa-focus-ring flex size-9 items-center justify-center rounded-lg border border-[var(--pa-border)] text-[var(--pa-muted)] transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)]"
                                >
                                  <Award size={15} strokeWidth={1.9} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditing(person);
                                    setFormOpen(true);
                                  }}
                                  title="Edit officer info"
                                  aria-label={`Edit ${person.name}`}
                                  className="pa-focus-ring flex size-9 items-center justify-center rounded-lg border border-[var(--pa-border)] text-[var(--pa-muted)] transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)]"
                                >
                                  <Pencil size={15} strokeWidth={1.9} aria-hidden="true" />
                                </button>
                                {person.status !== "archived" && (
                                  <button
                                    type="button"
                                    onClick={() => setArchiveTarget(person)}
                                    title="Archive officer record"
                                    aria-label={`Archive ${person.name}`}
                                    className="pa-focus-ring flex size-9 items-center justify-center rounded-lg border border-[var(--pa-danger-border)] text-[var(--pa-danger)] transition-colors hover:bg-[var(--pa-danger-soft)]"
                                  >
                                    <Archive size={15} strokeWidth={1.9} aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pa-border)] px-5 py-3.5 sm:px-6">
                    <div className="text-[10.5px] font-semibold text-[var(--pa-muted)]">
                      Showing {(currentPage - 1) * pageSize + 1}–
                      {Math.min(currentPage * pageSize, filtered.length)} of{" "}
                      {filtered.length} officers
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={pageSize}
                        onChange={(event) =>
                          setPageSize(
                            Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number],
                          )
                        }
                        className="pa-focus-ring h-8 rounded-lg border border-[var(--pa-border)] bg-white px-2 text-[10.5px] font-bold text-[var(--pa-muted)]"
                        aria-label="Rows per page"
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size} / page
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={currentPage <= 1}
                        className="pa-focus-ring flex h-8 items-center gap-1 rounded-lg border border-[var(--pa-border)] px-2.5 text-[10.5px] font-bold text-[var(--pa-muted)] transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={13} aria-hidden="true" />
                        Prev
                      </button>
                      <span className="pa-tabular text-[10.5px] font-bold text-[var(--pa-text)]">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPage((current) => Math.min(totalPages, current + 1))
                        }
                        disabled={currentPage >= totalPages}
                        className="pa-focus-ring flex h-8 items-center gap-1 rounded-lg border border-[var(--pa-border)] px-2.5 text-[10.5px] font-bold text-[var(--pa-muted)] transition-colors hover:border-[var(--pa-border-strong)] hover:text-[var(--pa-text)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                        <ChevronRight size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </>
              )}
          </section>
        </main>

        {/* Synchronized Position Bottom Footer */}
        <AdminFooter />
      </div>

      <StaffFormDialog
        open={formOpen}
        staff={editing}
        onOpenChange={setFormOpen}
        onSaved={handleOfficerSaved}
      />
      <StaffSkillsDialog
        open={Boolean(skillsTarget)}
        staff={skillsTarget}
        onOpenChange={(open) => {
          if (!open) setSkillsTarget(null);
        }}
      />
      {profileTarget && (
        <StaffProfileDialog
          staffId={profileTarget.id}
          onClose={() => setProfileTarget(null)}
        />
      )}
      {archiveTarget && (
        <AdminConfirmModal
          title="Archive Officer Record"
          message={`Archive ${archiveTarget.name}? Position history will be preserved. A currently assigned officer must be vacated first.`}
          confirmLabel={archiving ? "Archiving…" : "Archive"}
          onConfirm={() => void confirmArchive()}
          onCancel={() => !archiving && setArchiveTarget(null)}
          danger
        />
      )}
    </div>
  );
}
