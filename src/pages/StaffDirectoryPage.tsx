import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
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

function chartLocation(staff: HrStaffDirectoryRecord): string {
  const position = staff.currentPosition;
  if (!position) return "Chart location not assigned";
  return [position.departmentName, position.officeName]
    .filter(Boolean)
    .join(" → ") || "Assigned on chart";
}

function positionTitle(staff: HrStaffDirectoryRecord): string {
  return (
    staff.currentPosition?.title ??
    staff.jobTitle?.name ??
    "Position not selected"
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

const actionClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background/20 px-3 text-xs font-medium text-foreground transition hover:border-ring/60 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStaff(await listHrStaff(includeArchived));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the staff directory.",
      );
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
      ].some((value) => value?.toLocaleLowerCase().includes(query)),
    );
  }, [search, staff]);

  const activeCount = staff.filter((person) => person.status === "active").length;
  const assignedCount = staff.filter(
    (person) => person.currentPosition !== null,
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

  return (
    <main className="min-h-full overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="grid size-10 place-items-center rounded-lg border border-border text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="grid size-10 place-items-center rounded-lg border border-primary/35 bg-primary/15 text-foreground max-sm:hidden">
              <UsersRound className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                GDT Staff Directory
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                HR-managed officer records for the organization
              </p>
            </div>
          </div>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={openNewOfficer}
          >
            <Plus className="size-4" />
            Add officer
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6">
        <section
          className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3"
          aria-label="Directory summary"
        >
          <div className="flex items-center gap-3 bg-card px-4 py-3.5">
            <UserRound className="size-4 text-foreground" />
            <div>
              <div className="text-lg font-semibold">{staff.length}</div>
              <div className="text-xs text-muted-foreground">Records shown</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-card px-4 py-3.5">
            <UsersRound className="size-4 text-foreground" />
            <div>
              <div className="text-lg font-semibold">{activeCount}</div>
              <div className="text-xs text-muted-foreground">
                Active officers
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-card px-4 py-3.5">
            <BriefcaseBusiness className="size-4 text-foreground" />
            <div>
              <div className="text-lg font-semibold">{assignedCount}</div>
              <div className="text-xs text-muted-foreground">
                Assigned to chart
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
          <label className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Search officers</span>
            <input
              className="min-h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Search name, employee ID, position, department, or office"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
              className="accent-[var(--blue-light)]"
            />
            Include archived
          </label>
          <button
            className="grid size-10 place-items-center rounded-lg border border-border text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh staff directory"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/45 bg-destructive/10 p-4 text-sm"
          >
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[minmax(190px,1fr)_120px_minmax(190px,1fr)_150px_230px] gap-4 border-b border-border bg-secondary/45 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground max-lg:hidden">
            <span>Officer</span>
            <span>Employee ID</span>
            <span>Position</span>
            <span>Service dates</span>
            <span>Actions</span>
          </div>

          {loading ? (
            <div className="grid min-h-64 place-items-center text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin text-foreground" />
                Loading officers…
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid min-h-64 place-items-center px-5 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid size-11 place-items-center rounded-lg border border-border bg-secondary/40 text-foreground">
                  <UserRound className="size-5" />
                </div>
                <h2 className="mt-4 text-sm font-semibold">
                  {search ? "No matching officers" : "No officer records yet"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search
                    ? "Try a different name, employee ID, or position."
                    : "Add the first real officer record to begin the directory."}
                </p>
                {!search && (
                  <button
                    type="button"
                    className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    onClick={openNewOfficer}
                  >
                    <Plus className="size-4" />
                    Add first officer
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((person) => (
                <article
                  key={person.id}
                  className="grid grid-cols-[minmax(190px,1fr)_120px_minmax(190px,1fr)_150px_230px] items-center gap-4 px-5 py-4 transition hover:bg-secondary/20 max-lg:grid-cols-1 max-lg:gap-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary/50 text-sm font-semibold text-foreground">
                      {(person.nameEn || person.name).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium" dir="auto">
                        {person.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {person.nameEn || "—"}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-sm ${
                      person.employeeId ? "text-foreground" : "text-amber-300"
                    }`}
                  >
                    <span className="mr-2 text-xs text-muted-foreground lg:hidden">
                      ID
                    </span>
                    {person.employeeId ?? "Not set"}
                  </div>
                  <div className="min-w-0 text-sm">
                    <div className="truncate text-foreground" dir="auto">
                      {positionTitle(person)}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {chartLocation(person)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-foreground" />
                      {formatDate(person.joinedDate)}
                    </div>
                    {person.retiredDate && (
                      <div className="mt-1">Retired {formatDate(person.retiredDate)}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className={actionClass}
                      aria-label={`View profile for ${person.name}`}
                      onClick={() => setProfileTarget(person)}
                    >
                      <Eye className="size-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      className={actionClass}
                      aria-label={`Manage skills for ${person.name}`}
                      onClick={() => setSkillsTarget(person)}
                      title="Manage skills"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className={actionClass}
                      aria-label={`Edit ${person.name}`}
                      onClick={() => {
                        setEditing(person);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </button>
                    {person.status !== "archived" && (
                      <button
                        type="button"
                        className="grid size-9 place-items-center rounded-lg border border-destructive/35 text-destructive transition hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        aria-label={`Archive ${person.name}`}
                        onClick={() => setArchiveTarget(person)}
                        title="Archive"
                      >
                        <Archive className="size-3.5" />
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
        onSaved={load}
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
          title="Archive officer record"
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
