import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  Hash,
  History,
  IdCard,
  Loader2,
  Mail,
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
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-border/60 py-2.5 text-sm last:border-0 max-sm:grid-cols-1 max-sm:gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="break-words">
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
              : "Unable to load this staff profile.",
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
      <DialogContent className="flex h-[min(820px,calc(100vh-2rem))] max-w-4xl grid-rows-none flex-col p-0">
        <div className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-primary" />
            Staff Profile
          </DialogTitle>
          <DialogDescription className="mt-2">
            Current GDT profile, skills, and complete position history
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid min-h-72 place-items-center text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                Loading profile…
              </div>
            </div>
          ) : error || !profile ? (
            <div
              role="alert"
              className="m-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm"
            >
              {error || "Profile not found."}
            </div>
          ) : (
            <div className="grid gap-5 p-6">
              <section className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-secondary/40 p-5">
                <div className="grid size-14 place-items-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
                  {(profile.nameEn || profile.name).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold" dir="auto">
                    {profile.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {profile.nameEn || profile.employeeId}
                  </p>
                  <p className="mt-1 text-sm">
                    {profile.currentPosition
                      ? [
                          profile.currentPosition.departmentName,
                          profile.currentPosition.officeName,
                          profile.currentPosition.title,
                        ].filter(Boolean).join(" → ")
                      : "No active position"}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">
                  {profile.access === "hr" ? (
                    <ShieldCheck className="size-3.5 text-primary" />
                  ) : (
                    <BadgeCheck className="size-3.5 text-primary" />
                  )}
                  {profile.access === "hr" ? "HR full view" : "Invited view"}
                </div>
              </section>

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-lg border border-border bg-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    Personal information
                  </h3>
                  <ValueRow
                    icon={<Hash className="size-3.5" />}
                    label="Employee ID"
                    value={profile.employeeId}
                  />
                  <ValueRow
                    icon={<CalendarDays className="size-3.5" />}
                    label="Age"
                    value={profile.age}
                  />
                  <ValueRow
                    icon={<UserRound className="size-3.5" />}
                    label="Gender"
                    value={profile.gender}
                  />
                  <ValueRow
                    icon={<Phone className="size-3.5" />}
                    label="Phone"
                    value={profile.phone}
                  />
                  <ValueRow
                    icon={<Mail className="size-3.5" />}
                    label="Email"
                    value={profile.email}
                  />
                  <ValueRow
                    icon={<MapPin className="size-3.5" />}
                    label="Address"
                    value={profile.address}
                  />
                  <ValueRow
                    icon={<IdCard className="size-3.5" />}
                    label="National ID"
                    value={
                      profile.access === "hr"
                        ? profile.nationalId
                        : profile.nationalIdMasked
                    }
                  />
                  <ValueRow
                    icon={<GraduationCap className="size-3.5" />}
                    label="Education"
                    value={profile.education}
                  />
                </section>

                <section className="rounded-lg border border-border bg-card p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="size-4 text-primary" />
                    Current skills
                  </h3>
                  {activeSkills.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active skill records.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {activeSkills.map((skill) => (
                        <div
                          key={skill.id}
                          className="rounded-md border border-border bg-secondary/40 p-3"
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
              </div>

              <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4 text-primary" />
                  Position history
                </h3>
                {profile.assignmentHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No assignment history is recorded.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {profile.assignmentHistory.map((assignment) => (
                      <article
                        key={assignment.id}
                        className="rounded-md border border-border bg-secondary/30 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <BriefcaseBusiness className="mt-0.5 size-4 shrink-0 text-primary" />
                          <div>
                            <div className="text-sm font-semibold">
                              {assignment.position.title}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {[
                                assignment.position.departmentName,
                                assignment.position.officeName,
                              ].filter(Boolean).join(" → ") || "Location not recorded"}
                            </div>
                            <div className="mt-2 text-xs">
                              {assignment.joinedDate} →{" "}
                              {assignment.leftDate || "Present"}
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
