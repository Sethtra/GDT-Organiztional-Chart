import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
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
import StaffSkillsDialog from "../components/staff/StaffSkillsDialog";
import StaffProfileDialog from "../components/staff/StaffProfileDialog";
import type { HrStaffDirectoryRecord } from "../contracts/hr";
import { archiveStaff, listHrStaff } from "../services/staffService";

function positionLabel(staff: HrStaffDirectoryRecord): string {
  const position = staff.currentPosition;
  if (!position) return "No active position";
  return [
    position.departmentName,
    position.officeName,
    position.title,
  ].filter(Boolean).join(" → ");
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
        person.email,
        person.currentPosition?.title,
        person.currentPosition?.departmentName,
        person.currentPosition?.officeName,
      ].some((value) => value?.toLocaleLowerCase().includes(query)),
    );
  }, [search, staff]);

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
          : "Unable to archive this staff record.",
      );
      setArchiveTarget(null);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <main className="min-h-full bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="grid size-10 place-items-center rounded-md border border-border hover:bg-accent"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold">
                <UsersRound className="size-5 text-primary" />
                GDT Staff Directory
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                HR-managed people records shared across GDT charts
              </p>
            </div>
          </div>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add staff
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6">
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
          <label className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Search staff</span>
            <input
              className="min-h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search name, ID, email, department, office…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            Include archived
          </label>
          <button
            className="grid size-10 place-items-center rounded-md border border-border hover:bg-accent disabled:opacity-60"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh staff directory"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm"
          >
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="grid grid-cols-[minmax(180px,1fr)_140px_minmax(220px,1.4fr)_100px] gap-4 border-b border-border bg-secondary/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground max-md:hidden">
            <span>Staff</span>
            <span>Employee ID</span>
            <span>Current position</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            <div className="grid min-h-56 place-items-center text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                Loading staff…
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid min-h-56 place-items-center px-5 text-center text-sm text-muted-foreground">
              {search
                ? "No staff match this search."
                : "No staff records are available yet."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((person) => (
                <article
                  key={person.id}
                  className="grid grid-cols-[minmax(180px,1fr)_140px_minmax(220px,1.4fr)_100px] items-center gap-4 px-4 py-4 max-md:grid-cols-1 max-md:gap-2"
                >
                  <div>
                    <div className="font-medium" dir="auto">
                      {person.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {person.nameEn || person.email || "—"}
                    </div>
                  </div>
                  <div className="text-sm">{person.employeeId}</div>
                  <div className="text-sm text-muted-foreground">
                    {positionLabel(person)}
                  </div>
                  <div className="flex justify-end gap-1 max-md:justify-start">
                    <button
                      className="grid size-9 place-items-center rounded-md hover:bg-accent"
                      aria-label={`View profile for ${person.name}`}
                      onClick={() => setProfileTarget(person)}
                    >
                      <UserRound className="size-4" />
                    </button>
                    <button
                      className="grid size-9 place-items-center rounded-md hover:bg-accent"
                      aria-label={`Manage skills for ${person.name}`}
                      onClick={() => setSkillsTarget(person)}
                    >
                      <Sparkles className="size-4" />
                    </button>
                    <button
                      className="grid size-9 place-items-center rounded-md hover:bg-accent"
                      aria-label={`Edit ${person.name}`}
                      onClick={() => {
                        setEditing(person);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </button>
                    {person.status !== "archived" && (
                      <button
                        className="grid size-9 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                        aria-label={`Archive ${person.name}`}
                        onClick={() => setArchiveTarget(person)}
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
          title="Archive staff record"
          message={`Archive ${archiveTarget.name}? Historical assignments will be preserved. A currently assigned person must be vacated first.`}
          confirmLabel={archiving ? "Archiving…" : "Archive"}
          onConfirm={() => void confirmArchive()}
          onCancel={() => !archiving && setArchiveTarget(null)}
          danger
        />
      )}
    </main>
  );
}
