import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { useOrgStructure } from "../hooks/useOrgStructure";
import { cn } from "../lib/utils";
import { supabase } from "../supabaseClient";
import AdminFooter from "../components/admin/AdminFooter";
import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";
import "./AdminDashboardTestPage.css";

function StatusBadge({ children, tone = "neutral", dot = true }) {
  const styles = {
    success:
      "border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]",
    warning:
      "border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)] text-[#735413]",
    info:
      "border-[var(--pa-info-border)] bg-[var(--pa-info-soft)] text-[var(--pa-info)]",
    neutral:
      "border-[var(--pa-border)] bg-[var(--pa-surface-muted)] text-[#47524c]",
    danger:
      "border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] text-[var(--pa-danger)]",
  };

  const dotStyles = {
    success: "bg-[var(--pa-primary)]",
    warning: "bg-[var(--pa-gold)]",
    info: "bg-[var(--pa-info)]",
    neutral: "bg-[var(--pa-muted)]",
    danger: "bg-[var(--pa-danger)]",
  };

  return (
    <span
      className={cn(
        "inline-flex h-5.5 shrink-0 items-center gap-1 rounded-md border px-1.5 text-[10px] font-bold leading-none tracking-[0.015em]",
        styles[tone] || styles.neutral,
      )}
    >
      {dot && (
        <span
          className={cn("size-1.25 rounded-full", dotStyles[tone] || dotStyles.neutral)}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// ── Inline editable text component ──────────────────────────────
function InlineEdit({ value, onSave, placeholder = "Enter name..." }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      return;
    }

    setSaving(true);
    const saved = await onSave(trimmed);
    setSaving(false);
    if (saved !== false) setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Click to rename"
        className="group/edit inline-flex items-center gap-1.5 text-left font-extrabold text-[var(--pa-text)] transition-colors hover:text-[var(--pa-primary)]"
      >
        <span dir="auto" className="text-[13.5px]">
          {value}
        </span>
        <Pencil
          size={12}
          className="text-[var(--pa-faint)] opacity-0 transition-opacity group-hover/edit:opacity-100 shrink-0"
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="text"
        className="pa-focus-ring h-7 rounded-md border border-[var(--pa-primary)] bg-white px-2.5 text-[12.5px] font-semibold text-[var(--pa-text)] outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape" && !saving) {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        dir="auto"
        disabled={saving}
      />
      <button
        type="button"
        className="flex size-6.5 items-center justify-center rounded-md border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)] transition-colors hover:bg-[var(--pa-primary)] hover:text-white disabled:opacity-50"
        onClick={commit}
        disabled={saving}
        aria-label="Save name"
      >
        {saving ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Check size={12} />
        )}
      </button>
      <button
        type="button"
        className="flex size-6.5 items-center justify-center rounded-md border border-[var(--pa-border)] bg-white text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-surface-muted)] disabled:opacity-50"
        disabled={saving}
        onClick={() => {
          setDraft(value);
          setEditing(false);
        }}
        aria-label="Cancel rename"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ── Confirm delete modal ────────────────────────────────────────
function DeleteConfirm({ itemName, itemType, saving, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081a12]/60 p-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--pa-border)] bg-white p-5 shadow-xl motion-safe:animate-in motion-safe:fade-in-50 motion-safe:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] text-[var(--pa-danger)]">
          <AlertCircle size={20} aria-hidden="true" />
        </div>
        <h3 className="text-[15px] font-extrabold text-[var(--pa-text)]">
          Confirm deletion
        </h3>
        <p className="mt-1.5 text-[11.5px] leading-4.5 text-[var(--pa-muted)]">
          Are you sure you want to delete{" "}
          <strong dir="auto" className="font-extrabold text-[var(--pa-text)]">
            "{itemName}"
          </strong>
          ?
          {itemType === "unit" && (
            <span className="mt-1.5 block font-semibold text-[var(--pa-danger)]">
              ⚠️ Warning: Deleting this unit will also remove all associated
              offices.
            </span>
          )}
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="pa-focus-ring h-8 rounded-lg border border-[var(--pa-border)] bg-white px-3 text-[11.5px] font-bold text-[var(--pa-muted)] hover:bg-[var(--pa-surface-muted)]"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pa-focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--pa-danger)] px-3 text-[11.5px] font-bold text-white transition-colors hover:bg-[#852924] disabled:opacity-50"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Deleting...
              </>
            ) : (
              "Delete permanently"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrgStructurePage() {
  const { units, loading, error, refetch } = useOrgStructure();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState(new Set());
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // New unit form
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitType, setNewUnitType] = useState("department");
  const newUnitRef = useRef(null);

  // New office form (keyed by unit id)
  const [addingOfficeFor, setAddingOfficeFor] = useState(null);
  const [newOfficeName, setNewOfficeName] = useState("");
  const newOfficeRef = useRef(null);

  useEffect(() => {
    if (showNewUnit) newUnitRef.current?.focus();
  }, [showNewUnit]);

  useEffect(() => {
    if (addingOfficeFor) newOfficeRef.current?.focus();
  }, [addingOfficeFor]);

  const toggleExpand = (id) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedUnits(new Set((units || []).map((u) => u.id)));
  };

  const collapseAll = () => {
    setExpandedUnits(new Set());
  };

  const filteredUnits = (units || []).filter((u) => {
    if (filterType !== "all" && u.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchUnit = u.name.toLowerCase().includes(q);
      const matchOffice = (u.offices || []).some((o) =>
        o.name.toLowerCase().includes(q),
      );
      return matchUnit || matchOffice;
    }
    return true;
  });

  // Split units into independent left and right column stacks so opening dropdowns on one side never stretches the other column
  const leftUnits = filteredUnits.filter((_, index) => index % 2 === 0);
  const rightUnits = filteredUnits.filter((_, index) => index % 2 === 1);

  const totalUnits = (units || []).length;
  const totalOffices = (units || []).reduce(
    (sum, u) => sum + (u.offices?.length || 0),
    0,
  );
  const deptCount = (units || []).filter((u) => u.type === "department").length;
  const distCount = (units || []).filter((u) => u.type === "district").length;
  const provCount = (units || []).filter((u) => u.type === "province").length;

  // CRUD Operations
  const handleAddUnit = async () => {
    const trimmed = newUnitName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const maxSort = (units || []).reduce(
        (max, u) => Math.max(max, u.sort_order || 0),
        0,
      );
      const { error: insertError } = await supabase
        .from("org_units")
        .insert({
          name: trimmed,
          type: newUnitType,
          sort_order: maxSort + 1,
        });
      if (insertError) throw insertError;
      setNewUnitName("");
      setShowNewUnit(false);
      await refetch();
    } catch (err) {
      alert("Failed to add unit: " + (err.message || "Database error"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUnit = async (unitId, newName) => {
    setSaving(true);
    try {
      const { data, error: updateError } = await supabase
        .from("org_units")
        .update({ name: newName })
        .eq("id", unitId)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("Unit not found or update prohibited.");
      await refetch();
      return true;
    } catch (err) {
      alert("Failed to rename unit: " + (err.message || "Database error"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (unitId) => {
    setSaving(true);
    try {
      const { data, error: delError } = await supabase
        .from("org_units")
        .delete()
        .eq("id", unitId)
        .select("id")
        .maybeSingle();
      if (delError) throw delError;
      if (!data) throw new Error("Unit not found or delete prohibited.");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      alert("Failed to delete unit: " + (err.message || "Database error"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddOffice = async (unitId) => {
    const trimmed = newOfficeName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const unit = (units || []).find((u) => u.id === unitId);
      const maxSort = (unit?.offices || []).reduce(
        (max, o) => Math.max(max, o.sort_order || 0),
        0,
      );
      const { error: insertError } = await supabase
        .from("org_offices")
        .insert({
          unit_id: unitId,
          name: trimmed,
          sort_order: maxSort + 1,
        });
      if (insertError) throw insertError;
      setNewOfficeName("");
      setAddingOfficeFor(null);
      await refetch();
    } catch (err) {
      alert("Failed to add office: " + (err.message || "Database error"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOffice = async (officeId, newName) => {
    setSaving(true);
    try {
      const { data, error: updateError } = await supabase
        .from("org_offices")
        .update({ name: newName })
        .eq("id", officeId)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("Office not found or update prohibited.");
      await refetch();
      return true;
    } catch (err) {
      alert("Failed to rename office: " + (err.message || "Database error"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffice = async (officeId) => {
    setSaving(true);
    try {
      const { data, error: delError } = await supabase
        .from("org_offices")
        .delete()
        .eq("id", officeId)
        .select("id")
        .maybeSingle();
      if (delError) throw delError;
      if (!data) throw new Error("Office not found or delete prohibited.");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      alert("Failed to delete office: " + (err.message || "Database error"));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "unit") handleDeleteUnit(deleteTarget.id);
    else handleDeleteOffice(deleteTarget.id);
  };

  const getTypeBadgeTone = (type) => {
    if (type === "department") return "success";
    if (type === "district") return "warning";
    if (type === "province") return "info";
    return "neutral";
  };

  const renderUnitCard = (unit) => {
    const isExpanded = expandedUnits.has(unit.id);
    const officeCount = unit.offices?.length || 0;
    const tone = getTypeBadgeTone(unit.type);

    return (
      <div
        key={unit.id}
        className={cn(
          "overflow-hidden rounded-[10px] border transition-all duration-150 shadow-2xs",
          isExpanded
            ? "border-[var(--pa-primary-border)] bg-white ring-1 ring-[var(--pa-primary-border)] shadow-md"
            : "border-[var(--pa-border)] bg-white hover:border-[var(--pa-border-strong)]",
        )}
      >
        {/* Unit Header Card Bar */}
        <div
          onClick={() => toggleExpand(unit.id)}
          className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--pa-surface-muted)] text-[var(--pa-muted)] transition-transform">
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
            <div className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-wrap items-center gap-2.5">
                <InlineEdit
                  value={unit.name}
                  onSave={(newName) => handleUpdateUnit(unit.id, newName)}
                />
                <StatusBadge tone={tone} dot={false}>
                  {unit.type}
                </StatusBadge>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--pa-muted)]">
                  <MapPin size={11} className="text-[var(--pa-faint)]" />
                  {officeCount} office{officeCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              title="Add sub-office"
              onClick={() => {
                setExpandedUnits((prev) => new Set(prev).add(unit.id));
                setAddingOfficeFor(unit.id);
                setNewOfficeName("");
              }}
              className="pa-focus-ring flex h-7 items-center gap-1 rounded-md border border-[var(--pa-border)] bg-white px-2.5 text-[10.5px] font-bold text-[var(--pa-muted)] transition-colors hover:border-[var(--pa-primary-border)] hover:bg-[var(--pa-primary-soft)] hover:text-[var(--pa-primary)]"
            >
              <Plus size={12} />
              Add office
            </button>
            <button
              type="button"
              title="Delete unit"
              onClick={() =>
                setDeleteTarget({
                  type: "unit",
                  id: unit.id,
                  name: unit.name,
                })
              }
              className="pa-focus-ring flex size-7 items-center justify-center rounded-md border border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] text-[var(--pa-danger)] transition-colors hover:bg-[var(--pa-danger)] hover:text-white"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Expanded Sub-offices Section */}
        {isExpanded && (
          <div className="border-t border-[var(--pa-border)] bg-[var(--pa-canvas)]/40 p-4 rounded-b-[10px]">
            <div className="mb-2.5 text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--pa-muted)]">
              Sub-offices ({officeCount})
            </div>

            {/* Sub-office items rendered as distinct breathable cards with explicit margins */}
            <div className="flex flex-col gap-2.5">
              {(unit.offices || []).map((office) => (
                <div
                  key={office.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--pa-border)] bg-white px-3.5 py-2.5 text-[12.5px] shadow-2xs transition-all hover:border-[var(--pa-primary-border)] hover:bg-[var(--pa-primary-soft)]/20"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin
                      size={14}
                      className="shrink-0 text-[var(--pa-primary)]"
                    />
                    <InlineEdit
                      value={office.name}
                      onSave={(newName) =>
                        handleUpdateOffice(office.id, newName)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    title="Delete office"
                    onClick={() =>
                      setDeleteTarget({
                        type: "office",
                        id: office.id,
                        name: office.name,
                      })
                    }
                    className="pa-focus-ring flex size-7 items-center justify-center rounded text-[var(--pa-faint)] transition-colors hover:bg-[var(--pa-danger-soft)] hover:text-[var(--pa-danger)] shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {addingOfficeFor === unit.id ? (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--pa-primary-border)] bg-white p-2.5 shadow-2xs mt-1">
                  <MapPin size={14} className="shrink-0 text-[var(--pa-primary)]" />
                  <input
                    ref={newOfficeRef}
                    type="text"
                    value={newOfficeName}
                    onChange={(e) => setNewOfficeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddOffice(unit.id);
                      if (e.key === "Escape") setAddingOfficeFor(null);
                    }}
                    placeholder="Enter office name..."
                    dir="auto"
                    className="pa-focus-ring h-8 flex-1 rounded-md border border-[var(--pa-border)] px-2.5 text-[12px] font-medium text-[var(--pa-text)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddOffice(unit.id)}
                    disabled={!newOfficeName.trim() || saving}
                    className="flex size-7.5 items-center justify-center rounded-md bg-[var(--pa-primary)] text-white disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingOfficeFor(null)}
                    className="flex size-7.5 items-center justify-center rounded-md border border-[var(--pa-border)] text-[var(--pa-muted)] hover:bg-[var(--pa-surface-muted)]"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingOfficeFor(unit.id);
                    setNewOfficeName("");
                  }}
                  className="pa-focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-[var(--pa-border-strong)] bg-white px-3 text-[11px] font-bold text-[var(--pa-primary)] transition-colors hover:border-[var(--pa-primary)] hover:bg-[var(--pa-primary-soft)] mt-1 self-start"
                >
                  <Plus size={13} /> Add sub-office
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-dashboard-test flex h-screen overflow-hidden bg-[var(--pa-canvas)]">
      {/* Fixed Desktop Sidebar */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] lg:flex h-full">
        <AdminSidebar currentTab="org-structure" />
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#081a12]/55 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="relative flex h-full w-[min(84vw,260px)] flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-200">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="pa-focus-ring absolute right-2.5 top-2.5 z-10 flex size-8 items-center justify-center rounded-lg text-[var(--pa-sidebar-muted)] transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <AdminSidebar currentTab="org-structure" onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Workspace Layout Stack */}
      <div className="flex flex-1 flex-col h-full overflow-hidden min-w-0">
        {/* Fixed Top Header */}
        <AdminHeader
          mobileNavOpen={mobileNavOpen}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search units or offices..."
          searchLabel="Search organizational units"
          saving={saving}
        />

        {/* Scrollable Center Main Workspace */}
        <main className="pa-scrollbar flex-1 overflow-y-auto mx-auto w-full max-w-[1540px] px-4 pb-12 pt-7 sm:px-7 lg:px-10">
          {/* Page Title Header */}
          <div className="mb-3.5 flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
            <div>
              <div className="mb-0.5 flex flex-wrap items-center gap-2">
                <StatusBadge tone="success">Active Hierarchy</StatusBadge>
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--pa-faint)]">
                  Departments & Offices
                </span>
              </div>
              <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-[var(--pa-text)] sm:text-[22px]">
                Organization Setup
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNewUnit(true);
                  setNewUnitName("");
                }}
                className="pa-focus-ring inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[var(--pa-primary)] px-3 text-[11px] font-extrabold text-white transition-colors hover:bg-[var(--pa-primary-hover)]"
              >
                <Plus size={13} strokeWidth={2.2} aria-hidden="true" />
                Add Unit
              </button>
            </div>
          </div>

          {/* Compact Top KPI Metrics Bar */}
          <section
            className="mb-3.5 grid gap-px overflow-hidden rounded-[10px] border border-[var(--pa-border)] bg-[var(--pa-border)] shadow-2xs sm:grid-cols-2 lg:grid-cols-5"
            aria-label="Organization statistics"
          >
            {[
              {
                label: "Total Units",
                value: totalUnits,
                detail: "Active units",
                tone: "success",
                icon: Building2,
              },
              {
                label: "Total Offices",
                value: totalOffices,
                detail: "Sub-offices",
                tone: "info",
                icon: MapPin,
              },
              {
                label: "Departments",
                value: deptCount,
                detail: "Central ops",
                tone: "success",
                icon: Building2,
              },
              {
                label: "Districts",
                value: distCount,
                detail: "District branches",
                tone: "warning",
                icon: MapPin,
              },
              {
                label: "Provinces",
                value: provCount,
                detail: "Provincial branches",
                tone: "neutral",
                icon: MapPin,
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.label} className="bg-white p-2.5 sm:p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex size-6.5 items-center justify-center rounded-md border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
                      <Icon size={13} strokeWidth={1.9} aria-hidden="true" />
                    </div>
                    <StatusBadge tone={stat.tone} dot={false}>
                      Live
                    </StatusBadge>
                  </div>
                  <div className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-[var(--pa-muted)]">
                    {stat.label}
                  </div>
                  <div className="pa-tabular mt-0.5 text-[20px] font-extrabold leading-none tracking-[-0.03em] text-[var(--pa-text)]">
                    {stat.value}
                  </div>
                </article>
              );
            })}
          </section>

          {/* New Unit Inline Form */}
          {showNewUnit && (
            <div className="mb-3.5 rounded-[10px] border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] p-3 shadow-2xs">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11.5px] font-extrabold text-[var(--pa-primary)]">
                  Create New Organizational Unit
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewUnit(false)}
                  className="text-[var(--pa-muted)] hover:text-[var(--pa-text)]"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={newUnitType}
                  onChange={(e) => setNewUnitType(e.target.value)}
                  className="pa-focus-ring h-8 rounded-[6px] border border-[var(--pa-border)] bg-white px-2 text-[11px] font-bold text-[var(--pa-text)] outline-none"
                >
                  <option value="department">Department</option>
                  <option value="district">District</option>
                  <option value="province">Province</option>
                </select>
                <input
                  ref={newUnitRef}
                  type="text"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddUnit();
                    if (e.key === "Escape") setShowNewUnit(false);
                  }}
                  placeholder="Enter unit name in Khmer or English..."
                  dir="auto"
                  className="pa-focus-ring h-8 flex-1 min-w-[180px] rounded-[6px] border border-[var(--pa-border)] bg-white px-2.5 text-[11.5px] font-medium text-[var(--pa-text)] outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddUnit}
                  disabled={!newUnitName.trim() || saving}
                  className="pa-focus-ring inline-flex h-8 items-center gap-1 rounded-[6px] bg-[var(--pa-primary)] px-2.5 text-[11px] font-extrabold text-white transition-colors hover:bg-[var(--pa-primary-hover)] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewUnit(false)}
                  className="pa-focus-ring h-8 rounded-[6px] border border-[var(--pa-border)] bg-white px-2.5 text-[11px] font-bold text-[var(--pa-muted)] hover:bg-[var(--pa-surface-muted)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Compact Filter Toolbar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--pa-border)] bg-white px-2.5 py-1.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "all", label: "All Units" },
                { id: "department", label: "Departments" },
                { id: "district", label: "Districts" },
                { id: "province", label: "Provinces" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  aria-pressed={filterType === tab.id}
                  className={cn(
                    "pa-focus-ring h-6.5 rounded-md px-2 text-[10px] font-extrabold transition-colors",
                    filterType === tab.id
                      ? "bg-[var(--pa-primary)] text-white shadow-2xs"
                      : "text-[var(--pa-muted)] hover:bg-[var(--pa-surface-muted)] hover:text-[var(--pa-text)]",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={expandAll}
                className="pa-focus-ring h-6 rounded border border-[var(--pa-border)] bg-[var(--pa-canvas)] px-2 text-[9px] font-bold text-[var(--pa-muted)] hover:text-[var(--pa-text)]"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="pa-focus-ring h-6 rounded border border-[var(--pa-border)] bg-[var(--pa-canvas)] px-2 text-[9px] font-bold text-[var(--pa-muted)] hover:text-[var(--pa-text)]"
              >
                Collapse all
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] p-2.5 text-[11px] font-semibold text-[var(--pa-danger)]">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Independent Dual Column Stacks */}
          {loading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-[10px] border border-[var(--pa-border)] bg-white p-5 text-center shadow-2xs">
              <Loader2 size={24} className="animate-spin text-[var(--pa-primary)]" />
              <p className="mt-2 text-[11.5px] font-extrabold text-[var(--pa-text)]">
                Loading structure...
              </p>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-[10px] border border-[var(--pa-border)] bg-white p-5 text-center shadow-2xs">
              <Building2 size={28} className="text-[var(--pa-faint)]" />
              <div className="mt-2 text-[12.5px] font-extrabold text-[var(--pa-text)]">
                {search ? "No matching units found" : "No organizational units"}
              </div>
              <p className="mt-0.5 text-[10.5px] text-[var(--pa-muted)]">
                {search ? "Try adjusting your search query." : "Click 'Add Unit' above to create one."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              {/* Left Column Stack */}
              <div className="flex flex-col gap-3 min-w-0">
                {leftUnits.map(renderUnitCard)}
              </div>
              {/* Right Column Stack */}
              <div className="flex flex-col gap-3 min-w-0">
                {rightUnits.map(renderUnitCard)}
              </div>
            </div>
          )}
        </main>

        {/* Synchronized Position Bottom Footer */}
        <AdminFooter />
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteConfirm
          itemName={deleteTarget.name}
          itemType={deleteTarget.type}
          saving={saving}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
