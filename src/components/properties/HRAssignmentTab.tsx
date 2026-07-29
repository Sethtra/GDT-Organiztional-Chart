import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  History,
  Loader2,
  RefreshCw,
  Search,
  UserMinus,
  UserRoundCheck,
} from "lucide-react";

import {
  assignCandidate,
  ensurePositionForNode,
  loadAssignmentCandidates,
  loadAssignmentSummary,
  vacatePosition,
} from "../../services/positionAssignmentService";
import { evaluateStaffJobFit } from "../../services/jobArchitectureService";
import type { StaffJobFit } from "../../contracts/hr";
import type {
  AssignmentCandidate,
  AssignmentSummary,
  ChartPositionNode,
} from "../../services/positionAssignmentService";
import PositionHierarchyTab from "./PositionHierarchyTab";

interface HRAssignmentTabProps {
  chartId: string;
  node: ChartPositionNode;
  onNodeUpdate: (data: Record<string, unknown>) => void;
  onViewStaffProfile?: (staffId: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

function locationLabel(candidate: AssignmentCandidate): string {
  if (!candidate.currentPosition) return "Unassigned";
  return [
    candidate.currentPosition.departmentName,
    candidate.currentPosition.officeName,
    candidate.currentPosition.title,
  ].filter(Boolean).join(" → ");
}

export default function HRAssignmentTab({
  chartId,
  node,
  onNodeUpdate,
  onViewStaffProfile,
}: HRAssignmentTabProps) {
  const [positionId, setPositionId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<AssignmentCandidate[]>([]);
  const [summary, setSummary] = useState<AssignmentSummary | null>(null);
  const [fit, setFit] = useState<StaffJobFit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [office, setOffice] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [showVacate, setShowVacate] = useState(false);
  const [vacateReason, setVacateReason] =
    useState<"resigned" | "retired" | "suspended" | "vacated" | "corrected">(
      "vacated",
    );
  const nodeRef = useRef(node);
  nodeRef.current = node;
  const nodeId = node.id;

  const reload = async (knownPositionId: string) => {
    const [nextCandidates, nextSummary] = await Promise.all([
      loadAssignmentCandidates(knownPositionId),
      loadAssignmentSummary(knownPositionId),
    ]);
    setCandidates(nextCandidates);
    setSummary(nextSummary);
  };

  useEffect(() => {
    let cancelled = false;
    const selectedNode = nodeRef.current;
    setLoading(true);
    setError(null);
    setPositionId(null);
    setDepartment(
      typeof selectedNode.data?.department === "string"
        ? selectedNode.data.department
        : "",
    );
    setOffice(
      typeof selectedNode.data?.office === "string"
        ? selectedNode.data.office
        : "",
    );

    void ensurePositionForNode(chartId, selectedNode)
      .then(async (resolvedPositionId) => {
        if (cancelled) return;
        setPositionId(resolvedPositionId);
        await reload(resolvedPositionId);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load position assignments.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chartId, nodeId]);

  const departments = useMemo(
    () =>
      [...new Set(
        candidates
          .map((candidate) => candidate.currentPosition?.departmentName)
          .filter((value): value is string => Boolean(value)),
      )].sort(),
    [candidates],
  );

  const offices = useMemo(
    () =>
      [...new Set(
        candidates
          .filter(
            (candidate) =>
              !department ||
              candidate.currentPosition?.departmentName === department,
          )
          .map((candidate) => candidate.currentPosition?.officeName)
          .filter((value): value is string => Boolean(value)),
      )].sort(),
    [candidates, department],
  );

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return candidates.filter((candidate) => {
      if (
        department &&
        candidate.currentPosition?.departmentName !== department
      ) {
        return false;
      }
      if (office && candidate.currentPosition?.officeName !== office) {
        return false;
      }
      if (!query) return true;
      return [
        candidate.name,
        candidate.nameEn,
        candidate.employeeId,
        locationLabel(candidate),
      ].some((value) => value?.toLocaleLowerCase().includes(query));
    });
  }, [candidates, department, office, search]);

  const selectedCandidate = candidates.find(
    (candidate) => candidate.id === selectedStaffId,
  );

  useEffect(() => {
    let cancelled = false;
    setFit(null);
    if (!selectedCandidate || !summary?.jobTitleId) {
      return () => {
        cancelled = true;
      };
    }
    void evaluateStaffJobFit(
      selectedCandidate.id,
      summary.jobTitleId,
    ).then((result) => {
      if (!cancelled) setFit(result);
    }).catch((fitError) => {
      if (!cancelled) {
        setError(
          fitError instanceof Error
            ? fitError.message
            : "Unable to evaluate required skills.",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCandidate, summary?.jobTitleId]);

  const handleAssign = async () => {
    if (!positionId || !selectedCandidate || !effectiveDate) return;
    setSaving(true);
    setError(null);
    try {
      await assignCandidate(
        selectedCandidate,
        positionId,
        effectiveDate,
        notes.trim() || null,
      );
      await reload(positionId);
      const nextSummary = await loadAssignmentSummary(positionId);
      setSummary(nextSummary);
      onNodeUpdate({
        name: selectedCandidate.name,
        nameEn: selectedCandidate.nameEn ?? "",
        dbStaffId: selectedCandidate.id,
        dbAssignmentId: nextSummary.occupant?.assignmentId ?? null,
        positionId,
      });
      setSelectedStaffId("");
      setNotes("");
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : "Unable to assign this staff member.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleVacate = async () => {
    if (!positionId || !effectiveDate) return;
    setSaving(true);
    setError(null);
    try {
      await vacatePosition(
        positionId,
        effectiveDate,
        vacateReason,
        notes.trim() || null,
      );
      await reload(positionId);
      onNodeUpdate({
        name: "",
        nameEn: "",
        dbStaffId: null,
        dbAssignmentId: null,
        positionId,
      });
      setShowVacate(false);
      setNotes("");
    } catch (vacateError) {
      setError(
        vacateError instanceof Error
          ? vacateError.message
          : "Unable to vacate this position.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pp-section">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading assignment data…
        </div>
      </div>
    );
  }

  return (
    <>
    {positionId && (
      <PositionHierarchyTab
        positionId={positionId}
        onNodeUpdate={onNodeUpdate}
        onSaved={() => reload(positionId)}
      />
    )}
    <div className="pp-section">
      <div className="pp-section-label">
        <BriefcaseBusiness size={11} /> HR Assignment
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs leading-relaxed"
        >
          {error}
        </div>
      )}

      {summary?.occupant ? (
        <div className="rounded-md border border-border bg-secondary/50 p-3">
          <button
            type="button"
            className="flex items-center gap-2 text-left text-sm font-semibold hover:text-primary"
            onClick={() =>
              onViewStaffProfile?.(summary.occupant?.staffId ?? "")
            }
          >
            <UserRoundCheck className="size-4 text-primary" />
            {summary.occupant.name}
          </button>
          <div className="mt-1 text-xs text-muted-foreground">
            {summary.occupant.nameEn ||
              summary.occupant.employeeId ||
              "ID required"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Joined: {summary.occupant.joinedDate || "Not recorded"}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          This position is vacant.
        </div>
      )}

      {Boolean(node.data && ("name" in node.data) && node.data.name) &&
        !summary?.occupant && (
          <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            Legacy node occupant data is not a verified assignment. It has not
            been changed; select a staff record below after the protected
            cleanup is approved.
          </div>
        )}

      <label className="pp-label">Filter department</label>
      <select
        className="pp-input"
        value={department}
        onChange={(event) => {
          setDepartment(event.target.value);
          setOffice("");
        }}
      >
        <option value="">All departments / unassigned</option>
        {departments.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <label className="pp-label">Filter office</label>
      <select
        className="pp-input"
        value={office}
        onChange={(event) => setOffice(event.target.value)}
      >
        <option value="">All offices</option>
        {offices.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <label className="pp-label">Find staff</label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          className="pp-input !pl-8"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name or employee ID"
        />
      </div>

      <label className="pp-label">Staff member</label>
      <select
        className="pp-input"
        value={selectedStaffId}
        onChange={(event) => setSelectedStaffId(event.target.value)}
      >
        <option value="">Select from HR directory…</option>
        {filteredCandidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name} · {candidate.employeeId ?? "ID required"} ·{" "}
            {locationLabel(candidate)}
          </option>
        ))}
      </select>

      {selectedCandidate?.currentPosition &&
        selectedCandidate.currentPosition.positionId !== positionId && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed">
            Assigning this person will transfer them from{" "}
            {locationLabel(selectedCandidate)}. Their previous assignment will
            remain in history.
          </div>
        )}

      {fit && (
        <div
          className={`rounded-md border p-3 text-xs ${
            fit.isFit
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-amber-500/40 bg-amber-500/10"
          }`}
        >
          <div className="font-semibold">
            {fit.isFit
              ? "Required skills are met"
              : "Skill gaps require HR review"}
          </div>
          {fit.requirements.map((requirement) => (
            <div key={requirement.skillId} className="mt-1">
              {requirement.skillName}: level{" "}
              {requirement.currentProficiency ?? "missing"} / required{" "}
              {requirement.minimumProficiency} · {requirement.status}
            </div>
          ))}
        </div>
      )}

      <label className="pp-label">Effective date</label>
      <input
        type="date"
        className="pp-input"
        value={effectiveDate}
        onChange={(event) => setEffectiveDate(event.target.value)}
      />

      <label className="pp-label">Reason / notes</label>
      <textarea
        className="pp-textarea"
        rows={2}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Optional context"
      />

      <button
        type="button"
        className="pp-btn pp-btn--add"
        disabled={!selectedCandidate || saving}
        onClick={() => void handleAssign()}
      >
        {saving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <UserRoundCheck size={14} />
        )}
        {selectedCandidate?.currentPosition ? "Transfer to position" : "Assign to position"}
      </button>

      {summary?.occupant && (
        <>
          <button
            type="button"
            className="pp-btn pp-btn--delete-ghost"
            onClick={() => setShowVacate((current) => !current)}
          >
            <UserMinus size={14} />
            Vacate position
          </button>
          {showVacate && (
            <div className="grid gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <label className="pp-label">Departure reason</label>
              <select
                className="pp-input"
                value={vacateReason}
                onChange={(event) =>
                  setVacateReason(
                    event.target.value as typeof vacateReason,
                  )
                }
              >
                <option value="vacated">Vacated</option>
                <option value="resigned">Resigned</option>
                <option value="retired">Retired</option>
                <option value="suspended">Suspended</option>
                <option value="corrected">Corrected record</option>
              </select>
              <button
                type="button"
                className="pp-btn pp-btn--delete"
                disabled={saving}
                onClick={() => void handleVacate()}
              >
                Confirm vacancy
              </button>
            </div>
          )}
        </>
      )}

      {summary && summary.history.length > 0 && (
        <div className="grid gap-2 border-t border-border pt-3">
          <div className="pp-section-label">
            <History size={11} /> Position history
          </div>
          {summary.history.map((entry) => (
            <div
              key={entry.assignmentId}
              className="rounded-md border border-border bg-secondary/30 p-2 text-xs"
            >
              <button
                type="button"
                className="font-semibold hover:text-primary"
                onClick={() => onViewStaffProfile?.(entry.staffId)}
              >
                {entry.name}
              </button>
              <div className="mt-1 text-muted-foreground">
                {entry.joinedDate || "Unknown"} → {entry.leftDate} ·{" "}
                {entry.reason || "No reason recorded"}
              </div>
              {entry.notes && (
                <div className="mt-1 text-muted-foreground">{entry.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="pp-btn pp-btn--ghost"
        disabled={!positionId || saving}
        onClick={() => positionId && void reload(positionId)}
      >
        <RefreshCw size={13} />
        Refresh assignment
      </button>
    </div>
    </>
  );
}
