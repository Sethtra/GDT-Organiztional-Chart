import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  Building2,
  History,
  Loader2,
  MapPin,
  UserRound,
} from "lucide-react";

import { useHrAdmin } from "../hooks/useHrAdmin";
import { listJobArchitecture } from "../services/jobArchitectureService";
import type { JobTitle } from "../contracts/hr";
import {
  loadAssignmentSummary,
  type AssignmentSummary,
} from "../services/positionAssignmentService";
import {
  loadPositionConfiguration,
  type PositionConfigurationContext,
} from "../services/positionConfigurationService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

interface PositionDetailDialogProps {
  node: { id: string; data?: Record<string, unknown> };
  onClose: () => void;
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatDate(value: string | null | undefined): string {
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
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-[var(--pa-border)] px-4 py-3 last:border-0 max-sm:grid-cols-1 max-sm:gap-1">
      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--pa-muted)]">
        <span className="text-[var(--pa-faint)]">{icon}</span>
        {label}
      </div>
      <div className="break-words text-[12.5px] font-bold text-[var(--pa-text)]">
        {value === null || value === undefined || value === "" ? (
          <span className="font-semibold text-[var(--pa-faint)]">Not recorded</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-[var(--pa-border)] bg-white">
      {title && (
        <h3 className="flex items-center gap-2 border-b border-[var(--pa-border)] bg-[var(--pa-canvas)] px-4 py-2.5 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--pa-muted)]">
          {icon}
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

/**
 * Read-only "View Details" card for a position that has no relational
 * staff occupant to load a StaffProfileDialog for (a vacant node, or any
 * node before HR data has been attached). Shows what's already safely on
 * the node (job title / department / office) for every viewer, and adds
 * history + minimum skills only when the manage-scoped RPCs succeed —
 * a plain viewer without edit rights simply won't see those sections,
 * with no error surfaced, since that denial is expected, not a failure.
 */
export default function PositionDetailDialog({
  node,
  onClose,
}: PositionDetailDialogProps) {
  const { isHrAdmin } = useHrAdmin();
  const positionId = stringField(node.data?.positionId);

  const [config, setConfig] = useState<PositionConfigurationContext | null>(
    null,
  );
  const [summary, setSummary] = useState<AssignmentSummary | null>(null);
  const [jobArchitecture, setJobArchitecture] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(Boolean(positionId));

  useEffect(() => {
    if (!positionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      loadPositionConfiguration(positionId).catch(() => null),
      loadAssignmentSummary(positionId).catch(() => null),
    ]).then(([nextConfig, nextSummary]) => {
      if (cancelled) return;
      setConfig(nextConfig);
      setSummary(nextSummary);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [positionId]);

  useEffect(() => {
    if (!isHrAdmin) return;
    let cancelled = false;
    void listJobArchitecture()
      .then((titles) => {
        if (!cancelled) setJobArchitecture(titles);
      })
      .catch(() => {
        /* Requirements are supplementary; a failed fetch just hides them. */
      });
    return () => {
      cancelled = true;
    };
  }, [isHrAdmin]);

  const jobTitleFromConfig = config?.jobTitles.find(
    (title) => title.id === config.jobTitleId,
  );
  const jobTitleName =
    jobTitleFromConfig?.name ??
    stringField(node.data?.position) ??
    stringField(node.data?.badgeText);
  const departmentName = stringField(node.data?.department);
  const officeName = stringField(node.data?.office);

  const requirements = useMemo(() => {
    if (!config?.jobTitleId) return [];
    return (
      jobArchitecture.find((title) => title.id === config.jobTitleId)
        ?.requirements ?? []
    );
  }, [jobArchitecture, config]);

  const canSeeManagedData = Boolean(config || summary);
  const occupant = summary?.occupant ?? null;
  // A position with nothing on the node and no occupant has not been set up
  // yet — say so, rather than showing a column of dashes.
  const unconfigured =
    !occupant && !jobTitleName && !departmentName && !officeName;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="pa-theme flex max-h-[calc(100dvh-2rem)] max-w-xl flex-col overflow-hidden border-[var(--pa-border)] bg-[var(--pa-canvas)] p-0">
        {/* Masthead, carrying the register's green rule. */}
        <div className="shrink-0 border-b border-[var(--pa-border)] bg-white px-6 py-4 shadow-[inset_0_-4px_0_-3px_var(--pa-primary)]">
          <div className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--pa-primary)]">
            Position
          </div>
          <DialogTitle className="mt-1.5 flex items-center gap-2 text-[17px] font-extrabold tracking-[-0.02em] text-[var(--pa-text)]">
            <BriefcaseBusiness className="size-[18px] text-[var(--pa-muted)]" />
            {jobTitleName || "Position details"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-[11.5px] font-medium text-[var(--pa-muted)]">
            Read-only summary — nothing is edited here.
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pa-scrollbar">
          {loading ? (
            <div className="grid min-h-52 place-items-center">
              <div className="flex items-center gap-2.5 text-[12px] font-bold text-[var(--pa-muted)]">
                <Loader2 className="size-4 animate-spin text-[var(--pa-primary)]" />
                Loading position…
              </div>
            </div>
          ) : (
            <div className="grid gap-4 p-5">
              {/* Status leads: it is the one thing every viewer came for. */}
              <div
                className={`flex items-center gap-3 rounded-[12px] border px-4 py-3.5 ${
                  occupant
                    ? "border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)]"
                    : "border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)]"
                }`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-[9px] border bg-white ${
                    occupant
                      ? "border-[var(--pa-primary-border)] text-[var(--pa-primary)]"
                      : "border-[var(--pa-gold-border)] text-[#8a6716]"
                  }`}
                >
                  <UserRound className="size-[17px]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div
                    className={`text-[9.5px] font-extrabold uppercase tracking-[0.12em] ${
                      occupant ? "text-[var(--pa-primary)]" : "text-[#8a6716]"
                    }`}
                  >
                    Status
                  </div>
                  <div className="mt-0.5 truncate text-[13.5px] font-extrabold text-[var(--pa-text)]">
                    {occupant ? occupant.name : "Vacant"}
                  </div>
                  {!occupant && (
                    <p className="mt-0.5 text-[11px] font-semibold text-[#735413]">
                      No officer currently holds this position.
                    </p>
                  )}
                </div>
              </div>

              {unconfigured ? (
                <SectionCard>
                  <div className="flex flex-col items-center px-6 py-9 text-center">
                    <span className="flex size-11 items-center justify-center rounded-[10px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] text-[var(--pa-faint)]">
                      <BriefcaseBusiness className="size-[19px]" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3.5 text-[13px] font-extrabold text-[var(--pa-text)]">
                      This position has no details yet
                    </h3>
                    <p className="mt-1.5 max-w-[40ch] text-[11.5px] leading-5 text-[var(--pa-muted)]">
                      No job title, department or office has been recorded against
                      it. An HR administrator sets these from the properties panel.
                    </p>
                  </div>
                </SectionCard>
              ) : (
                <SectionCard title="Record">
                  <ValueRow
                    icon={<BriefcaseBusiness className="size-3.5" />}
                    label="Job title"
                    value={jobTitleName}
                  />
                  <ValueRow
                    icon={<Building2 className="size-3.5" />}
                    label="Department"
                    value={departmentName}
                  />
                  <ValueRow
                    icon={<MapPin className="size-3.5" />}
                    label="Office"
                    value={officeName}
                  />
                </SectionCard>
              )}

              {isHrAdmin && requirements.length > 0 && (
                <SectionCard
                  icon={<Award className="size-3.5 text-[var(--pa-gold)]" />}
                  title="Minimum skills"
                >
                  <div className="grid gap-2 p-4 sm:grid-cols-2">
                    {requirements.map((requirement) => (
                      <div
                        key={requirement.id}
                        className="rounded-[10px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] p-3"
                      >
                        <div className="text-[12px] font-extrabold text-[var(--pa-text)]">
                          {requirement.skill.name}
                        </div>
                        <div className="pa-tabular mt-1 text-[10.5px] font-semibold text-[var(--pa-muted)]">
                          Minimum level {requirement.minimumProficiency}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {summary && summary.history.length > 0 && (
                <SectionCard
                  icon={<History className="size-3.5 text-[var(--pa-muted)]" />}
                  title="Position history"
                >
                  <div className="grid gap-3 p-4">
                    {summary.history.map((entry) => (
                      <article
                        key={entry.assignmentId}
                        className="grid grid-cols-[10px_1fr] gap-3"
                      >
                        <div className="mt-2 size-2 rounded-full bg-[var(--pa-primary)] ring-4 ring-[var(--pa-primary-soft)]" />
                        <div className="rounded-[10px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] p-3">
                          <div className="text-[12px] font-extrabold text-[var(--pa-text)]">
                            {entry.name}
                          </div>
                          <div className="pa-tabular mt-1.5 text-[10.5px] font-semibold text-[var(--pa-muted)]">
                            {formatDate(entry.joinedDate)} —{" "}
                            {formatDate(entry.leftDate)}
                            {entry.reason ? ` · ${entry.reason}` : ""}
                          </div>
                          {entry.notes && (
                            <div className="mt-1 text-[10.5px] font-medium text-[var(--pa-faint)]">
                              {entry.notes}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </SectionCard>
              )}

              {!canSeeManagedData && (
                <p className="px-1 text-[10.5px] font-semibold leading-4 text-[var(--pa-faint)]">
                  Position history is visible to chart editors and HR
                  administrators.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
