import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Loader2,
  Save,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";

import { StaffInputSchema } from "../../contracts/hr";
import type {
  HrStaffDirectoryRecord,
  JobTitle,
  StaffDuplicate,
  StaffInput,
} from "../../contracts/hr";
import { useOrgStructure } from "../../hooks/useOrgStructure";
import { listJobArchitecture } from "../../services/jobArchitectureService";
import {
  findStaffDuplicates,
  saveStaff,
} from "../../services/staffService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "../ui/dialog";

interface StaffFormDialogProps {
  open: boolean;
  staff: HrStaffDirectoryRecord | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (
    staffId: string,
    manageSkills: boolean,
  ) => void | Promise<void>;
}

interface StaffDraft {
  employeeId: string;
  name: string;
  nameEn: string;
  jobTitleId: string;
  departmentId: string;
  officeId: string;
  dateOfBirth: string;
  joinedDate: string;
  retiredDate: string;
  gender: StaffInput["gender"];
  education: string;
  phone: string;
  address: string;
  otherInformation: string;
}

const approvedPositionNames = [
  "ប្រធាននាយកដ្ឋាន",
  "អនុប្រធាននាយកដ្ឋាន",
  "ប្រធានការិយាល័យ",
  "អនុប្រធានការិយាល័យ",
  "មន្ត្រី",
  "មន្ត្រីកិច្ចសន្យា",
] as const;

const positionOrder = new Map<string, number>(
  approvedPositionNames.map((name, index) => [name, index]),
);

const emptyDraft: StaffDraft = {
  employeeId: "",
  name: "",
  nameEn: "",
  jobTitleId: "",
  departmentId: "",
  officeId: "",
  dateOfBirth: "",
  joinedDate: "",
  retiredDate: "",
  gender: "male",
  education: "",
  phone: "",
  address: "",
  otherInformation: "",
};

const inputClass =
  "theme-field min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "grid gap-1.5 text-sm font-medium text-foreground";
const sectionTitleClass =
  "flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold text-foreground";

function draftFromStaff(staff: HrStaffDirectoryRecord | null): StaffDraft {
  if (!staff) return emptyDraft;
  return {
    employeeId: staff.employeeId ?? "",
    name: staff.name,
    nameEn: staff.nameEn ?? "",
    jobTitleId: staff.jobTitle?.id ?? "",
    departmentId: staff.organizationalPlacement?.departmentId ?? "",
    officeId: staff.organizationalPlacement?.officeId ?? "",
    dateOfBirth: staff.dateOfBirth ?? "",
    joinedDate: staff.joinedDate ?? "",
    retiredDate: staff.retiredDate ?? "",
    gender: staff.gender === "female" ? "female" : "male",
    education: staff.education ?? "",
    phone: staff.phone ?? "",
    address: staff.address ?? "",
    otherInformation: staff.otherInformation ?? "",
  };
}

function duplicateLocation(duplicate: StaffDuplicate): string {
  const values = [
    duplicate.location.department,
    duplicate.location.office,
    duplicate.location.position,
  ].filter(Boolean);
  return values.length > 0 ? values.join(" → ") : "No active chart position";
}

function duplicateMatchLabel(value: StaffDuplicate["matchedFields"][number]) {
  return value === "employeeId"
    ? "Employee ID"
    : "Name and date of birth";
}

