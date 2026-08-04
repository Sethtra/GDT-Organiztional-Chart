import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Loader2,
  Phone,
  Save,
  Sparkles,
  Upload,
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
  uploadStaffPhoto,
} from "../../services/staffService";
import { ImagePrepError, validateOfficerPhotoFile } from "../../utils/imagePrep";
import PhotoCropDialog from "./PhotoCropDialog";
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
  photoUrl: string;
}

type FormSection = "personal" | "employment" | "contact";

const SECTION_FIELDS: Record<FormSection, ReadonlyArray<keyof StaffDraft>> = {
  personal: ["employeeId", "dateOfBirth", "name", "nameEn", "gender", "education", "photoUrl"],
  employment: ["departmentId", "officeId", "jobTitleId", "joinedDate", "retiredDate"],
  contact: ["phone", "address", "otherInformation"],
};

const SECTION_TABS: Array<{
  id: FormSection;
  label: string;
  icon: typeof UserRoundPlus;
}> = [
  { id: "personal", label: "Personal information", icon: UserRoundPlus },
  { id: "employment", label: "Employment", icon: BriefcaseBusiness },
  { id: "contact", label: "Contact & background", icon: Phone },
];

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
  photoUrl: "",
};

const inputClass =
  "min-h-11 w-full rounded-[9px] border border-[#d9e1dc] bg-[#f3f5f2] px-3 py-2 text-[13px] font-medium text-[#16211b] outline-none transition placeholder:text-[#87918b] focus:border-[#136232] focus:bg-white focus:ring-2 focus:ring-[#136232]/25 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass =
  "grid gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-[#66716b]";

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
    photoUrl: staff.photoUrl ?? "",
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

function formatValidationError(
  issue?: { path?: ReadonlyArray<unknown>; message?: string } | null,
): string {
  const message = issue?.message ?? "";
  const isTechnicalMessage =
    !message ||
    message.startsWith("Too small:") ||
    message.includes("expected string") ||
    message === "Required" ||
    message === "Invalid uuid" ||
    message === "Invalid input";

  if (!isTechnicalMessage) {
    return message;
  }

  const field = issue?.path?.[0];
  switch (field) {
    case "employeeId":
      return "Please enter an Officer / Employee ID.";
    case "name":
      return "Please enter the Officer Name (Khmer).";
    case "jobTitleId":
      return "Please select a Position / Job Title.";
    case "departmentId":
      return "Please select a Department.";
    case "dateOfBirth":
      return "Please select a Date of Birth.";
    case "joinedDate":
      return "Please select a Joined Date.";
    case "retiredDate":
      return "Please select a valid Retired Date.";
    default:
      return "Please check the required form fields.";
  }
}

function sectionForField(fieldName: unknown): FormSection | null {
  for (const [section, fields] of Object.entries(SECTION_FIELDS) as Array<
    [FormSection, ReadonlyArray<keyof StaffDraft>]
  >) {
    if (fields.includes(fieldName as keyof StaffDraft)) return section;
  }
  return null;
}

