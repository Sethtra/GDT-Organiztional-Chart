import { useEffect, useMemo, useState } from "react";
import { GitBranch, Loader2, Save } from "lucide-react";

import { useOrgStructure } from "../../hooks/useOrgStructure";
import {
  filterSupervisorPositions,
  loadPositionConfiguration,
  savePositionConfiguration,
} from "../../services/positionConfigurationService";
import type { PositionConfigurationContext } from "../../services/positionConfigurationService";

interface PositionHierarchyTabProps {
  positionId: string;
  onNodeUpdate: (data: Record<string, unknown>) => void;
  onSaved?: () => void | Promise<void>;
}

export default function PositionHierarchyTab({
  positionId,
  onNodeUpdate,
  onSaved,
}: PositionHierarchyTabProps) {
  const { units } = useOrgStructure();
  const [context, setContext] =
    useState<PositionConfigurationContext | null>(null);
  const [jobTitleId, setJobTitleId] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [reportsToId, setReportsToId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadPositionConfiguration(positionId)
      .then((nextContext) => {
        if (cancelled) return;
        setContext(nextContext);
        setJobTitleId(nextContext.jobTitleId ?? "");
        setOrgUnitId(nextContext.orgUnitId ?? "");
        setOfficeId(nextContext.officeId ?? "");
        setReportsToId(nextContext.reportsToPositionId ?? "");
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load reporting hierarchy.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [positionId]);

  const offices = useMemo(
    () =>
      units.find((unit) => unit.id === orgUnitId)?.offices ?? [],
    [orgUnitId, units],
  );

  const supervisors = useMemo(
    () =>
      context
        ? filterSupervisorPositions(
            context,
            jobTitleId || null,
            orgUnitId || null,
            officeId || null,
          )
        : [],
    [context, jobTitleId, officeId, orgUnitId],
  );

  const handleSave = async () => {
    if (!context) return;
    setSaving(true);
    setError(null);
    try {
      await savePositionConfiguration({
        positionId,
        jobTitleId: jobTitleId || null,
        orgUnitId: orgUnitId || null,
        officeId: officeId || null,
        reportsToPositionId: reportsToId || null,
      });
      const title = context.jobTitles.find(
        (candidate) => candidate.id === jobTitleId,
      );
      const unit = units.find((candidate) => candidate.id === orgUnitId);
      const office = offices.find(
        (candidate: { id: string }) => candidate.id === officeId,
      );
      onNodeUpdate({
        positionId,
        jobTitleId: jobTitleId || null,
        orgUnitId: orgUnitId || null,
        officeId: officeId || null,
        reportsToPositionId: reportsToId || null,
        position: title?.name ?? "",
        badgeText: title?.name ?? "",
        department: unit?.name ?? "",
        office: office?.name ?? "",
      });
      setContext(await loadPositionConfiguration(positionId));
      await onSaved?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save reporting hierarchy.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pp-section">
      <div className="pp-section-label">
        <GitBranch size={11} /> Department → Office → Reporting Position
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs leading-relaxed"
        >
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading hierarchy…
        </div>
      ) : context ? (
        <>
          <label className="pp-label">Reusable job title</label>
          <select
            className="pp-input"
            value={jobTitleId}
            onChange={(event) => {
              setJobTitleId(event.target.value);
              setReportsToId("");
            }}
          >
            <option value="">Select job title…</option>
            {context.jobTitles.map((title) => (
              <option key={title.id} value={title.id}>
                {title.name} · {title.positionScope} · rank {title.rankOrder}
              </option>
            ))}
          </select>

          <label className="pp-label">Department</label>
          <select
            className="pp-input"
            value={orgUnitId}
            onChange={(event) => {
              setOrgUnitId(event.target.value);
              setOfficeId("");
              setReportsToId("");
            }}
          >
            <option value="">Select department…</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>

          <label className="pp-label">Office</label>
          <select
            className="pp-input"
            value={officeId}
            disabled={!orgUnitId}
            onChange={(event) => {
              setOfficeId(event.target.value);
              setReportsToId("");
            }}
          >
            <option value="">No office / select office…</option>
            {offices.map((office: { id: string; name: string }) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </select>

          <label className="pp-label">Reporting position</label>
          <select
            className="pp-input"
            value={reportsToId}
            onChange={(event) => setReportsToId(event.target.value)}
          >
            <option value="">Top-level / no reporting position</option>
            {supervisors.map((supervisor) => (
              <option
                key={supervisor.positionId}
                value={supervisor.positionId}
              >
                {supervisor.departmentName || "No department"} →{" "}
                {supervisor.officeName || "No office"} → {supervisor.title} ·{" "}
                {supervisor.occupantName || "Vacant"}
              </option>
            ))}
          </select>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Reporting is bound to the supervisor position. If its occupant
            changes, the reporting hierarchy remains valid.
          </p>

          <button
            type="button"
            className="pp-btn pp-btn--save"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save size={13} />
            )}
            Save hierarchy
          </button>
        </>
      ) : null}
    </div>
  );
}
