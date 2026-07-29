import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Save, UserRoundPlus } from "lucide-react";

import { StaffInputSchema } from "../../contracts/hr";
import type {
  HrStaffDirectoryRecord,
  StaffDuplicate,
  StaffInput,
} from "../../contracts/hr";
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
  onSaved: () => void | Promise<void>;
}

interface StaffDraft {
  employeeId: string;
  name: string;
  nameEn: string;
  age: string;
  gender: StaffInput["gender"];
  education: string;
  phone: string;
  email: string;
  address: string;
  maritalStatus: StaffInput["maritalStatus"];
  nationalId: string;
}

const emptyDraft: StaffDraft = {
  employeeId: "",
  name: "",
  nameEn: "",
  age: "",
  gender: "unspecified",
  education: "",
  phone: "",
  email: "",
  address: "",
  maritalStatus: "unspecified",
  nationalId: "",
};

const inputClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-60";
const labelClass = "grid gap-1.5 text-sm font-medium text-foreground";

function draftFromStaff(staff: HrStaffDirectoryRecord | null): StaffDraft {
  if (!staff) return emptyDraft;
  return {
    employeeId: staff.employeeId ?? "",
    name: staff.name,
    nameEn: staff.nameEn ?? "",
    age: staff.age === null ? "" : String(staff.age),
    gender: staff.gender,
    education: staff.education ?? "",
    phone: staff.phone ?? "",
    email: staff.email ?? "",
    address: staff.address ?? "",
    maritalStatus: staff.maritalStatus,
    nationalId: staff.nationalId ?? "",
  };
}

function duplicateLocation(duplicate: StaffDuplicate): string {
  const values = [
    duplicate.location.department,
    duplicate.location.office,
    duplicate.location.position,
  ].filter(Boolean);
  return values.length > 0 ? values.join(" → ") : "No active position";
}

export default function StaffFormDialog({
  open,
  staff,
  onOpenChange,
  onSaved,
}: StaffFormDialogProps) {
  const [draft, setDraft] = useState<StaffDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<StaffDuplicate[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft(draftFromStaff(staff));
    setError(null);
    setDuplicates([]);
  }, [open, staff]);

  const title = staff ? "Edit staff record" : "Add staff member";
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = StaffInputSchema.safeParse({
      employeeId: draft.employeeId,
      name: draft.name,
      nameEn: draft.nameEn || null,
      age: draft.age === "" ? Number.NaN : Number(draft.age),
      gender: draft.gender,
      education: draft.education || null,
      phone: draft.phone || null,
      email: draft.email || null,
      address: draft.address || null,
      maritalStatus: draft.maritalStatus,
      nationalId: draft.nationalId || null,
    });

    if (!parsed.success) {
      setError(`VALIDATION:${parsed.error.issues[0]?.message ?? "Check the form values."}`);
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
      await saveStaff(parsed.data, staff?.id ?? null);
      await onSaved();
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the staff record.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-4xl p-0">
        <div className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPlus className="size-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="mt-2">
            HR maintains this organization-wide record. Position assignment is
            managed separately from the chart position.
          </DialogDescription>
        </div>

        <form
          className="grid max-h-[calc(100vh-10rem)] overflow-y-auto"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-5 px-6 py-5">
            {(fieldError || (error && !fieldError)) && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
              >
                {fieldError ?? error}
              </div>
            )}

            {duplicates.length > 0 && (
              <div
                role="alert"
                className="grid gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-4"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="size-4 text-amber-500" />
                  This person may already exist
                </div>
                {duplicates.map((duplicate) => (
                  <div
                    key={duplicate.staffId}
                    className="rounded-md border border-border bg-card p-3 text-sm"
                  >
                    <div className="font-medium">
                      {duplicate.name}
                      {duplicate.nameEn ? ` (${duplicate.nameEn})` : ""}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      ID: {duplicate.employeeId ?? "ID required"} · Matched:{" "}
                      {duplicate.matchedFields.join(", ")}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      Location: {duplicateLocation(duplicate)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <section className="grid gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
                  />
                </label>
                <label className={labelClass}>
                  Age *
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    max={120}
                    value={draft.age}
                    onChange={(event) => update("age", event.target.value)}
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
                <label className={labelClass}>
                  Gender
                  <select
                    className={inputClass}
                    value={draft.gender}
                    onChange={(event) =>
                      update(
                        "gender",
                        event.target.value as StaffDraft["gender"],
                      )
                    }
                  >
                    <option value="unspecified">Unspecified</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Marital status
                  <select
                    className={inputClass}
                    value={draft.maritalStatus}
                    onChange={(event) =>
                      update(
                        "maritalStatus",
                        event.target.value as StaffDraft["maritalStatus"],
                      )
                    }
                  >
                    <option value="unspecified">Unspecified</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Phone
                  <input
                    className={inputClass}
                    value={draft.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    maxLength={50}
                  />
                </label>
                <label className={labelClass}>
                  Email
                  <input
                    className={inputClass}
                    type="email"
                    value={draft.email}
                    onChange={(event) => update("email", event.target.value)}
                    maxLength={320}
                  />
                </label>
                <label className={labelClass}>
                  National ID
                  <input
                    className={inputClass}
                    value={draft.nationalId}
                    onChange={(event) =>
                      update("nationalId", event.target.value)
                    }
                    maxLength={64}
                    autoComplete="off"
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
                  Education
                  <textarea
                    className={`${inputClass} min-h-20 resize-y`}
                    value={draft.education}
                    onChange={(event) =>
                      update("education", event.target.value)
                    }
                    maxLength={4_000}
                    dir="auto"
                  />
                </label>
              </div>
            </section>
          </div>

          <DialogFooter className="border-t border-border bg-secondary/40 px-6 py-4">
            <button
              type="button"
              className="min-h-10 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save staff
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
