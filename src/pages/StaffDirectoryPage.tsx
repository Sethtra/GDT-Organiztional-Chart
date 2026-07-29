import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Award,
  Building2,
  CalendarDays,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import ConfirmModal from "../components/ConfirmModal";
import StaffFormDialog from "../components/staff/StaffFormDialog";
import StaffProfileDialog from "../components/staff/StaffProfileDialog";
import StaffSkillsDialog from "../components/staff/StaffSkillsDialog";
import type { HrStaffDirectoryRecord } from "../contracts/hr";
import { archiveStaff, listHrStaff } from "../services/staffService";
import {
  getStaffLocationLabel,
  getStaffPositionTitle,
} from "../utils/staffDisplay";

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
  const [staff, setStaff] = useState<HrStaffDirectoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HrStaffDirectoryRecord | null>(null);
  const [archiveTarget, setArchiveTarget] =
    useState<HrStaffDirectoryRecord | null>(null);
  const [skillsTarget, setSkillsTarget] =
    useState<HrStaffDirectoryRecord | null>(null);
  const [profileTarget, setProfileTarget] =
    useState<HrStaffDirectoryRecord | null>(null);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async (): Promise<HrStaffDirectoryRecord[]> => {
    setLoading(true);
    setError(null);
    try {
      const nextStaff = await listHrStaff(includeArchived);
      setStaff(nextStaff);
      return nextStaff;
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
  }, [includeArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return staff;
    return staff.filter((person) =>
      [
        person.name,
        person.nameEn,
        person.employeeId,
        person.jobTitle?.name,
        person.jobTitle?.nameEn,
        person.currentPosition?.title,
        person.currentPosition?.departmentName,
        person.currentPosition?.officeName,
        person.organizationalPlacement?.departmentName,
        person.organizationalPlacement?.officeName,
      ].some((value) => value?.toLocaleLowerCase().includes(query)),
    );
  }, [search, staff]);

  const activeCount = staff.filter((person) => person.status === "active").length;
  const assignedCount = staff.filter(
    (person) => Boolean(person.organizationalPlacement),
  ).length;

  const openNewOfficer = () => {
    setEditing(null);
    setFormOpen(true);
  };

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
    const savedStaff = nextStaff.find(
      (person) => person.id === savedStaffId,
    );
    if (savedStaff) setSkillsTarget(savedStaff);
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-12">
      {/* Header Bar */}
      <header className="border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="grid size-9 place-items-center rounded-lg border border-border/80 bg-secondary/30 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Back to dashboard"
              title="Back to Dashboard"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  GDT Staff Directory
                </h1>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {staff.length} Officers
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Official HR Directory & Organizational Placement
              </p>
            </div>
          </div>

          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
            onClick={openNewOfficer}
            aria-label="Add officer"
          >
            <Plus className="size-4" />
            Add New Officer
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6">
        {/* KPI Stats Cards */}
        <section
          className="grid gap-4 sm:grid-cols-3"
          aria-label="Directory summary"
        >
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Total Directory Records</div>
              <div className="mt-1 text-2xl font-bold tracking-tight">{staff.length}</div>
            </div>
            <div className="grid size-10 place-items-center rounded-lg border border-border/60 bg-secondary/50 text-foreground">
              <UsersRound className="size-5" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
            <div>
              <div className="text-xs font-medium text-emerald-400">Active Officers</div>
              <div className="mt-1 text-2xl font-bold tracking-tight text-emerald-300">{activeCount}</div>
            </div>
            <div className="grid size-10 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <UserCheck className="size-5" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 shadow-sm">
            <div>
              <div className="text-xs font-medium text-sky-400">Assigned to Department</div>
              <div className="mt-1 text-2xl font-bold tracking-tight text-sky-300">{assignedCount}</div>
            </div>
            <div className="grid size-10 place-items-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400">
              <Building2 className="size-5" />
            </div>
          </div>
        </section>

        {/* Search & Filter Toolbar */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="pp-input !pl-9 text-xs"
              placeholder="Search by officer name, employee ID, position, or department…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/30"
              />
              Include archived records
            </label>

            <button
              className="grid size-9 place-items-center rounded-lg border border-border/80 bg-secondary/30 text-foreground transition hover:bg-secondary disabled:opacity-50"
              onClick={() => void load()}
              disabled={loading}
              aria-label="Refresh staff directory"
              title="Refresh Directory"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs leading-relaxed text-destructive"
          >
            {error}
          </div>
        )}

        {/* Officers Directory Table */}
        <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          {/* Header Row */}
          <div className="grid grid-cols-[45px_minmax(220px,1.2fr)_120px_minmax(200px,1fr)_140px_160px] gap-4 border-b border-border/80 bg-secondary/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground max-lg:hidden">
            <span>No.</span>
            <span>Officer Name</span>
            <span>Employee ID</span>
            <span>Position & Placement</span>
            <span>Service Date</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            <div className="grid min-h-48 place-items-center text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                Loading directory records…
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid min-h-56 place-items-center px-5 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid size-10 place-items-center rounded-xl border border-border bg-secondary/40 text-muted-foreground">
                  <UserRound className="size-5" />
                </div>
                <h2 className="mt-3 text-sm font-semibold">
                  {search ? "No matching officers found" : "No officer records yet"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {search
                    ? "Try adjusting your search query or department filter."
                    : "Click below to add your first officer to the HR directory."}
                </p>
                {!search && (
                  <button
                    type="button"
                    className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm"
                    onClick={openNewOfficer}
                  >
                    <Plus className="size-4" />
                    Add First Officer
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((person, index) => (
                <article
                  key={person.id}
                  className="group grid grid-cols-[45px_minmax(220px,1.2fr)_120px_minmax(200px,1fr)_140px_160px] items-center gap-4 px-5 py-3.5 transition hover:bg-secondary/30 max-lg:grid-cols-1 max-lg:gap-3"
                >
                  {/* Row Number */}
                  <div className="text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </div>

                  {/* Officer Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground" dir="auto">
                        {person.name}
                      </span>
                      {person.status === "archived" && (
                        <span className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {person.nameEn || "—"}
                    </div>
                  </div>

                  {/* Employee ID */}
                  <div className="text-xs font-medium">
                    <span className="mr-2 text-muted-foreground lg:hidden">ID:</span>
                    {person.employeeId ? (
                      <span className="rounded bg-secondary px-2 py-1 font-mono text-foreground">
                        {person.employeeId}
                      </span>
                    ) : (
                      <span className="text-amber-400/80">Unassigned</span>
                    )}
                  </div>

                  {/* Position & Location */}
                  <div className="min-w-0 text-xs">
                    <div className="truncate font-semibold text-foreground" dir="auto">
                      {getStaffPositionTitle(person)}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {getStaffLocationLabel(person)}
                    </div>
                  </div>

                  {/* Service Dates */}
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      <span>{formatDate(person.joinedDate)}</span>
                    </div>
                    {person.retiredDate && (
                      <div className="mt-0.5 text-[11px] text-amber-400/80">
                        Retired {formatDate(person.retiredDate)}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons (Icon only, reveals on hover) */}
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded-lg border border-border/80 bg-secondary/40 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      onClick={() => setProfileTarget(person)}
                      aria-label={`View profile for ${person.name}`}
                      title="View Profile"
                    >
                      <Eye className="size-4" />
                    </button>

                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded-lg border border-border/80 bg-secondary/40 text-primary transition hover:bg-primary/10"
                      onClick={() => setSkillsTarget(person)}
                      aria-label={`Manage skills for ${person.name}`}
                      title="Manage Skills"
                    >
                      <Award className="size-4" />
                    </button>

                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded-lg border border-border/80 bg-secondary/40 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      onClick={() => {
                        setEditing(person);
                        setFormOpen(true);
                      }}
                      aria-label={`Edit ${person.name}`}
                      title="Edit Officer Info"
                    >
                      <Pencil className="size-4" />
                    </button>

                    {person.status !== "archived" && (
                      <button
                        type="button"
                        className="grid size-8 place-items-center rounded-lg border border-destructive/30 bg-destructive/5 text-destructive transition hover:bg-destructive/15"
                        onClick={() => setArchiveTarget(person)}
                        aria-label={`Archive ${person.name}`}
                        title="Archive Officer Record"
                      >
                        <Archive className="size-4" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
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
        <ConfirmModal
          title="Archive Officer Record"
          message={`Archive ${archiveTarget.name}? Position history will be preserved. A currently assigned officer must be vacated first.`}
          confirmLabel={archiving ? "Archiving…" : "Archive"}
          onConfirm={() => void confirmArchive()}
          onCancel={() => !archiving && setArchiveTarget(null)}
          danger
        />
      )}
    </main>
  );
}