export default function StaffFormDialog({
  open,
  staff,
  onOpenChange,
  onSaved,
}: StaffFormDialogProps) {
  const [draft, setDraft] = useState<StaffDraft>(emptyDraft);
  const [activeSection, setActiveSection] = useState<FormSection>("personal");
  const [positions, setPositions] = useState<JobTitle[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<StaffDuplicate[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
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
    setActiveSection("personal");
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

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      validateOfficerPhotoFile(file);
      setError(null);
      setCropFile(file);
    } catch (validationError) {
      setError(
        validationError instanceof ImagePrepError
          ? validationError.message
          : "Unable to use this photo.",
      );
    }
  };

  const handleCropConfirm = async (photo: Blob) => {
    setCropFile(null);
    setUploadingPhoto(true);
    setError(null);
    try {
      const url = await uploadStaffPhoto(photo);
      update("photoUrl", url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload this photo.",
      );
    } finally {
      setUploadingPhoto(false);
    }
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
      photoUrl: draft.photoUrl || null,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const invalidSection = sectionForField(firstIssue?.path[0]);
      if (invalidSection) setActiveSection(invalidSection);
      const friendlyMessage = formatValidationError(firstIssue);
      setError(`VALIDATION:${friendlyMessage}`);
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
    <>
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent
        className="max-w-3xl overflow-hidden rounded-[16px] border-[#d9e1dc] bg-white p-0 text-[#16211b] shadow-2xl"
        style={{ fontFamily: "'Manrope', 'Noto Sans Khmer', system-ui, sans-serif" }}
      >
        <div className="border-b border-[#d9e1dc] bg-[#f3f5f2] px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-[#c6e1d1] bg-[#e7f3ec] text-[#136232]">
              <UserRoundPlus className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-[16px] font-extrabold tracking-[-0.015em] text-[#16211b]">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-[12.5px] font-medium text-[#66716b]">
                Enter the officer's HR record, department, and position.
              </DialogDescription>
            </div>
          </div>
        </div>

        <form
          className="grid max-h-[calc(100vh-8rem)] overflow-y-auto"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-5 px-6 py-6">
            {(fieldError || (error && !fieldError)) && (
              <div
                role="alert"
                className="flex items-center gap-2.5 rounded-[10px] border border-[#efc8c4] bg-[#fdecea] px-4 py-3 text-[12.5px] font-semibold text-[#9c332d]"
              >
                <AlertTriangle className="size-4 shrink-0 text-[#9c332d]" />
                <span>{fieldError ?? error}</span>
              </div>
            )}

            {duplicates.length > 0 && (
              <div
                role="alert"
                className="grid gap-3 rounded-[10px] border border-[#ead7a1] bg-[#fff6dd] p-4"
              >
                <div className="flex items-center gap-2 text-[12.5px] font-extrabold text-[#16211b]">
                  <AlertTriangle className="size-4 text-[#b48728]" />
                  This officer may already exist
                </div>
                {duplicates.map((duplicate) => (
                  <div
                    key={duplicate.staffId}
                    className="rounded-[9px] border border-[#d9e1dc] bg-white p-3 text-[12px]"
                  >
                    <div className="font-bold text-[#16211b]" dir="auto">
                      {duplicate.name}
                      {duplicate.nameEn ? ` (${duplicate.nameEn})` : ""}
                    </div>
                    <div className="mt-1 font-medium text-[#66716b]">
                      ID: {duplicate.employeeId ?? "Not set"} · Matched:{" "}
                      {duplicate.matchedFields
                        .map(duplicateMatchLabel)
                        .join(", ")}
                    </div>
                    <div className="mt-1 font-medium text-[#66716b]">
                      Location: {duplicateLocation(duplicate)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 border-b border-[#d9e1dc] pb-3">
              {SECTION_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[11.5px] font-extrabold transition-colors ${
                      active
                        ? "bg-[#136232] text-white"
                        : "text-[#66716b] hover:bg-[#eef2ee] hover:text-[#16211b]"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeSection === "personal" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`${labelClass} md:col-span-2`}>
                  <span>Photo</span>
                  <div className="flex items-center gap-4 pt-0.5 normal-case">
                    <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d9e1dc] bg-[#f3f5f2] text-[24px] font-extrabold text-[#136232]">
                      {draft.photoUrl ? (
                        <img
                          src={draft.photoUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        (draft.nameEn || draft.name || "?").trim().charAt(0).toUpperCase()
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 grid place-items-center bg-black/45">
                          <Loader2 className="size-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="grid gap-1.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#c6e1d1] bg-[#e7f3ec] px-3 py-2 text-[11.5px] font-extrabold text-[#136232] transition hover:bg-[#d9ecdf] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Upload className="size-3.5" />
                          {draft.photoUrl ? "Replace photo" : "Upload photo"}
                        </button>
                        {draft.photoUrl && (
                          <button
                            type="button"
                            onClick={() => update("photoUrl", "")}
                            disabled={uploadingPhoto}
                            className="rounded-[8px] border border-[#d9e1dc] px-3 py-2 text-[11.5px] font-bold text-[#66716b] transition hover:bg-[#eef2ee] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <span className="text-[10.5px] font-medium tracking-normal text-[#87918b]">
                        JPG, PNG, or WebP · up to 10MB
                      </span>
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => void handlePhotoSelect(event)}
                    />
                  </div>
                </div>
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
                    <label className="flex flex-1 items-center justify-center gap-2 cursor-pointer rounded-[9px] border border-[#d9e1dc] bg-[#f3f5f2] px-3.5 py-2.5 text-[13px] font-semibold text-[#16211b] transition-all hover:bg-[#eef2ee] has-[:checked]:border-[#136232]/70 has-[:checked]:bg-[#e7f3ec] has-[:checked]:text-[#136232]">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={draft.gender === "male"}
                        onChange={() => update("gender", "male")}
                        className="size-4 accent-[#136232] cursor-pointer"
                      />
                      <span>ប្រុស</span>
                    </label>

                    <label className="flex flex-1 items-center justify-center gap-2 cursor-pointer rounded-[9px] border border-[#d9e1dc] bg-[#f3f5f2] px-3.5 py-2.5 text-[13px] font-semibold text-[#16211b] transition-all hover:bg-[#eef2ee] has-[:checked]:border-[#136232]/70 has-[:checked]:bg-[#e7f3ec] has-[:checked]:text-[#136232]">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={draft.gender === "female"}
                        onChange={() => update("gender", "female")}
                        className="size-4 accent-[#136232] cursor-pointer"
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
            )}

            {activeSection === "employment" && (
              <div className="grid gap-4">
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
                    className="flex gap-2 rounded-[10px] border border-[#efc8c4] bg-[#fdecea] px-3.5 py-3 text-[11.5px] font-medium leading-5 text-[#9c332d]"
                  >
                    <Building2 className="mt-0.5 size-4 shrink-0" />
                    {organizationError}
                  </div>
                )}
                <div className="flex gap-2 rounded-[10px] border border-[#d9e1dc] bg-[#f3f5f2] px-3.5 py-3 text-[11.5px] font-medium leading-5 text-[#66716b]">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-[#16211b]" />
                  Office is optional. When selected, it must belong to the
                  chosen department.
                </div>
              </div>
            )}

            {activeSection === "contact" && (
              <div className="grid gap-4">
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

                <div className="rounded-[10px] border border-[#d9e1dc] bg-[#f3f5f2] px-4 py-3 text-[12.5px] font-medium text-[#66716b]">
                  <span className="flex items-center gap-1.5 font-extrabold text-[#16211b]">
                    <Sparkles className="size-3.5 text-[#136232]" />
                    Current skills
                  </span>
                  <p className="mt-1.5">
                    Skills are managed separately from Education. Use
                    <span className="font-extrabold text-[#16211b]">
                      {" "}Save & manage skills{" "}
                    </span>
                    to add current skills and proficiency levels after this
                    officer record is saved.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-[#d9e1dc] bg-[#f3f5f2] px-6 py-4">
            <button
              type="button"
              className="min-h-10 rounded-[9px] border border-[#d9e1dc] px-4 text-[12.5px] font-bold text-[#16211b] transition hover:bg-[#eef2ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#136232]/40"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              name="saveIntent"
              value="skills"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-[#c6e1d1] px-4 text-[12.5px] font-extrabold text-[#136232] transition hover:bg-[#e7f3ec] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#136232]/40 disabled:opacity-60"
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
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] bg-[#136232] px-5 text-[12.5px] font-extrabold text-white transition hover:bg-[#0f5129] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#136232]/40 disabled:opacity-60"
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
    {cropFile && (
      <PhotoCropDialog
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onConfirm={(photo) => void handleCropConfirm(photo)}
      />
    )}
    </>
  );
}
