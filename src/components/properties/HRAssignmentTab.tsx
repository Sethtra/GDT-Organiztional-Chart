import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  History,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  User,
  UserMinus,
  UserRoundCheck,
} from "lucide-react";

import { useHrAdmin } from "../../hooks/useHrAdmin";
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
import {
  loadPositionConfiguration,
  savePositionConfiguration,
} from "../../services/positionConfigurationService";
import type { PositionConfigurationContext } from "../../services/positionConfigurationService";
import { listJobArchitecture } from "../../services/jobArchitectureService";
import type { JobTitle } from "../../contracts/hr";

interface HRAssignmentTabProps {
  chartId: string;
  node: ChartPositionNode;
  onNodeUpdate: (data: Record<string, unknown>) => void;
  onViewStaffProfile?: (staffId: string) => void;
}

function StaffCombobox({
  staffList,
  selectedId,
  onSelect,
  placeholder,
  disabled,
}: {
  staffList: AssignmentCandidate[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedStaff = useMemo(
    () => staffList.find((s) => s.id === selectedId),
    [staffList, selectedId]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return staffList;
    const q = search.toLowerCase();
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
        (s.employeeId && s.employeeId.toLowerCase().includes(q))
    );
  }, [staffList, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-800/40 border-white/10"
            : isOpen
              ? "border-emerald-500/60 bg-slate-800/90 ring-2 ring-emerald-500/20 shadow-md"
              : "border-white/15 bg-slate-850/80 hover:border-emerald-500/40 hover:bg-slate-800/70"
        }`}
      >
        {selectedStaff ? (
          <div className="flex items-center gap-2 truncate min-w-0">
            <span className="font-semibold text-white truncate">{selectedStaff.name}</span>
            {selectedStaff.employeeId && (
              <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 flex-shrink-0">
                ID: {selectedStaff.employeeId}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 truncate">{placeholder}</span>
        )}
        <ChevronDown className={`size-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180 text-emerald-400" : ""}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-hidden rounded-xl border border-white/15 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search officer by name or ID…"
              className="w-full rounded-lg border border-white/10 bg-slate-800/90 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching officers found
              </div>
            ) : (
              filtered.map((s) => {
                const isSelected = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelect(s.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-all ${
                      isSelected
                        ? "bg-emerald-600/30 border border-emerald-500/50 text-white font-semibold"
                        : "hover:bg-slate-800/80 hover:text-white text-slate-200"
                    }`}
                  >
                    {/* Left: Officer Khmer & English Name */}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white leading-tight truncate">{s.name}</div>
                      {s.nameEn && (
                        <div className="text-[10px] font-medium text-slate-400 uppercase mt-0.5 truncate">
                          {s.nameEn}
                        </div>
                      )}
                    </div>

                    {/* Right: Badges (Position & ID stacked) */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {s.jobTitle && (
                        <span className="text-[10px] bg-emerald-500/15 px-2 py-0.5 rounded-md text-emerald-300 border border-emerald-500/30 font-medium">
                          {s.jobTitle.name}
                        </span>
                      )}
                      {s.employeeId && (
                        <span className="text-[9.5px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                          ID: {s.employeeId}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export default function HRAssignmentTab({
  chartId,
  node,
  onNodeUpdate,
  onViewStaffProfile,
}: HRAssignmentTabProps) {
  const { units } = useOrgStructure();
  const { isHrAdmin } = useHrAdmin();

  const [positionId, setPositionId] = useState<string | null>(null);
  const [allStaff, setAllStaff] = useState<AssignmentCandidate[]>([]);
  const [summary, setSummary] = useState<AssignmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real job-title identity for this position (replaces the old
  // free-text "Fixed Node Position" string so candidate matching and
  // minimum-skill lookups are ID-based, not fragile name comparisons).
  const [positionConfig, setPositionConfig] =
    useState<PositionConfigurationContext | null>(null);
  const [jobTitleId, setJobTitleId] = useState<string>(
    typeof node.data?.jobTitleId === "string" ? node.data.jobTitleId : "",
  );
  const [jobArchitecture, setJobArchitecture] = useState<JobTitle[]>([]);

  const [departmentId, setDepartmentId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");

  // Sync internal state when selecting a different node
  useEffect(() => {
    setJobTitleId(
      typeof node.data?.jobTitleId === "string" ? node.data.jobTitleId : "",
    );
    setDepartmentId("");
    setOfficeId("");
    setSearchQuery("");
    setSelectedStaffId("");
  }, [node.id, node.data?.jobTitleId]);

  // HR admins manage the minimum-skill catalog; other chart editors can
  // still assign staff, they just don't see the requirements list (the
  // underlying RPC is HR-only).
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

  // Read inside the position-load effect below instead of adding
  // onNodeUpdate to its dependency array — the effect's deps stay narrowly
  // [chartId, nodeId] on purpose (it does real network calls), and the
  // parent doesn't guarantee a stable onNodeUpdate reference across renders.
  const onNodeUpdateRef = useRef(onNodeUpdate);
  onNodeUpdateRef.current = onNodeUpdate;

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

    void ensurePositionForNode(chartId, selectedNode)
      .then(async (resolvedPositionId) => {
        const [staff, nextSummary, nextConfig] = await Promise.all([
          loadAssignmentCandidates(resolvedPositionId),
          loadAssignmentSummary(resolvedPositionId),
          loadPositionConfiguration(resolvedPositionId),
        ]);
        if (cancelled) return;
        setPositionId(resolvedPositionId);
        setAllStaff(staff);
        setSummary(nextSummary);
        setPositionConfig(nextConfig);
        setJobTitleId(nextConfig.jobTitleId ?? "");

        // The node's badgeText/position are denormalized display copies
        // that only handleJobTitleChange keeps in sync going forward. If a
        // position's job title was set some other way (import, an older
        // build), the node can be stuck showing its generic type label
        // forever even though the real assignment is correct. Self-heal
        // that mismatch here whenever the loaded title disagrees with what
        // the node currently displays.
        const resolvedTitleName =
          nextConfig.jobTitles.find(
            (title) => title.id === nextConfig.jobTitleId,
          )?.name ?? "";
        const currentBadgeText =
          typeof selectedNode.data?.badgeText === "string"
            ? selectedNode.data.badgeText
            : "";
        const currentPosition =
          typeof selectedNode.data?.position === "string"
            ? selectedNode.data.position
            : "";
        if (
          resolvedTitleName &&
          (currentBadgeText !== resolvedTitleName ||
            currentPosition !== resolvedTitleName)
        ) {
          onNodeUpdateRef.current({
            jobTitleId: nextConfig.jobTitleId ?? null,
            position: resolvedTitleName,
            badgeText: resolvedTitleName,
          });
        }
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

  const selectedJobTitle = useMemo(
    () =>
      positionConfig?.jobTitles.find((title) => title.id === jobTitleId) ??
      null,
    [positionConfig, jobTitleId],
  );

  const selectedJobTitleRequirements = useMemo(
    () =>
      jobArchitecture.find((title) => title.id === jobTitleId)
        ?.requirements ?? [],
    [jobArchitecture, jobTitleId],
  );

  const filteredStaff = useMemo(() => {
    return filterAssignmentCandidates(allStaff, {
      jobTitleId,
      departmentId,
      officeId,
      query: searchQuery,
    });
  }, [
    allStaff,
    jobTitleId,
    departmentId,
    officeId,
    searchQuery,
  ]);

  const selectedStaff = allStaff.find((s) => s.id === selectedStaffId);

  // Job title change handler — persists to the real position row via
  // configure_chart_position, then updates the node's display badge.
  const handleJobTitleChange = async (newJobTitleId: string) => {
    if (!positionId) return;
    setJobTitleId(newJobTitleId);
    setSelectedStaffId("");
    const title =
      positionConfig?.jobTitles.find((t) => t.id === newJobTitleId) ?? null;
    try {
      await savePositionConfiguration({
        positionId,
        jobTitleId: newJobTitleId || null,
        orgUnitId: positionConfig?.orgUnitId ?? null,
        officeId: positionConfig?.officeId ?? null,
        reportsToPositionId: positionConfig?.reportsToPositionId ?? null,
      });
      setPositionConfig((prev) =>
        prev ? { ...prev, jobTitleId: newJobTitleId || null } : prev,
      );
      onNodeUpdate({
        jobTitleId: newJobTitleId || null,
        position: title?.name ?? "",
        badgeText: title?.name ?? "",
        positionId,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save position.",
      );
    }
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
      // NOTE: We do NOT overwrite the position/badgeText here — job title
      // changes go through handleJobTitleChange, not the assign flow.
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
        <div
          className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-850 p-3.5 shadow-md transition-all duration-200 hover:border-emerald-500/40 hover:bg-slate-800/90 cursor-pointer"
          onClick={() => onViewStaffProfile?.(summary.occupant?.staffId ?? "")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Avatar circle */}
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-700/80 text-white font-bold text-xs shadow-inner border border-emerald-400/30">
                {summary.occupant.nameEn
                  ? summary.occupant.nameEn.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
                  : <User className="size-4 text-emerald-200" />}
              </div>

              {/* Names */}
              <div>
                <div className="text-sm font-bold text-white leading-snug group-hover:text-emerald-300 transition-colors">
                  {summary.occupant.name}
                </div>
                {summary.occupant.nameEn && (
                  <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase mt-0.5">
                    {summary.occupant.nameEn}
                  </div>
                )}
              </div>
            </div>

            {/* View profile hint button */}
            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all flex-shrink-0">
              Profile <ExternalLink className="size-3" />
            </div>
          </div>

          {/* Details metadata row */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2.5 text-[11px]">
            {summary.occupant.employeeId && (
              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-slate-300 border border-white/10">
                ID: <strong className="text-white font-semibold">{summary.occupant.employeeId}</strong>
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-slate-400 border border-white/10">
              <Calendar className="size-3 text-emerald-400" />
              Joined: <span className="text-slate-200">{summary.occupant.joinedDate || "Not recorded"}</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          This position is vacant.
        </div>
      )}

      {/* ── Unified Position, Department, Office & Search Section ───── */}
      <div className="grid gap-3 rounded-md border border-border bg-secondary/20 p-3">
        {/* Node Position Dropdown — real job title, not a fixed string list */}
        <div className="grid gap-1">
          <label className="pp-label flex items-center gap-1">
            <Tag size={11} /> Position / តួនាទី
          </label>
          <select
            className="pp-input"
            value={jobTitleId}
            disabled={!positionConfig}
            onChange={(e) => void handleJobTitleChange(e.target.value)}
          >
            <option value="">-- ជ្រើសរើសតួនាទី / Select Position --</option>
            {positionConfig?.jobTitles.map((title) => (
              <option key={title.id} value={title.id}>
                {title.name}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum skills for the selected position — read-only, HR-managed
            in Job Architecture. Hidden entirely for non-HR editors (the
            underlying data is HR-only). Always visible once HR admin +
            job title are both set, even with zero requirements, so "no
            skills configured yet" is never indistinguishable from broken. */}
        {isHrAdmin && selectedJobTitle && (
          <div className="grid gap-1.5 border-t border-border/50 pt-2">
            <span className="pp-label flex items-center gap-1">
              <Award size={11} /> Minimum skills · {selectedJobTitle.name}
            </span>
            {selectedJobTitleRequirements.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No minimum skills set for this position yet. Add them in{" "}
                <Link
                  to="/admin/job-architecture"
                  className="font-medium text-primary hover:underline"
                >
                  Job Architecture
                </Link>
                .
              </p>
            ) : (
              <div className="grid gap-1">
                {selectedJobTitleRequirements.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-2.5 py-1.5 text-xs"
                  >
                    <span>{requirement.skill.name}</span>
                    <span className="text-muted-foreground">
                      Min. level {requirement.minimumProficiency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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



        {/* Officer Selector (Only enabled when position is vacant) */}
        {!summary?.occupant ? (
          <div className="grid gap-1 border-t border-border/50 pt-2">
            <div className="flex items-center justify-between">
              <label className="pp-label">Select Officer ({filteredStaff.length})</label>
            </div>
            <StaffCombobox
              staffList={filteredStaff}
              selectedId={selectedStaffId}
              onSelect={(id) => setSelectedStaffId(id)}
              disabled={!jobTitleId || filteredStaff.length === 0}
              placeholder={
                !jobTitleId
                  ? "Select node position above first…"
                  : filteredStaff.length === 0
                    ? `No ${selectedJobTitle?.name ?? ""} officers found`
                    : `Choose ${selectedJobTitle?.name ?? ""} officer…`
              }
            />
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