export default function StaffFormDialog({
  open,
  staff,
  onOpenChange,
  onSaved,
}: StaffFormDialogProps) {
  const [draft, setDraft] = useState<StaffDraft>(emptyDraft);
  const [positions, setPositions] = useState<JobTitle[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<StaffDuplicate[]>([]);
  const {
    units,
    loading: loadingOrganization,
    error: organizationError,
  } = useOrgStructure();

  const departments = useMemo(
    () => units.filter((unit) => unit.type === "department"),
    [units],
  );
  const selectedDepartment = useMemo(
    () => departments.find((unit) => unit.id === draft.departmentId) ?? null,
    [departments, draft.departmentId],
  );

  useEffect(() => {
    if (!open) return;
    setDraft(draftFromStaff(staff));
    setError(null);
    setDuplicates([]);
  }, [open, staff]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingPositions(true);
    void listJobArchitecture()
      .then((items) => {
        if (cancelled) return;
        setPositions(
          items
            .filter(
              (item) =>
                item.isActive && positionOrder.has(item.name),
            )
            .sort(
              (left, right) =>
                (positionOrder.get(left.name) ?? 999) -
                (positionOrder.get(right.name) ?? 999),
            ),
        );
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load positions.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPositions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const title = staff ? "Edit officer record" : "Add officer";
  const fieldError = useMemo(() => {
    if (!error?.startsWith("VALIDATION:")) return null;
    return error.slice("VALIDATION:".length);
  }, [error]);

  const update = <Key extends keyof StaffDraft>(
    key: Key,
    value: StaffDraft[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
    setDuplicates([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const manageSkills = submitter?.value === "skills";
    const parsed = StaffInputSchema.safeParse({
      employeeId: draft.employeeId,
      name: draft.name,
      nameEn: draft.nameEn || null,
      jobTitleId: draft.jobTitleId,
      departmentId: draft.departmentId,
      officeId: draft.officeId || null,
      dateOfBirth: draft.dateOfBirth,
      joinedDate: draft.joinedDate,
      retiredDate: draft.retiredDate || null,
      gender: draft.gender,
      education: draft.education || null,
      phone: draft.phone || null,
      address: draft.address || null,
      otherInformation: draft.otherInformation || null,
    });

    if (!parsed.success) {
      setError(
        `VALIDATION:${parsed.error.issues[0]?.message ?? "Check the form values."}`,
      );
      return;
    }

    setSaving(true);
    setError(null);
    setDuplicates([]);
    try {
      const matches = await findStaffDuplicates(parsed.data, staff?.id ?? null);
      if (matches.length > 0) {
        setDuplicates(matches);
        return;
      }
      const savedStaffId = await saveStaff(parsed.data, staff?.id ?? null);
      onOpenChange(false);
      await onSaved(savedStaffId, manageSkills);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the officer record.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <div className="border-b border-border bg-secondary/35 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/35 bg-primary/15 text-foreground">
              <UserRoundPlus className="size-5" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1.5">
                Enter the officer’s HR record, department, and position.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form
          className="grid max-h-[calc(100vh-8rem)] overflow-y-auto"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-7 px-6 py-6">
            {(fieldError || (error && !fieldError)) && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/45 bg-destructive/10 px-4 py-3 text-sm text-foreground"
              >
                {fieldError ?? error}
              </div>
            )}

            {duplicates.length > 0 && (
              <div
                role="alert"
                className="grid gap-3 rounded-lg border border-amber-400/45 bg-amber-400/10 p-4"
              >
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <AlertTriangle className="size-4 text-amber-300" />
                  This officer may already exist
                </div>
                {duplicates.map((duplicate) => (
                  <div
                    key={duplicate.staffId}
                    className="rounded-md border border-border bg-card p-3 text-sm"
                  >
                    <div className="font-medium" dir="auto">
                      {duplicate.name}
                      {duplicate.nameEn ? ` (${duplicate.nameEn})` : ""}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      ID: {duplicate.employeeId ?? "Not set"} · Matched:{" "}
                      {duplicate.matchedFields
                        .map(duplicateMatchLabel)
                        .join(", ")}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      Location: {duplicateLocation(duplicate)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <section className="grid gap-4">
              <h3 className={sectionTitleClass}>
                <UserRoundPlus className="size-4 text-foreground" />
                Personal information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  Employee ID *
                  <input
                    className={inputClass}
                    value={draft.employeeId}
                    onChange={(event) =>
                      update("employeeId", event.target.value)
                    }
                    required
                    maxLength={64}
                    autoComplete="off"
                  />
                </label>
                <label className={labelClass}>
                  Date of birth *
                  <input
                    className={inputClass}
                    type="date"
                    value={draft.dateOfBirth}
                    onChange={(event) =>
                      update("dateOfBirth", event.target.value)
                    }
                    required
                  />
                </label>
                <label className={labelClass}>
                  Name (Khmer) *
                  <input
                    className={inputClass}
                    value={draft.name}
                    onChange={(event) => update("name", event.target.value)}
                    required
                    maxLength={200}
                    dir="auto"
                  />
                </label>
                <label className={labelClass}>
                  Name (English)
                  <input
                    className={inputClass}
                    value={draft.nameEn}
                    onChange={(event) => update("nameEn", event.target.value)}
                    maxLength={200}
                  />
                </label>
                <div className={labelClass}>
                  <span>ភេទ (Gender)</span>
                  <div className="flex items-center gap-3 min-h-11 pt-0.5">
                    <label className="flex flex-1 items-center justify-center gap-2 cursor-pointer rounded-lg border border-border/80 bg-secondary/30 px-3.5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary has-[:checked]:border-emerald-500/80 has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-400">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={draft.gender === "male"}
                        onChange={() => update("gender", "male")}
                        className="size-4 accent-emerald-600 cursor-pointer"
                      />
                      <span>ប្រុស</span>
                    </label>

                    <label className="flex flex-1 items-center justify-center gap-2 cursor-pointer rounded-lg border border-border/80 bg-secondary/30 px-3.5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary has-[:checked]:border-emerald-500/80 has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-400">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={draft.gender === "female"}
                        onChange={() => update("gender", "female")}
                        className="size-4 accent-emerald-600 cursor-pointer"
                      />
                      <span>ស្រី</span>
                    </label>
                  </div>
                </div>

                <label className={labelClass}>
                  កម្រិតវប្បធម៌ (Education)
                  <select
                    className={inputClass}
                    value={draft.education}
                    onChange={(event) =>
                      update("education", event.target.value)
                    }
                  >
                    <option value="">ជ្រើសរើសកម្រិតវប្បធម៌…</option>
                    <option value="បណ្ឌិត">បណ្ឌិត</option>
                    <option value="អនុបណ្ឌិត">អនុបណ្ឌិត</option>
                    <option value="បរិញ្ញាបត្រ">បរិញ្ញាបត្រ</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="grid gap-4">
              <h3 className={sectionTitleClass}>
                <BriefcaseBusiness className="size-4 text-foreground" />
                Employment
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  Department *
                  <select
                    className={inputClass}
                    value={draft.departmentId}
                    onChange={(event) => {
                      setDraft((current) => ({
                        ...current,
                        departmentId: event.target.value,
                        officeId: "",
                      }));
                      setError(null);
                      setDuplicates([]);
                    }}
                    required
                    disabled={loadingOrganization}
                  >
                    <option value="">
                      {loadingOrganization
                        ? "Loading departments…"
                        : "Select a department"}
                    </option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Office (optional)
                  <select
                    className={inputClass}
                    value={draft.officeId}
                    onChange={(event) =>
                      update("officeId", event.target.value)
                    }
                    disabled={
                      loadingOrganization || !draft.departmentId
                    }
                  >
                    <option value="">No office assigned</option>
                    {selectedDepartment?.offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${labelClass} md:col-span-2`}>
                  Position *
                  <select
                    className={inputClass}
                    value={draft.jobTitleId}
                    onChange={(event) =>
                      update("jobTitleId", event.target.value)
                    }
                    required
                    disabled={loadingPositions}
                  >
                    <option value="">
                      {loadingPositions
                        ? "Loading positions…"
                        : "Select a position"}
                    </option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                        {position.nameEn ? ` — ${position.nameEn}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Joined date *
                  <input
                    className={inputClass}
                    type="date"
                    value={draft.joinedDate}
                    onChange={(event) =>
                      update("joinedDate", event.target.value)
                    }
                    required
                  />
                </label>
                <label className={labelClass}>
                  Retired date
                  <input
                    className={inputClass}
                    type="date"
                    min={draft.joinedDate || undefined}
                    value={draft.retiredDate}
                    onChange={(event) =>
                      update("retiredDate", event.target.value)
                    }
                  />
                </label>
              </div>
              {organizationError && (
                <div
                  role="alert"
                  className="flex gap-2 rounded-lg border border-destructive/45 bg-destructive/10 px-3.5 py-3 text-xs leading-5 text-foreground"
                >
                  <Building2 className="mt-0.5 size-4 shrink-0" />
                  {organizationError}
                </div>
              )}
              <div className="flex gap-2 rounded-lg border border-border bg-secondary/30 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-foreground" />
                Office is optional. When selected, it must belong to the
                chosen department.
              </div>
            </section>

            <section className="grid gap-4">
              <h3 className={sectionTitleClass}>Contact and background</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  Phone
                  <input
                    className={inputClass}
                    value={draft.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    maxLength={50}
                    autoComplete="tel"
                  />
                </label>
                <label className={`${labelClass} md:col-span-2`}>
                  Current address
                  <textarea
                    className={`${inputClass} min-h-20 resize-y`}
                    value={draft.address}
                    onChange={(event) => update("address", event.target.value)}
                    maxLength={4_000}
                    dir="auto"
                  />
                </label>

                <label className={`${labelClass} md:col-span-2`}>
                  Other information
                  <textarea
                    className={`${inputClass} min-h-24 resize-y`}
                    value={draft.otherInformation}
                    onChange={(event) =>
                      update("otherInformation", event.target.value)
                    }
                    maxLength={4_000}
                    dir="auto"
                  />
                </label>
              </div>
            </section>

            <section className="grid gap-4">
              <h3 className={sectionTitleClass}>
                <Sparkles className="size-4 text-foreground" />
                Current skills
              </h3>
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                Skills are managed separately from Education. Use
                <span className="font-medium text-foreground">
                  {" "}Save & manage skills{" "}
                </span>
                to add current skills and proficiency levels after this officer
                record is saved.
              </div>
            </section>
          </div>

          <DialogFooter className="border-t border-border bg-secondary/35 px-6 py-4">
            <button
              type="button"
              className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              name="saveIntent"
              value="skills"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary/50 px-4 text-sm font-semibold text-foreground transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
              disabled={
                saving ||
                loadingPositions ||
                loadingOrganization ||
                positions.length === 0 ||
                departments.length === 0
              }
            >
              <Sparkles className="size-4" />
              Save & manage skills
            </button>
            <button
              type="submit"
              name="saveIntent"
              value="save"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
              disabled={
                saving ||
                loadingPositions ||
                loadingOrganization ||
                positions.length === 0 ||
                departments.length === 0
              }
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save officer
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
