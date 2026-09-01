import { useEffect, useRef, useState } from "react";
import {
  Ban,
  BringToFront,
  Check,
  ChevronDown,
  Contact,
  Copy,
  Layers,
  Palette,
  Plus,
  SendToBack,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";

import { HR_FEATURES_ENABLED } from "../../config/hrFeatures";
import { useOwnedChartOptions } from "../../hooks/useChartLinks";
import {
  POSITION_OPTIONS,
  TYPE_META,
  TYPE_OPTIONS,
} from "../../data/nodeTypes";
import ColorPresetPicker from "./ColorPresetPicker";
import ChartLinkSection from "./ChartLinkSection";
import HRAssignmentTab from "./HRAssignmentTab";
import {
  DepartmentSelect,
  OfficeSelect,
} from "./OrganizationSelectors";

const COLOR_PRESETS = [
  { label: "Navy",    value: "#0f2044" },
  // Was "#136232" — byte-identical to "Green" below, which made this swatch
  // a silent duplicate (same colour, same click result) and gave React two
  // <button key="#136232"> siblings. Never caught because this panel had
  // never been exercised in a browser before this route existed.
  { label: "Teal",   value: "#0d9488" },
  { label: "Blue",   value: "var(--default-node-bg)" },
  { label: "Sky",    value: "#0369a1" },
  { label: "Purple", value: "#6d28d9" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Amber",  value: "#b45309" },
  { label: "Orange", value: "#c2410c" },
  { label: "Red",    value: "#b91c1c" },
  { label: "Green",  value: "#136232" },
  { label: "Pink",   value: "#be185d" },
  { label: "Slate",  value: "#334155" },
];

// ── Node type mini-preview (used in type strip and child picker) ──────────────
function NodeTypePreview({ type }) {
  const typeMeta = TYPE_META[type] || TYPE_META.orgNode;
  const shape = typeMeta.shape || "org";

  return (
    <>
      <span className={`pp-node-type-preview pp-node-type-preview--${shape}`} aria-hidden="true">
        <span />
      </span>
      <span className="pp-node-type-label">{typeMeta.label || type}</span>
    </>
  );
}

// ── Collapsible accordion section ─────────────────────────────────────────────
function AccordionSection({ title, icon, sectionKey, open, onToggle, children }) {
  return (
    <div className="pp-accordion">
      <button
        type="button"
        className="pp-accordion-header"
        onClick={() => onToggle(sectionKey)}
        aria-expanded={open}
      >
        <span className="pp-accordion-title">
          {icon}
          {title}
        </span>
        <ChevronDown
          size={12}
          className={`pp-accordion-chevron${open ? " pp-accordion-chevron--open" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="pp-accordion-body">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Text alignment SVG icons ──────────────────────────────────────────────────
const ALIGN_H = [
  { v: "left",   label: "Left",   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg> },
  { v: "center", label: "Center", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg> },
  { v: "right",  label: "Right",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg> },
];

const ALIGN_V = [
  { v: "flex-start", label: "Top",    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="3" x2="21" y2="3"/><line x1="9" y1="7" x2="9" y2="21"/><line x1="15" y1="7" x2="15" y2="21"/><line x1="9" y1="7" x2="15" y2="7"/></svg> },
  { v: "center",     label: "Middle", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/><line x1="9" y1="4" x2="15" y2="4"/><line x1="9" y1="20" x2="15" y2="20"/></svg> },
  { v: "flex-end",   label: "Bottom", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="21" x2="21" y2="21"/><line x1="9" y1="3" x2="9" y2="17"/><line x1="15" y1="3" x2="15" y2="17"/><line x1="9" y1="17" x2="15" y2="17"/></svg> },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function NodePropertiesPanel({
  chartId,
  nodes,
  onUpdateNodes,
  onChangeLayer,
  onDelete,
  onAddChild,
  onDuplicate,
  onClose,
  onSave,
  onViewStaffProfile,
}) {
  const charts = useOwnedChartOptions();
  const firstNode = nodes && nodes.length > 0 ? nodes[0] : { data: {} };
  const firstMeta = TYPE_META[firstNode.data.orgType] || TYPE_META.orgNode;

  // ── Field state ─────────────────────────────────────────────────────────────
  const [name, setName]               = useState(firstNode.data.name || "");
  const [nameEn, setNameEn]           = useState(firstNode.data.nameEn || "");
  const [description, setDescription] = useState(firstNode.data.description || "");
  const [orgType, setOrgType]         = useState(firstNode.data.orgType || "orgNode");
  const [color, setColor]             = useState(firstNode.data.color || (firstMeta.template === "shape" ? "transparent" : "var(--default-node-bg)"));
  const [textColor, setTextColor]     = useState(firstNode.data.textColor || (firstMeta.template === "shape" ? "#16211b" : "#ffffff"));
  const [borderColor, setBorderColor] = useState(firstNode.data.borderColor || "#475569");
  const [borderWidth, setBorderWidth] = useState(firstNode.data.borderWidth || 2);
  const [badgeText, setBadgeText]     = useState(firstNode.data.badgeText || "");
  const [badgeColor, setBadgeColor]   = useState(firstNode.data.badgeColor || "#38bdf8");
  const [position, setPosition]       = useState(firstNode.data.position || firstNode.data.badgeText || "");
  const [linkedChartId, setLinkedChartId] = useState(firstNode.data.linkedChartId || "");
  const [fontSize, setFontSize]           = useState(firstNode.data.fontSize || 13);
  const [textAlign, setTextAlign]         = useState(firstNode.data.textAlign || "center");
  const [textVerticalAlign, setTextVerticalAlign] = useState(firstNode.data.textVerticalAlign || "center");
  // Person-node personal details
  const [staffId, setStaffId]             = useState(firstNode.data.staffId || "");
  const [department, setDepartment]       = useState(firstNode.data.department || "");
  const [office, setOffice]               = useState(firstNode.data.office || "");
  const [joinDate, setJoinDate]           = useState(firstNode.data.joinDate || "");
  const [phone, setPhone]                 = useState(firstNode.data.phone || "");
  const [address, setAddress]             = useState(firstNode.data.address || "");
  const [maritalStatus, setMaritalStatus] = useState(firstNode.data.maritalStatus || "");
  const [siblings, setSiblings]           = useState(firstNode.data.siblings || "");
  const [education, setEducation]         = useState(firstNode.data.education || "");
  const [skill, setSkill]                 = useState(firstNode.data.skill || "");
  const [history, setHistory]             = useState(firstNode.data.history || []);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addChildType, setAddChildType]   = useState("orgNode");
  const [showAddChild, setShowAddChild]   = useState(false);
  const [showVacateForm, setShowVacateForm] = useState(false);
  const [vacateStatus, setVacateStatus]   = useState("Retired");
  const [vacateDate, setVacateDate]       = useState(new Date().toISOString().split("T")[0]);
  const [vacateNotes, setVacateNotes]     = useState("");

  // Accordion open/closed state — Identity and Personal Details open by default;
  // heavy sections (Appearance, Text, Layers) collapsed to reduce visual noise.
  const [openSections, setOpenSections] = useState({
    identity: true,
    personal: true,
    appearance: false,
    text: false,
    layers: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const meta = TYPE_META[orgType] || TYPE_META.orgNode;
  const isMultiSelect = nodes && nodes.length > 1;
  const panelNodesRef = useRef(nodes);
  panelNodesRef.current = nodes;
  const selectedNodeIds = (nodes || []).map((node) => node.id).join(",");

  // Guards the auto-save effect below from firing merely because the node-switch
  // effect repopulated fields to match a newly selected node (no actual user edit).
  const skipNextSave = useRef(true);

  // onUpdateNodes's identity can change on renders unrelated to this panel
  // (it's derived from broader app state). Reading it via a ref instead of
  // listing it as an effect dependency means only real field edits below can
  // trigger a save — an unrelated re-render can no longer resurrect
  // "skipNextSave" timing and bulk-apply the currently-loaded node's values
  // onto every other selected node.
  const onUpdateNodesRef = useRef(onUpdateNodes);
  onUpdateNodesRef.current = onUpdateNodes;
  const isMultiSelectRef = useRef(isMultiSelect);
  isMultiSelectRef.current = isMultiSelect;

  useEffect(() => {
    const currentNodes = panelNodesRef.current;
    const fresh = currentNodes && currentNodes.length > 0 ? currentNodes[0] : { data: {} };
    const freshMeta = TYPE_META[fresh.data.orgType] || TYPE_META.orgNode;
    setName(fresh.data.name || "");
    setNameEn(fresh.data.nameEn || "");
    setDescription(fresh.data.description || "");
    setOrgType(fresh.data.orgType || "orgNode");
    setBadgeText(fresh.data.badgeText || "");
    setBadgeColor(fresh.data.badgeColor || "#38bdf8");
    setPosition(fresh.data.position || fresh.data.badgeText || "");
    setColor(fresh.data.color || (freshMeta.template === "shape" ? "transparent" : "var(--default-node-bg)"));
    setTextColor(fresh.data.textColor || (freshMeta.template === "shape" ? "#16211b" : "#ffffff"));
    setBorderColor(fresh.data.borderColor || "#475569");
    setBorderWidth(fresh.data.borderWidth || 2);
    setLinkedChartId(fresh.data.linkedChartId || "");
    setFontSize(fresh.data.fontSize || 13);
    setTextAlign(fresh.data.textAlign || "center");
    setTextVerticalAlign(fresh.data.textVerticalAlign || "center");
    setStaffId(fresh.data.staffId || "");
    setDepartment(fresh.data.department || "");
    setOffice(fresh.data.office || "");
    setJoinDate(fresh.data.joinDate || "");
    setPhone(fresh.data.phone || "");
    setAddress(fresh.data.address || "");
    setMaritalStatus(fresh.data.maritalStatus || "");
    setSiblings(fresh.data.siblings || "");
    setEducation(fresh.data.education || "");
    setSkill(fresh.data.skill || "");
    setHistory(fresh.data.history || []);
    setConfirmDelete(false);
    setShowAddChild(false);
    setShowVacateForm(false);
    skipNextSave.current = true;

    // If the state values above exactly matched what was already in state,
    // React bails out of re-rendering, and the auto-save effect never runs
    // to consume `skipNextSave`. We clear it asynchronously so it doesn't
    // swallow the user's first real edit.
    const t = setTimeout(() => { skipNextSave.current = false; }, 50);
    return () => clearTimeout(t);
  }, [selectedNodeIds]);

  // Multi-select writes ONLY the bulk-editable fields — per-node data
  // (identity, chart link, personal details) must never be copied from the
  // first node onto the whole selection.
  const buildPayload = () => {
    const payload = {
      orgType,
      color,
      textColor,
      badgeText: meta.isPerson ? (position || badgeText) : badgeText,
      badgeColor,
      fontSize,
      textAlign,
      textVerticalAlign,
    };
    if (meta.template === "shape") {
      Object.assign(payload, { borderColor, borderWidth });
    }
    if (!isMultiSelectRef.current) {
      if (meta.isPerson && chartId && HR_FEATURES_ENABLED) {
        Object.assign(payload, { description, linkedChartId, position });
      } else {
        Object.assign(payload, {
          name, nameEn, description, linkedChartId,
          staffId, department, office, position,
          joinDate, phone, address, maritalStatus,
          siblings, education, skill, history,
        });
      }
    }
    return payload;
  };
  const buildPayloadRef = useRef(buildPayload);
  buildPayloadRef.current = buildPayload;

  const handleOrgTypeChange = (nextType) => {
    const currentMeta = TYPE_META[orgType] || TYPE_META.orgNode;
    const nextMeta = TYPE_META[nextType] || TYPE_META.orgNode;
    if (currentMeta.template !== "shape" && nextMeta.template === "shape") {
      setColor("transparent");
    }
    setOrgType(nextType);
  };

  const handleVacate = () => {
    if (!name && !nameEn && !staffId) {
      setShowVacateForm(false);
      return;
    }

    const newRecord = {
      id: "vacate_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      name, nameEn, staffId, department, office,
      joinDate, phone, address, maritalStatus,
      siblings, education, skill,
      exitStatus: vacateStatus,
      dateLeft: vacateDate,
      notes: vacateNotes,
    };

    // Strict content-based deduplication
    const seen = new Set();
    const newHistory = [newRecord, ...(history || [])].filter((item) => {
      if (!item || typeof item !== "object") return false;
      if (!item.name && !item.nameEn && !item.staffId && !item.dateLeft && !item.exitStatus) return false;
      const key = `${(item.name || "").trim().toLowerCase()}_${(item.nameEn || "").trim().toLowerCase()}_${item.dateLeft || ""}_${item.exitStatus || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setHistory(newHistory);
    setName(""); setNameEn(""); setStaffId(""); setDepartment("");
    setOffice(""); setPosition(""); setJoinDate(""); setPhone("");
    setAddress(""); setMaritalStatus(""); setSiblings(""); setEducation("");
    setSkill(""); setShowVacateForm(false); setVacateNotes("");

    // Prevent debounced auto-save effect from flushing stale state
    skipNextSave.current = true;

    // Force flush
    const payload = buildPayload();
    Object.assign(payload, {
      history: newHistory,
      name: "", nameEn: "", staffId: "", department: "", office: "",
      position: "", joinDate: "", phone: "", address: "", maritalStatus: "",
      siblings: "", education: "", skill: "",
    });
    onUpdateNodesRef.current(payload);
  };

  // Auto-save (debounced) — keeps everything persisted as you type.
  useEffect(() => {
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const t = setTimeout(() => {
      onUpdateNodesRef.current(buildPayloadRef.current());
    }, 250);
    return () => clearTimeout(t);
  }, [
    name, nameEn, description, orgType, color, textColor,
    borderColor, borderWidth, badgeText, badgeColor, position,
    linkedChartId, fontSize, textAlign, textVerticalAlign,
    staffId, department, office, joinDate, phone, address,
    maritalStatus, siblings, education, skill, history,
  ]);

  const handleSave = () => {
    onUpdateNodesRef.current(buildPayload());
    onSave?.();
  };

  const handleClose = () => {
    // Closing used to cancel the pending field update, so a quick close and
    // refresh could restore the node's previous database values.
    onUpdateNodesRef.current(buildPayload());
    if (onSave) onSave();
    else onClose?.();
  };

  // Contextual header title
  const headerTitle = isMultiSelect
    ? `${nodes.length} Nodes Selected`
    : meta.isPerson
      ? (name || nameEn || "Person Node")
      : (name || meta.label || "Properties");

  return (
    <div className="properties-panel pp-light pa-theme">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="pp-header">
        <div className="pp-header-left">
          <span className="pp-header-icon" aria-hidden="true">
            {meta.isPerson ? <User size={14} /> : <Tag size={14} />}
          </span>
          <span className="pp-title" title={headerTitle}>{headerTitle}</span>
        </div>
        <div className="pp-header-actions">
          {!isMultiSelect && !confirmDelete && (
            <button
              type="button"
              className="pp-icon-btn pp-icon-btn--danger"
              onClick={() => setConfirmDelete(true)}
              title="Delete node"
              aria-label="Delete node"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button className="pp-close" onClick={handleClose} title="Save and close">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Node type strip (outside scroll, always visible) ────────────────── */}
      <div className="pp-type-strip" role="group" aria-label="Node type">
        {TYPE_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            className={`pp-type-chip${orgType === t ? " active" : ""}`}
            onClick={() => handleOrgTypeChange(t)}
            aria-label={`${TYPE_META[t]?.label || t} node`}
            aria-pressed={orgType === t}
          >
            <NodeTypePreview type={t} />
          </button>
        ))}
      </div>

      {/* ── Quick actions (Duplicate + Add Child) ────────────────────────────── */}
      {!isMultiSelect && (
        <div className="pp-quick-actions">
          <button
            type="button"
            className="pp-quick-btn"
            onClick={() => onDuplicate?.()}
            title="Duplicate this node"
          >
            <Copy size={13} />
            <span>Duplicate</span>
          </button>
          <button
            type="button"
            className={`pp-quick-btn pp-quick-btn--primary${showAddChild ? " active" : ""}`}
            onClick={() => setShowAddChild((v) => !v)}
            aria-expanded={showAddChild}
            title="Add a child node"
          >
            <Plus size={13} />
            <span>Add Child</span>
            <ChevronDown
              size={11}
              className={`pp-quick-chevron${showAddChild ? " pp-quick-chevron--open" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      )}

      {/* ── Add child type picker (inline, appears below quick actions) ──────── */}
      {!isMultiSelect && showAddChild && (
        <div className="pp-child-picker">
          <div className="pp-type-grid" style={{ marginBottom: 8 }}>
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                className={`pp-type-btn pp-type-btn--shape${addChildType === t ? " active" : ""}`}
                onClick={() => setAddChildType(t)}
                aria-label={`Create ${TYPE_META[t]?.label || t} child node`}
                aria-pressed={addChildType === t}
              >
                <NodeTypePreview type={t} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="pp-btn pp-btn--confirm-add pp-btn--full"
            onClick={() => { onAddChild(addChildType); setShowAddChild(false); }}
          >
            <Plus size={13} /> Create {TYPE_META[addChildType]?.label || addChildType}
          </button>
        </div>
      )}

      {/* ── Scrollable body ──────────────────────────────────────────────────── */}
      <div className="pp-body">

        {/* Identity — single select, non-HR-person nodes */}
        {!isMultiSelect && (!meta.isPerson || !chartId || !HR_FEATURES_ENABLED) && (
          <AccordionSection
            title="Identity"
            icon={<User size={11} />}
            sectionKey="identity"
            open={openSections.identity}
            onToggle={toggleSection}
          >
            <label className="pp-label">{meta.template === "shape" ? "Text" : "Khmer Name"}</label>
            <textarea
              className="pp-textarea"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ឈ្មោះ..."
              dir="auto"
              rows={2}
            />
            <label className="pp-label">{meta.template === "shape" ? "Secondary Text" : "English Name"}</label>
            <textarea
              className="pp-textarea"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="English name..."
              rows={2}
            />
            <label className="pp-label">Description</label>
            <textarea
              className="pp-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </AccordionSection>
        )}

        {/* HR Assignment Tab — person nodes in HR-enabled charts */}
        {meta.isPerson && !isMultiSelect && chartId && HR_FEATURES_ENABLED && (
          <HRAssignmentTab
            chartId={chartId}
            node={firstNode}
            onNodeUpdate={(data) => onUpdateNodesRef.current(data)}
            onViewStaffProfile={onViewStaffProfile}
          />
        )}

        {/* Personal Details — person nodes without HR (legacy charts) */}
        {meta.isPerson && !isMultiSelect && (!chartId || !HR_FEATURES_ENABLED) && (
          <AccordionSection
            title="Personal Details"
            icon={<Contact size={11} />}
            sectionKey="personal"
            open={openSections.personal}
            onToggle={toggleSection}
          >
            <label className="pp-label">Position / តួនាទី</label>
            <select
              className="pp-input"
              value={position}
              onChange={(e) => { setPosition(e.target.value); setBadgeText(e.target.value); }}
              style={{ colorScheme: "light" }}
            >
              <option value="">-- ជ្រើសរើសតួនាទី / Select Position --</option>
              {POSITION_OPTIONS.map((posOpt) => (
                <option key={posOpt} value={posOpt}>{posOpt}</option>
              ))}
              {position && !POSITION_OPTIONS.includes(position) && (
                <option value={position}>{position}</option>
              )}
            </select>

            <label className="pp-label">Staff ID</label>
            <input
              className="pp-input"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder="e.g. GDT-0421"
            />

            <label className="pp-label">Department</label>
            <DepartmentSelect value={department} onChange={(val) => setDepartment(val)} />

            <label className="pp-label">Office</label>
            <OfficeSelect
              department={department}
              value={office}
              onChange={setOffice}
              onDepartmentChange={setOffice}
            />

            <label className="pp-label">Join Date</label>
            <input
              type="date"
              className="pp-input"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
              style={{ colorScheme: "light" }}
            />

            <label className="pp-label">Phone</label>
            <input
              className="pp-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="012 345 678"
            />

            <label className="pp-label">Address</label>
            <textarea
              className="pp-textarea"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ភ្នំពេញ..."
              dir="auto"
              rows={2}
            />

            <label className="pp-label">Marital Status</label>
            <div className="pp-type-grid pp-type-grid--3">
              {[
                { v: "",         label: "—" },
                { v: "single",   label: "Single" },
                { v: "married",  label: "Married" },
              ].map(({ v, label }) => (
                <button
                  key={v || "none"}
                  type="button"
                  className={`pp-type-btn${maritalStatus === v ? " active" : ""}`}
                  onClick={() => setMaritalStatus(v)}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="pp-label">Siblings</label>
            <input
              type="number"
              min={0}
              className="pp-input"
              value={siblings}
              onChange={(e) => setSiblings(e.target.value)}
              placeholder="e.g. 3"
            />

            <label className="pp-label">Education</label>
            <input
              className="pp-input"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="e.g. MBA — Finance"
            />

            <label className="pp-label">Skills / Major</label>
            <input
              className="pp-input"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. Tax audit, Accounting"
            />

            {/* Vacate Action */}
            <div className="pp-vacate-section">
              {!showVacateForm ? (
                <button
                  type="button"
                  className="pp-btn pp-btn--vacate"
                  onClick={() => setShowVacateForm(true)}
                >
                  <UserMinus size={14} />
                  <span>Vacate Position / Remove Staff</span>
                </button>
              ) : (
                <div className="pp-vacate-form">
                  <div className="pp-vacate-form__title">
                    <UserMinus size={13} />
                    Vacate Position Record
                  </div>

                  <label htmlFor="vacate-reason-select" className="pp-label">Reason for leaving</label>
                  <select
                    id="vacate-reason-select"
                    className="pp-input"
                    value={vacateStatus}
                    onChange={(e) => setVacateStatus(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="Retired">Retired</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Resigned">Resigned</option>
                  </select>

                  <label htmlFor="vacate-date-input" className="pp-label">
                    Date <span style={{ opacity: 0.6, fontWeight: 400 }}>(YYYY-MM-DD)</span>
                  </label>
                  <input
                    id="vacate-date-input"
                    type="date"
                    className="pp-input"
                    value={vacateDate}
                    onChange={(e) => setVacateDate(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ colorScheme: "light" }}
                  />

                  <label htmlFor="vacate-notes-input" className="pp-label">Notes</label>
                  <textarea
                    id="vacate-notes-input"
                    className="pp-textarea"
                    value={vacateNotes}
                    onChange={(e) => setVacateNotes(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Optional context..."
                    rows={2}
                  />

                  <div className="pp-vacate-form__actions">
                    <button
                      type="button"
                      className="pp-btn pp-btn--ghost"
                      onClick={() => setShowVacateForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="pp-btn pp-btn--delete"
                      onClick={handleVacate}
                    >
                      Confirm Vacate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>
        )}

        {/* Appearance — collapsed by default (badge, bg, outline, text color) */}
        {!meta.isPerson && (
          <AccordionSection
            title="Appearance"
            icon={<Palette size={11} />}
            sectionKey="appearance"
            open={openSections.appearance}
            onToggle={toggleSection}
          >
            {/* Badge settings (non-shape nodes only) */}
            {meta.template !== "shape" && (
              <>
                <div className="pp-section-sublabel"><Tag size={10} /> Badge</div>
                <label className="pp-label">Text</label>
                <input
                  className="pp-input"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder={meta.label || "e.g. Department, Director..."}
                />
                <label className="pp-label" style={{ marginTop: 8 }}>Color</label>
                <div className="pp-colors">
                  {[
                    { label: "Blue",   value: "#38bdf8" },
                    { label: "Gold",   value: "#d4af37" },
                    { label: "Amber",  value: "#f59e0b" },
                    { label: "Red",    value: "#f43f5e" },
                    { label: "Green",  value: "#136232" },
                    { label: "Purple", value: "#a78bfa" },
                    { label: "Teal",   value: "#5eead4" },
                    { label: "Pink",   value: "#fb7185" },
                  ].map((c) => (
                    <button
                      key={c.value}
                      className={`pp-swatch${badgeColor === c.value ? " active" : ""}`}
                      style={{ background: c.value }}
                      onClick={() => setBadgeColor(c.value)}
                      title={c.label}
                    />
                  ))}
                  <label className="pp-swatch pp-swatch--custom" title="Custom badge color">
                    <input
                      type="color"
                      value={badgeColor}
                      onChange={(e) => setBadgeColor(e.target.value)}
                      style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                    />
                    <span style={{ fontSize: 14 }}>🎨</span>
                  </label>
                </div>
                <div className="pp-color-preview" style={{ background: badgeColor }}>
                  <span>{badgeColor}</span>
                </div>
                <div className="pp-section-divider" />
              </>
            )}

            {/* Background / Fill color */}
            <div className="pp-section-sublabel">
              <Palette size={10} />
              {meta.template === "shape" ? "Fill Color" : "Background"}
            </div>
            {meta.template === "shape" && (
              <button
                type="button"
                className={`pp-btn pp-btn--ghost pp-no-paint${color === "transparent" ? " active" : ""}`}
                onClick={() => setColor("transparent")}
              >
                <Ban size={13} /> No Fill
              </button>
            )}
            <ColorPresetPicker presets={COLOR_PRESETS} value={color} onChange={setColor} />
            <div
              className={`pp-color-preview${color === "transparent" ? " pp-color-preview--transparent" : ""}`}
              style={{ background: color }}
            >
              <span>{color}</span>
            </div>

            {/* Outline (shape nodes only) */}
            {meta.template === "shape" && (
              <>
                <div className="pp-section-divider" />
                <div className="pp-section-sublabel"><Palette size={10} /> Outline</div>
                <button
                  type="button"
                  className={`pp-btn pp-btn--ghost pp-no-paint${borderColor === "transparent" ? " active" : ""}`}
                  onClick={() => setBorderColor("transparent")}
                >
                  <Ban size={13} /> No Outline
                </button>
                <ColorPresetPicker
                  presets={COLOR_PRESETS}
                  value={borderColor}
                  onChange={setBorderColor}
                  customLabel="Custom outline color"
                />
                <label className="pp-label">Width — <strong>{borderWidth}px</strong></label>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={borderWidth}
                  onChange={(e) => setBorderWidth(Number(e.target.value))}
                  className="pp-range"
                  aria-label="Shape outline width"
                />
              </>
            )}

            {/* Text color */}
            <div className="pp-section-divider" />
            <div className="pp-section-sublabel"><Palette size={10} /> Text Color</div>
            <div className="pp-colors">
              {[
                { label: "White",  value: "#ffffff" },
                { label: "Light",  value: "#cbd5e1" },
                { label: "Yellow", value: "#fef08a" },
                { label: "Black",  value: "#000000" },
              ].map((c) => (
                <button
                  key={c.value}
                  className={`pp-swatch${textColor === c.value ? " active" : ""}`}
                  style={{
                    background: c.value,
                    border: c.value === "#ffffff" ? "1px solid rgba(var(--surface-rgb),.3)" : "none",
                  }}
                  onClick={() => setTextColor(c.value)}
                  title={c.label}
                />
              ))}
              <label className="pp-swatch pp-swatch--custom" title="Custom text color">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                />
                <span style={{ fontSize: 14 }}>🎨</span>
              </label>
            </div>
          </AccordionSection>
        )}

        {/* Text — compact font size stepper + combined alignment row */}
        <AccordionSection
          title="Text"
          icon={
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 7V4h16v3M9 20h6M12 4v16" />
            </svg>
          }
          sectionKey="text"
          open={openSections.text}
          onToggle={toggleSection}
        >
          <label className="pp-label">
            Font Size — <strong style={{ color: "var(--pa-text)" }}>{fontSize}px</strong>
          </label>
          <div className="pp-format-row">
            <button
              type="button"
              className="pp-btn pp-btn--ghost pp-btn--icon"
              onClick={() => setFontSize((s) => Math.max(8, s - 1))}
              aria-label="Decrease font size"
            >−</button>
            <input
              type="range"
              min={8}
              max={32}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="pp-range"
            />
            <button
              type="button"
              className="pp-btn pp-btn--ghost pp-btn--icon"
              onClick={() => setFontSize((s) => Math.min(32, s + 1))}
              aria-label="Increase font size"
            >+</button>
          </div>

          {/* Horizontal + vertical alignment in one compact row (non-person) */}
          {!meta.isPerson && (
            <>
              <label className="pp-label">Alignment</label>
              <div className="pp-align-row">
                {ALIGN_H.map(({ v, icon, label }) => (
                  <button
                    key={v}
                    type="button"
                    title={label}
                    className={`pp-align-btn${textAlign === v ? " active" : ""}`}
                    onClick={() => setTextAlign(v)}
                  >
                    {icon}
                  </button>
                ))}
                <div className="pp-align-divider" aria-hidden="true" />
                {ALIGN_V.map(({ v, icon, label }) => (
                  <button
                    key={v}
                    type="button"
                    title={label}
                    className={`pp-align-btn${textVerticalAlign === v ? " active" : ""}`}
                    onClick={() => setTextVerticalAlign(v)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </>
          )}
        </AccordionSection>

        {/* Chart Link */}
        <ChartLinkSection
          availableCharts={charts}
          linkedChartId={linkedChartId}
          isDisabled={isMultiSelect}
          onChange={setLinkedChartId}
        />

        {/* Layer Order — collapsed by default */}
        {!isMultiSelect && (
          <AccordionSection
            title="Layer Order"
            icon={<Layers size={11} />}
            sectionKey="layers"
            open={openSections.layers}
            onToggle={toggleSection}
          >
            <div className="pp-layer-actions">
              <button
                type="button"
                className="pp-btn pp-btn--ghost"
                onClick={() => onChangeLayer?.("back")}
              >
                <SendToBack size={13} /> Send to Back
              </button>
              <button
                type="button"
                className="pp-btn pp-btn--ghost"
                onClick={() => onChangeLayer?.("front")}
              >
                <BringToFront size={13} /> Bring to Front
              </button>
            </div>
          </AccordionSection>
        )}
      </div>

      {/* ── Sticky footer — primary Save; Delete moved to header icon ────────── */}
      <div className="pp-sticky-footer">
        {confirmDelete ? (
          <div className="pp-delete-confirm">
            <p>Delete {isMultiSelect ? "these nodes" : "this node"} and connections?</p>
            <div className="pp-delete-btns">
              <button
                type="button"
                className="pp-btn pp-btn--ghost"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pp-btn pp-btn--delete"
                onClick={() => onDelete()}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="pp-btn pp-btn--save pp-btn--full"
            onClick={handleSave}
          >
            <Check size={14} /> {meta.isPerson ? "Save Details" : "Save Changes"}
          </button>
        )}
      </div>
    </div>
  );
}
