import { useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  History,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  UserMinus,
  UserRoundCheck,
} from "lucide-react";

import { useOrgStructure } from "../../hooks/useOrgStructure";
import {
  assignCandidate,
  ensurePositionForNode,
  filterAssignmentCandidates,
  loadAssignmentCandidates,
  loadAssignmentSummary,
  vacatePosition,
} from "../../services/positionAssignmentService";
import type {
  AssignmentCandidate,
  AssignmentSummary,
  ChartPositionNode,
} from "../../services/positionAssignmentService";
import { POSITION_OPTIONS } from "../../data/nodeTypes";

interface HRAssignmentTabProps {
  chartId: string;
  node: ChartPositionNode;
  onNodeUpdate: (data: Record<string, unknown>) => void;
  onViewStaffProfile?: (staffId: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function HRAssignmentTab({
  chartId,
  node,
  onNodeUpdate,
  onViewStaffProfile,
}: HRAssignmentTabProps) {
  const { units } = useOrgStructure();

  const [positionId, setPositionId] = useState<string | null>(null);
  const [allStaff, setAllStaff] = useState<AssignmentCandidate[]>([]);
  const [summary, setSummary] = useState<AssignmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Department, Office, Search, and Node Position state
  const initialPosition =
    typeof node.data?.position === "string" && node.data.position.trim()
      ? node.data.position.trim()
      : typeof node.data?.badgeText === "string" && node.data.badgeText.trim()
        ? node.data.badgeText.trim()
        : "";

  const [nodePosition, setNodePosition] = useState(initialPosition);
  const [departmentId, setDepartmentId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");

  // Sync internal state when selecting a different node
  useEffect(() => {
    const pos =
      typeof node.data?.position === "string" && node.data.position.trim()
        ? node.data.position.trim()
        : typeof node.data?.badgeText === "string" && node.data.badgeText.trim()
          ? node.data.badgeText.trim()
          : "";
    setNodePosition(pos);
    setDepartmentId("");
    setOfficeId("");
    setSearchQuery("");
    setSelectedStaffId("");
  }, [node.id, node.data?.position, node.data?.badgeText]);

  const departments = useMemo(
    () => units.filter((unit) => unit.type === "department"),
    [units],
  );
  const offices = useMemo(
    () =>
      departments.find((unit) => unit.id === departmentId)?.offices ?? [],
    [departmentId, departments],
  );

  // ── Vacate form state ──────────────────────────────────────────
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

  // ── Load position + assignment-safe staff candidates ──────────
  const reload = async (knownPositionId: string) => {
    const nextSummary = await loadAssignmentSummary(knownPositionId);
    setSummary(nextSummary);
  };

  useEffect(() => {
    let cancelled = false;
    const selectedNode = nodeRef.current;
    setLoading(true);
    setError(null);
    setPositionId(null);
    setSelectedStaffId("");

    void ensurePositionForNode(chartId, {
      ...selectedNode,
      data: {
        ...(selectedNode.data ?? {}),
        position: nodePosition,
        badgeText: nodePosition,
      },
    })
      .then(async (resolvedPositionId) => {
        const [staff, nextSummary] = await Promise.all([
          loadAssignmentCandidates(resolvedPositionId),
          loadAssignmentSummary(resolvedPositionId),
        ]);
        if (cancelled) return;
        setPositionId(resolvedPositionId);
        setAllStaff(staff);
        setSummary(nextSummary);
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
  }, [chartId, nodeId, nodePosition]);

  const filteredStaff = useMemo(() => {
    return filterAssignmentCandidates(allStaff, {
      positionName: nodePosition,
      departmentId,
      officeId,
      query: searchQuery,
    });
  }, [
    allStaff,
    nodePosition,
    departmentId,
    officeId,
    searchQuery,
  ]);

  const selectedStaff = allStaff.find((s) => s.id === selectedStaffId);

  // Position change handler (sets fixed position on node)
  const handlePositionChange = (newPos: string) => {
    setNodePosition(newPos);
    setSelectedStaffId("");
    onNodeUpdate({ position: newPos, badgeText: newPos });
  };

  const handleDepartmentChange = (newDept: string) => {
    setDepartmentId(newDept);
    setOfficeId("");
    setSelectedStaffId("");
  };

  const handleOfficeChange = (newOffice: string) => {
    setOfficeId(newOffice);
    setSelectedStaffId("");
  };

  // ── Assign ─────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!positionId || !selectedStaff || !effectiveDate) return;
    setSaving(true);
    setError(null);
    try {
      await assignCandidate(
        selectedStaff,
        positionId,
        effectiveDate,
        notes.trim() || null,
      );
      const nextSummary = await loadAssignmentSummary(positionId);
      setSummary(nextSummary);
      // NOTE: We do NOT overwrite the fixed nodePosition/badgeText!
      onNodeUpdate({
        name: selectedStaff.name,
        nameEn: selectedStaff.nameEn ?? "",
        dbStaffId: selectedStaff.id,
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

  // ── Vacate ─────────────────────────────────────────────────────
  const handleVacate = async () => {
    if (!positionId || !effectiveDate) return;
    setSaving(true);
    setError(null);
    try {
      await vacatePosition(positionId, effectiveDate, vacateReason, notes.trim() || null);
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
      console.error("Vacate RPC error:", vacateError);
      const errMsg =
        vacateError && typeof vacateError === "object" && "message" in vacateError
          ? String((vacateError as { message: unknown }).message)
          : "Unable to record vacancy in database.";

      // Clear local node occupant state so user is never trapped
      onNodeUpdate({
        name: "",
        nameEn: "",
        dbStaffId: null,
        dbAssignmentId: null,
        positionId,
      });
      setShowVacate(false);
      setError(`Notice: Vacated node locally (${errMsg})`);
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
    <div className="pp-section">
      <div className="pp-section-label">
        <BriefcaseBusiness size={11} /> HR Assignment & Position
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs leading-relaxed"
        >
          {error}
        </div>
      )}

      {/* ── Current occupant card ─────────────────────────── */}
      {summary?.occupant ? (
        <div className="rounded-md border border-border bg-secondary/50 p-3">
          <button
            type="button"
            className="flex items-center gap-2 text-left text-sm font-semibold hover:text-primary"
            onClick={() => onViewStaffProfile?.(summary.occupant?.staffId ?? "")}
          >
            <UserRoundCheck className="size-4 text-primary" />
            {summary.occupant.name}
          </button>
          <div className="mt-1 text-xs text-muted-foreground">
            {summary.occupant.nameEn || summary.occupant.employeeId || "ID required"}
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

      {/* ── Unified Position, Department, Office & Search Section ───── */}
      <div className="grid gap-3 rounded-md border border-border bg-secondary/20 p-3">
        {/* Node Fixed Position Dropdown */}
        <div className="grid gap-1">
          <label className="pp-label flex items-center gap-1">
            <Tag size={11} /> Fixed Node Position / តួនាទី
          </label>
          <select
            className="pp-input"
            value={nodePosition}
            onChange={(e) => handlePositionChange(e.target.value)}
          >
            <option value="">-- ជ្រើសរើសតួនាទី / Select Position --</option>
            {POSITION_OPTIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
            {nodePosition && !POSITION_OPTIONS.includes(nodePosition) && (
              <option value={nodePosition}>{nodePosition}</option>
            )}
          </select>
        </div>

        {/* Department Filter */}
        <div className="grid gap-1">
          <label className="pp-label flex items-center gap-1">
            <Building2 size={11} /> Officer Department Filter
          </label>
          <select
            className="pp-input"
            value={departmentId}
            onChange={(e) => handleDepartmentChange(e.target.value)}
          >
            <option value="">All Departments…</option>
            {departments.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>

        {/* Office Filter */}
        <div className="grid gap-1">
          <label
            className="pp-label flex items-center gap-1"
            style={{ opacity: departmentId ? 1 : 0.45 }}
          >
            <ChevronRight size={11} /> Office Filter
          </label>
          <select
            className="pp-input"
            value={officeId}
            disabled={!departmentId}
            style={{ opacity: departmentId ? 1 : 0.45 }}
            onChange={(e) => handleOfficeChange(e.target.value)}
          >
            <option value="">
              {!departmentId ? "Select department first…" : "All offices"}
            </option>
            {offices.map((off) => (
              <option key={off.id} value={off.id}>
                {off.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input for Fast Officer Finding */}
        {!summary?.occupant && (
          <div className="grid gap-1 border-t border-border/50 pt-2">
            <label className="pp-label flex items-center gap-1">
              <Search size={11} /> Search Officer
            </label>
            <div className="relative">
              <input
                className="pp-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type name or employee ID…"
              />
            </div>
          </div>
        )}

        {/* Officer Selector (Only enabled when position is vacant) */}
        {!summary?.occupant ? (
          <div className="grid gap-1 border-t border-border/50 pt-2">
            <div className="flex items-center justify-between">
              <label className="pp-label">Select Officer ({filteredStaff.length})</label>
            </div>
            <select
              className="pp-input"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">
                {!nodePosition
                  ? "Select node position above first…"
                  : filteredStaff.length === 0
                    ? `No ${nodePosition} officers found`
                    : `Choose ${nodePosition} officer…`}
              </option>
              {filteredStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.employeeId ? ` · ID: ${s.employeeId}` : ""}
                  {s.jobTitle ? ` · ${s.jobTitle.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="border-t border-border/50 pt-2 text-xs text-amber-500/90 leading-relaxed font-medium">
            ⚠ Position is currently occupied. Vacate this position below before assigning a new officer.
          </div>
        )}

        {/* Officer preview card */}
        {!summary?.occupant && selectedStaff && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="text-sm font-semibold">{selectedStaff.name}</div>
            {selectedStaff.nameEn && (
              <div className="text-xs text-muted-foreground">{selectedStaff.nameEn}</div>
            )}
            {selectedStaff.employeeId && (
              <div className="mt-1 text-xs text-muted-foreground">
                ID: {selectedStaff.employeeId}
              </div>
            )}
            {selectedStaff.jobTitle && (
              <div className="mt-1 text-xs text-muted-foreground">
                Title: {selectedStaff.jobTitle.name}
              </div>
            )}
            {selectedStaff.currentPosition && (
              <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs leading-relaxed">
                ⚠ Currently assigned to{" "}
                <span className="font-medium">
                  {[
                    selectedStaff.currentPosition.departmentName,
                    selectedStaff.currentPosition.officeName,
                    selectedStaff.currentPosition.title,
                  ]
                    .filter(Boolean)
                    .join(" → ")}
                </span>
                . Assigning will transfer them and keep history.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Date + notes + assign button (only when position is vacant) ──────── */}
      {!summary?.occupant && (
        <>
          <label className="pp-label">Effective date</label>
          <input
            type="date"
            className="pp-input"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />

          <label className="pp-label">Reason / notes</label>
          <textarea
            className="pp-textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional context"
          />

          <button
            type="button"
            className="pp-btn pp-btn--add"
            disabled={!selectedStaff || saving}
            onClick={() => void handleAssign()}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserRoundCheck size={14} />
            )}
            {selectedStaff?.currentPosition
              ? "Transfer to position"
              : "Assign to position"}
          </button>
        </>
      )}

      {/* ── Vacate ───────────────────────────────────────── */}
      {summary?.occupant && (
        <>
          <button
            type="button"
            className="pp-btn pp-btn--delete-ghost"
            onClick={() => setShowVacate((v) => !v)}
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
                onChange={(e) =>
                  setVacateReason(e.target.value as typeof vacateReason)
                }
              >
                <option value="vacated">Vacated</option>
                <option value="resigned">Resigned</option>
                <option value="retired">Retired</option>
                <option value="suspended">Suspended</option>
                <option value="corrected">Corrected record</option>
              </select>

              <label className="pp-label">Departure date</label>
              <input
                type="date"
                className="pp-input"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />

              <label className="pp-label">Description / notes</label>
              <textarea
                className="pp-textarea"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Description or context for vacating position…"
              />

              <button
                type="button"
                className="pp-btn pp-btn--delete"
                disabled={saving}
                onClick={() => void handleVacate()}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Confirm vacancy
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Position history ──────────────────────────────── */}
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
  );
}
