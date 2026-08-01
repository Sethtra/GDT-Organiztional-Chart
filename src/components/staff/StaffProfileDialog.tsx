import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  GraduationCap,
  Hash,
  Info,
  Loader2,
  LocateFixed,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import type { StaffProfile } from "../../contracts/hr";
import { loadStaffProfile } from "../../services/staffProfileService";
import { buildChartNodePath } from "../../utils/chartNodeNavigation";
import { getDisplayedStaffPlacement } from "../../utils/staffDisplay";
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

type ProfileTab = "overview" | "skills" | "history";

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
    <div className="grid grid-cols-[138px_1fr] gap-3 border-b border-[#d9e1dc] py-3 text-[12.5px] last:border-0 max-sm:grid-cols-1 max-sm:gap-1">
      <div className="flex items-center gap-2 font-semibold text-[#66716b]">
        <span className="text-[#16211b]">{icon}</span>
        {label}
      </div>
      <div className="break-words font-medium text-[#16211b]">
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
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveTab("overview");
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
  const activeAssignments = useMemo(
    () =>
      profile?.assignmentHistory.filter(
        (assignment) => assignment.leftDate === null,
      ) ?? [],
    [profile],
  );
  const displayedPlacement = profile
    ? getDisplayedStaffPlacement(profile)
    : null;

  const tabs: Array<{ id: ProfileTab; label: string }> = profile
    ? [
        { id: "overview", label: "Overview" },
        { id: "skills", label: `Skills (${activeSkills.length})` },
        {
          id: "history",
          label: `History (${profile.assignmentHistory.length})`,
        },
      ]
    : [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex h-[min(820px,calc(100vh-2rem))] max-w-4xl grid-rows-none flex-col overflow-hidden rounded-[16px] border-[#d9e1dc] bg-white p-0 text-[#16211b] shadow-2xl"
        style={{ fontFamily: "'Manrope', 'Noto Sans Khmer', system-ui, sans-serif" }}
      >
        <div className="shrink-0 border-b border-[#d9e1dc] bg-[#f3f5f2] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.015em] text-[#16211b]">
            <UserRound className="size-5 text-[#136232]" />
            Officer profile
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[12.5px] font-medium text-[#66716b]">
            Current HR information, skills, and position history
          </DialogDescription>
        </div>

        {loading ? (
          <div className="grid flex-1 place-items-center text-[#66716b]">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold">
              <Loader2 className="size-5 animate-spin text-[#136232]" />
              Loading profile…
            </div>
          </div>
        ) : error || !profile ? (
          <div
            role="alert"
            className="m-6 rounded-[10px] border border-[#efc8c4] bg-[#fdecea] p-4 text-[12.5px] font-medium text-[#9c332d]"
          >
            {error || "Profile not found."}
          </div>
        ) : (
          <>
            {/* Sticky profile summary */}
            <div className="shrink-0 border-b border-[#d9e1dc] bg-[#f3f5f2] px-6 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-[12px] border border-[#c6e1d1] bg-[#e7f3ec] text-[18px] font-extrabold text-[#136232]">
                  {(profile.nameEn || profile.name).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h2 className="text-[15px] font-extrabold text-[#16211b]" dir="auto">
                      {profile.name}
                    </h2>
                    <span className="text-[11.5px] font-medium text-[#66716b]">
                      {[profile.nameEn, profile.employeeId]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-semibold text-[#16211b]">
                    <span className="flex items-center gap-1.5">
                      <BriefcaseBusiness className="size-3.5 shrink-0 text-[#136232]" />
                      {profile.jobTitle?.name ?? "Position not selected"}
                    </span>
                    {displayedPlacement && (
                      <span className="text-[11.5px] font-medium text-[#66716b]">
                        {[
                          displayedPlacement.departmentName,
                          displayedPlacement.officeName,
                        ]
                          .filter(Boolean)
                          .join(" → ")}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[#d9e1dc] bg-white px-3 py-1.5 text-[11px] font-bold text-[#16211b]">
                  {profile.access === "hr" ? (
                    <ShieldCheck className="size-3.5 text-[#136232]" />
                  ) : (
                    <BadgeCheck className="size-3.5 text-[#315c6b]" />
                  )}
                  {profile.access === "hr" ? "HR view" : "Invited view"}
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div className="shrink-0 flex items-center gap-5 border-b border-[#d9e1dc] px-6">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative py-3 text-[12px] font-bold transition-colors ${
                      active
                        ? "text-[#136232]"
                        : "text-[#66716b] hover:text-[#16211b]"
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[#136232]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scrollable tab content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {activeTab === "overview" && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-[14px] border border-[#d9e1dc] bg-white p-4">
                    <h3 className="mb-2 text-[12.5px] font-extrabold text-[#16211b]">
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

                  <section className="rounded-[14px] border border-[#d9e1dc] bg-white p-4">
                    <h3 className="mb-2 text-[12.5px] font-extrabold text-[#16211b]">
                      Employment details
                    </h3>
                    <ValueRow
                      icon={<BriefcaseBusiness className="size-3.5" />}
                      label="Position"
                      value={profile.jobTitle?.name}
                    />
                    <ValueRow
                      icon={<Building2 className="size-3.5" />}
                      label="Department"
                      value={displayedPlacement?.departmentName}
                    />
                    <ValueRow
                      icon={<Building2 className="size-3.5" />}
                      label="Office"
                      value={displayedPlacement?.officeName ?? "Not assigned"}
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
              )}

              {activeTab === "skills" &&
                (activeSkills.length === 0 ? (
                  <p className="text-[12.5px] font-medium text-[#66716b]">
                    No active skill records.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="rounded-[10px] border border-[#d9e1dc] bg-[#f3f5f2] p-3"
                      >
                        <div className="text-[12.5px] font-bold text-[#16211b]">
                          {skill.skill.name}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-[#66716b]">
                          {proficiencyLabels[skill.proficiency]}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

              {activeTab === "history" && (
                <>
                  {activeAssignments.length > 1 && (
                    <div
                      role="alert"
                      className="mb-3 flex gap-3 rounded-[10px] border border-[#efc8c4] bg-[#fdecea] p-3"
                    >
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#9c332d]" />
                      <div>
                        <div className="text-[12.5px] font-bold text-[#16211b]">
                          Multiple active node assignments found
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-[#66716b]">
                          This officer is linked to {activeAssignments.length}{" "}
                          current nodes. Open each node and vacate the incorrect
                          assignment.
                        </p>
                      </div>
                    </div>
                  )}
                  {profile.assignmentHistory.length === 0 ? (
                    <p className="text-[12.5px] font-medium text-[#66716b]">
                      No position history has been recorded.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {profile.assignmentHistory.map((assignment) => (
                        <article
                          key={assignment.id}
                          className="grid grid-cols-[12px_1fr] gap-3"
                        >
                          <div className="mt-1.5 size-2 rounded-full bg-[#136232] ring-4 ring-[#136232]/15" />
                          <div className="rounded-[10px] border border-[#d9e1dc] bg-[#f3f5f2] p-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-[12.5px] font-bold text-[#16211b]">
                                  {assignment.position.title}
                                </div>
                                {assignment.leftDate === null && (
                                  <span className="mt-1 inline-flex rounded-full border border-[#c6e1d1] bg-[#e7f3ec] px-2 py-0.5 text-[10.5px] font-bold text-[#136232]">
                                    Current assignment
                                  </span>
                                )}
                              </div>
                              <Link
                                to={buildChartNodePath(
                                  assignment.position.chartId,
                                  assignment.position.nodeId,
                                )}
                                onClick={onClose}
                                aria-label={`Go to node for ${assignment.position.title}`}
                                className="inline-flex min-h-9 items-center gap-2 rounded-[8px] border border-[#c6e1d1] bg-[#e7f3ec] px-3 text-[11px] font-bold text-[#136232] transition-colors hover:bg-[#d9ecdf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#136232]/40"
                              >
                                <LocateFixed className="size-3.5 text-[#136232]" />
                                Go to node
                              </Link>
                            </div>
                            <div className="mt-2 text-[11px] font-medium text-[#66716b]">
                              {formatDate(assignment.joinedDate)} —{" "}
                              {assignment.leftDate
                                ? formatDate(assignment.leftDate)
                                : "Present"}
                              {assignment.reason
                                ? ` · ${assignment.reason}`
                                : ""}
                            </div>
                            {assignment.notes && (
                              <div className="mt-1 text-[11px] font-medium text-[#66716b]">
                                {assignment.notes}
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
