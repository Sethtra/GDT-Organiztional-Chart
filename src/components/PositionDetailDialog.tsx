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
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-border/70 py-3 text-sm last:border-0 max-sm:grid-cols-1 max-sm:gap-1">
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(760px,calc(100vh-2rem))] max-w-2xl flex-col overflow-hidden p-0">
        <div className="border-b border-border bg-secondary/35 px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <BriefcaseBusiness className="size-5 text-foreground" />
            Position details
          </DialogTitle>
          <DialogDescription className="mt-1.5">
            Read-only summary — no fields to edit here
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid min-h-72 place-items-center text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin text-foreground" />
                Loading position…
              </div>
            </div>
          ) : (
            <div className="grid gap-5 p-6">
              <section className="rounded-xl border border-border bg-card p-4">
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
                <ValueRow
                  icon={<UserRound className="size-3.5" />}
                  label="Status"
                  value={
                    summary?.occupant
                      ? `Occupied — ${summary.occupant.name}`
                      : "Vacant"
                  }
                />
              </section>

              {isHrAdmin && requirements.length > 0 && (
                <section className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Award className="size-4 text-primary" />
                    Minimum skills
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {requirements.map((requirement) => (
                      <div
                        key={requirement.id}
                        className="rounded-lg border border-border bg-secondary/35 p-3"
                      >
                        <div className="text-sm font-medium">
                          {requirement.skill.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Minimum level {requirement.minimumProficiency}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {summary && summary.history.length > 0 && (
                <section className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <History className="size-4 text-foreground" />
                    Position history
                  </h3>
                  <div className="grid gap-3">
                    {summary.history.map((entry) => (
                      <article
                        key={entry.assignmentId}
                        className="grid grid-cols-[12px_1fr] gap-3"
                      >
                        <div className="mt-1.5 size-2 rounded-full bg-primary ring-4 ring-primary/15" />
                        <div className="rounded-lg border border-border bg-secondary/30 p-3">
                          <div className="font-medium">{entry.name}</div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {formatDate(entry.joinedDate)} —{" "}
                            {formatDate(entry.leftDate)}
                            {entry.reason ? ` · ${entry.reason}` : ""}
                          </div>
                          {entry.notes && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {entry.notes}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {!canSeeManagedData && (
                <p className="text-xs text-muted-foreground">
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
