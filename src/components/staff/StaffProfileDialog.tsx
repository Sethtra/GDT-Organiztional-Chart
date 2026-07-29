import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  Hash,
  History,
  Info,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import type { StaffProfile } from "../../contracts/hr";
import { loadStaffProfile } from "../../services/staffProfileService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";

interface StaffProfileDialogProps {
  staffId: string;
  onClose: () => void;
}

const proficiencyLabels = [
  "",
  "1 · Basic awareness",
  "2 · Working with guidance",
  "3 · Proficient",
  "4 · Advanced",
  "5 · Expert",
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function ValueRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[138px_1fr] gap-3 border-b border-border/70 py-3 text-sm last:border-0 max-sm:grid-cols-1 max-sm:gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-foreground">{icon}</span>
        {label}
      </div>
      <div className="break-words text-card-foreground">
        {value === null || value === undefined || value === "" ? "—" : value}
      </div>
    </div>
  );
}

export default function StaffProfileDialog({
  staffId,
  onClose,
}: StaffProfileDialogProps) {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadStaffProfile(staffId)
      .then((nextProfile) => {
        if (!cancelled) setProfile(nextProfile);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this officer profile.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [staffId]);

  const activeSkills = useMemo(
    () => profile?.skills.filter((skill) => skill.effectiveTo === null) ?? [],
    [profile],
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(820px,calc(100vh-2rem))] max-w-4xl grid-rows-none flex-col overflow-hidden p-0">
        <div className="border-b border-border bg-secondary/35 px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-foreground" />
            Officer profile
          </DialogTitle>
          <DialogDescription className="mt-1.5">
            Current HR information, skills, and position history
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid min-h-72 place-items-center text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin text-foreground" />
                Loading profile…
              </div>
            </div>
          ) : error || !profile ? (
            <div
              role="alert"
              className="m-6 rounded-lg border border-destructive/45 bg-destructive/10 p-4 text-sm"
            >
              {error || "Profile not found."}
            </div>
          ) : (
            <div className="grid gap-5 p-6">
              <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-secondary/35 p-5">
                <div className="grid size-14 place-items-center rounded-lg border border-primary/35 bg-primary/20 text-xl font-bold text-foreground">
                  {(profile.nameEn || profile.name).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold" dir="auto">
                    {profile.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {[profile.nameEn, profile.employeeId]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <BriefcaseBusiness className="size-4 shrink-0" />
                    {profile.jobTitle?.name ?? "Position not selected"}
                  </p>
                  {profile.currentPosition && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        profile.currentPosition.departmentName,
                        profile.currentPosition.officeName,
                      ]
                        .filter(Boolean)
                        .join(" → ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border bg-background/30 px-3 py-1.5 text-xs text-foreground">
                  {profile.access === "hr" ? (
                    <ShieldCheck className="size-3.5" />
                  ) : (
                    <BadgeCheck className="size-3.5" />
                  )}
                  {profile.access === "hr" ? "HR view" : "Invited view"}
                </div>
              </section>

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    Officer information
                  </h3>
                  <ValueRow
                    icon={<Hash className="size-3.5" />}
                    label="Employee ID"
                    value={profile.employeeId}
                  />
                  <ValueRow
                    icon={<CalendarDays className="size-3.5" />}
                    label="Date of birth"
                    value={formatDate(profile.dateOfBirth)}
                  />
                  <ValueRow
                    icon={<UserRound className="size-3.5" />}
                    label="Gender"
                    value={profile.gender}
                  />
                  <ValueRow
                    icon={<UserRound className="size-3.5" />}
                    label="Marital status"
                    value={profile.maritalStatus}
                  />
                  <ValueRow
                    icon={<Phone className="size-3.5" />}
                    label="Phone"
                    value={profile.phone}
                  />
                  <ValueRow
                    icon={<MapPin className="size-3.5" />}
                    label="Address"
                    value={profile.address}
                  />
                  <ValueRow
                    icon={<GraduationCap className="size-3.5" />}
                    label="Education"
                    value={profile.education}
                  />
                </section>

                <section className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    Employment details
                  </h3>
                  <ValueRow
                    icon={<BriefcaseBusiness className="size-3.5" />}
                    label="Position"
                    value={profile.jobTitle?.name}
                  />
                  <ValueRow
                    icon={<CalendarDays className="size-3.5" />}
                    label="Joined date"
                    value={formatDate(profile.joinedDate)}
                  />
                  <ValueRow
                    icon={<CalendarDays className="size-3.5" />}
                    label="Retired date"
                    value={formatDate(profile.retiredDate)}
                  />
                  <ValueRow
                    icon={<Info className="size-3.5" />}
                    label="Other"
                    value={profile.otherInformation}
                  />
                </section>
              </div>

              <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4 text-foreground" />
                  Current skills
                </h3>
                {activeSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active skill records.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="rounded-lg border border-border bg-secondary/35 p-3"
                      >
                        <div className="text-sm font-medium">
                          {skill.skill.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {proficiencyLabels[skill.proficiency]}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4 text-foreground" />
                  Position history
                </h3>
                {profile.assignmentHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No position history has been recorded.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {profile.assignmentHistory.map((assignment) => (
                      <article
                        key={assignment.id}
                        className="grid grid-cols-[12px_1fr] gap-3"
                      >
                        <div className="mt-1.5 size-2 rounded-full bg-primary ring-4 ring-primary/15" />
                        <div className="rounded-lg border border-border bg-secondary/30 p-3">
                          <div className="font-medium">
                            {assignment.position.title}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {[
                              assignment.position.departmentName,
                              assignment.position.officeName,
                            ]
                              .filter(Boolean)
                              .join(" → ") || "Chart position"}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {formatDate(assignment.joinedDate)} —{" "}
                            {assignment.leftDate
                              ? formatDate(assignment.leftDate)
                              : "Present"}
                            {assignment.reason
                              ? ` · ${assignment.reason}`
                              : ""}
                          </div>
                          {assignment.notes && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {assignment.notes}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
