import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { z } from "zod";

import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";
import { cn } from "../lib/utils";
import { useOrgStructure } from "../hooks/useOrgStructure";
import { supabase } from "../supabaseClient";
import "./AdminDashboardTestPage.css";
import "./AdminOrgStructureTestPage.css";

const PAGE_SIZE = 7;
const OFFICE_PAGE_SIZE = 6;

const TYPE_LABELS: Record<string, string> = {
  department: "Department",
  district: "District",
  province: "Province",
};

const UnitTypeSchema = z.enum(["department", "district", "province"]);
const OrganizationNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(200, "Name must be 200 characters or fewer.");

type UnitType = z.infer<typeof UnitTypeSchema>;
type UnitFilter = "all" | UnitType;

interface DeleteTarget {
  kind: "unit" | "office";
  unitId: string;
  officeId?: string;
  name: string;
}

function TypeBadge({ type }: { type: string }) {
  const normalizedType = (type || "department").toLowerCase();
  const label = TYPE_LABELS[normalizedType] || type || "Department";
  const badgeClass =
    normalizedType === "district"
      ? "ost-type-badge--district"
      : normalizedType === "province"
        ? "ost-type-badge--province"
        : "ost-type-badge--department";

  return <span className={`ost-type-badge ${badgeClass}`}>{label}</span>;
}

export default function AdminOrgStructurePageView() {
  const { units, loading, error, refetch } = useOrgStructure();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [search, setSearch] = useState("");
  const [officeSearch, setOfficeSearch] = useState("");
  const [filter, setFilter] = useState<UnitFilter>("all");
  const [page, setPage] = useState(1);
  const [officePage, setOfficePage] = useState(1);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitType, setNewUnitType] = useState<UnitType>("department");
  const [showOfficeForm, setShowOfficeForm] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState("");
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitDraft, setUnitDraft] = useState("");
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [officeDraft, setOfficeDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const officePanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (units.length > 0 && (!selectedUnitId || !units.some((u) => u.id === selectedUnitId))) {
      setSelectedUnitId(units[0]?.id ?? "");
    }
  }, [units, selectedUnitId]);

  const filteredUnits = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return units.filter((unit) => {
      const unitType = (unit.type || "").toLowerCase();
      if (filter !== "all" && unitType !== filter) return false;
      if (!query) return true;
      return (
        unit.name.toLocaleLowerCase().includes(query) ||
        (unit.offices || []).some((item) => item.name.toLocaleLowerCase().includes(query))
      );
    });
  }, [filter, search, units]);

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / PAGE_SIZE));
  const pagedUnits = filteredUnits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? null;
  const visibleOffices = useMemo(() => {
    const query = officeSearch.trim().toLocaleLowerCase();
    if (!selectedUnit || !query) return selectedUnit?.offices ?? [];
    return (selectedUnit.offices || []).filter((item) =>
      item.name.toLocaleLowerCase().includes(query),
    );
  }, [officeSearch, selectedUnit]);
  const totalOfficePages = Math.max(
    1,
    Math.ceil(visibleOffices.length / OFFICE_PAGE_SIZE),
  );
  const pagedOffices = visibleOffices.slice(
    (officePage - 1) * OFFICE_PAGE_SIZE,
    officePage * OFFICE_PAGE_SIZE,
  );

  const totalOffices = units.reduce((sum, unit) => sum + (unit.offices?.length || 0), 0);
  const departmentCount = units.filter((unit) => (unit.type || "").toLowerCase() === "department").length;
  const regionalCount = units.length - departmentCount;

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setOfficePage(1);
  }, [officeSearch, selectedUnitId]);

  useEffect(() => {
    if (officePage > totalOfficePages) setOfficePage(totalOfficePages);
  }, [officePage, totalOfficePages]);

  const selectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    setOfficeSearch("");
    setEditingOfficeId(null);
    setShowOfficeForm(false);
    if (window.matchMedia("(max-width: 900px)").matches) {
      requestAnimationFrame(() => {
        officePanelRef.current?.scrollIntoView({ block: "start" });
      });
    }
  };

  const addUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = z
      .object({ name: OrganizationNameSchema, type: UnitTypeSchema })
      .safeParse({ name: newUnitName, type: newUnitType });
    if (!input.success) {
      alert(input.error.issues[0]?.message ?? "Enter a valid unit.");
      return;
    }

    setSaving(true);
    try {
      const maxSort = (units || []).reduce(
        (max, u) => Math.max(max, u.sort_order || 0),
        0,
      );
      const { data, error: insertError } = await supabase
        .from("org_units")
        .insert({
          name: input.data.name,
          type: input.data.type,
          sort_order: maxSort + 1,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      setNewUnitName("");
      setShowUnitForm(false);
      await refetch();
      const inserted = data as { id?: string } | null;
      if (inserted?.id) setSelectedUnitId(inserted.id);
    } catch (err) {
      console.error("Failed to add unit:", err);
      alert(err instanceof Error ? err.message : "Failed to add unit");
    } finally {
      setSaving(false);
    }
  };

  const saveUnitName = async (unitId: string) => {
    const input = OrganizationNameSchema.safeParse(unitDraft);
    if (!input.success) {
      alert(input.error.issues[0]?.message ?? "Enter a valid unit name.");
      return;
    }

    setSaving(true);
    try {
      const { data, error: updateError } = await supabase
        .from("org_units")
        .update({ name: input.data })
        .eq("id", unitId)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("Unit not found or update prohibited.");
      await refetch();
    } catch (err) {
      console.error("Failed to rename unit:", err);
      alert(err instanceof Error ? err.message : "Failed to rename unit");
    } finally {
      setSaving(false);
      setEditingUnitId(null);
    }
  };

  const addOffice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUnit) return;
    const input = OrganizationNameSchema.safeParse(newOfficeName);
    if (!input.success) {
      alert(input.error.issues[0]?.message ?? "Enter a valid office name.");
      return;
    }

    setSaving(true);
    try {
      const maxSort = (selectedUnit.offices || []).reduce(
        (max, o) => Math.max(max, o.sort_order || 0),
        0,
      );
      const { data, error: insertError } = await supabase
        .from("org_offices")
        .insert({
          unit_id: selectedUnit.id,
          name: input.data,
          sort_order: maxSort + 1,
        })
        .select("id")
        .maybeSingle();
      if (insertError) throw insertError;
      if (!data) throw new Error("Office was not created or creation was prohibited.");
      setNewOfficeName("");
      setShowOfficeForm(false);
      await refetch();
      setOfficePage(Math.ceil(((selectedUnit.offices?.length || 0) + 1) / OFFICE_PAGE_SIZE));
    } catch (err) {
      console.error("Failed to add office:", err);
      alert(err instanceof Error ? err.message : "Failed to add office");
    } finally {
      setSaving(false);
    }
  };

  const saveOfficeName = async (_unitId: string, officeId: string) => {
    const input = OrganizationNameSchema.safeParse(officeDraft);
    if (!input.success) {
      alert(input.error.issues[0]?.message ?? "Enter a valid office name.");
      return;
    }

    setSaving(true);
    try {
      const { data, error: updateError } = await supabase
        .from("org_offices")
        .update({ name: input.data })
        .eq("id", officeId)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("Office not found or update prohibited.");
      await refetch();
    } catch (err) {
      console.error("Failed to rename office:", err);
      alert(err instanceof Error ? err.message : "Failed to rename office");
    } finally {
      setSaving(false);
      setEditingOfficeId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      if (deleteTarget.kind === "unit") {
        const { data, error: delError } = await supabase
          .from("org_units")
          .delete()
          .eq("id", deleteTarget.unitId)
          .select("id")
          .maybeSingle();
        if (delError) throw delError;
        if (!data) throw new Error("Unit not found or deletion prohibited.");
        await refetch();
        if (selectedUnitId === deleteTarget.unitId) {
          const remaining = units.filter((unit) => unit.id !== deleteTarget.unitId);
          setSelectedUnitId(remaining[0]?.id ?? "");
        }
      } else if (deleteTarget.officeId) {
        const { data, error: delError } = await supabase
          .from("org_offices")
          .delete()
          .eq("id", deleteTarget.officeId)
          .select("id")
          .maybeSingle();
        if (delError) throw delError;
        if (!data) throw new Error("Office not found or deletion prohibited.");
        await refetch();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="admin-dashboard-test flex w-full text-[var(--pa-text)]">
      <aside className="hidden h-full w-[238px] shrink-0 border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] lg:flex">
        <AdminSidebar currentTab="org-structure" />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#081a12]/55 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="relative flex h-full w-[min(84vw,260px)] flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="pa-focus-ring absolute right-2.5 top-2.5 z-10 flex size-8 items-center justify-center rounded-lg text-[var(--pa-sidebar-muted)] hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <AdminSidebar currentTab="org-structure" onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader
          mobileNavOpen={mobileNavOpen}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search units or offices"
          searchLabel="Search organizational units and offices"
        />

        <main className="pa-scrollbar flex-1 overflow-y-auto">
          <div className="ost-page mx-auto w-full max-w-[1540px] px-4 pb-12 pt-6 sm:px-7 lg:px-10">
            <div className="ost-title-row">
              <div>
                <div className="ost-eyebrow">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--pa-primary)]">
                    <Building2 size={13} /> Organization register
                  </span>
                  <span>Departments and offices</span>
                </div>
                <h1>Organization structure</h1>
                <p>Maintain the reporting units used by staff records and organization charts.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="ost-secondary-button pa-focus-ring"
                  onClick={() => refetch()}
                  title="Reload live data"
                  aria-label="Reload live data"
                  disabled={loading}
                >
                  <RefreshCw size={14} className={cn(loading && "animate-spin")} />
                </button>
                <button
                  type="button"
                  className="ost-primary-button pa-focus-ring"
                  onClick={() => setShowUnitForm((current) => !current)}
                  aria-expanded={showUnitForm}
                  disabled={saving}
                >
                  <Plus size={15} aria-hidden="true" />
                  Add unit
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <span>{error}</span>
                <button type="button" onClick={() => refetch()} className="flex items-center gap-1 font-semibold text-red-800 underline">
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            )}

            <section className="ost-summary" aria-label="Organization summary">
              <div><span>Organizational units</span><strong>{units.length}</strong></div>
              <div><span>Departments</span><strong>{departmentCount}</strong></div>
              <div><span>Regional branches</span><strong>{regionalCount}</strong></div>
              <div><span>Offices</span><strong>{totalOffices}</strong></div>
            </section>

            {showUnitForm && (
              <form className="ost-create-unit" onSubmit={addUnit}>
                <div className="ost-create-unit__heading">
                  <div>
                    <strong>New organizational unit</strong>
                    <span>Live database record</span>
                  </div>
                  <button type="button" onClick={() => setShowUnitForm(false)} aria-label="Close new unit form">
                    <X size={16} />
                  </button>
                </div>
                <div className="ost-create-unit__fields">
                  <label>
                    <span>Unit name</span>
                    <input autoFocus value={newUnitName} onChange={(event) => setNewUnitName(event.target.value)} placeholder="e.g. នាយកដ្ឋាន..." required />
                  </label>
                  <label>
                    <span>Unit type</span>
                    <select
                      value={newUnitType}
                      onChange={(event) => {
                        const parsedType = UnitTypeSchema.safeParse(event.target.value);
                        if (parsedType.success) setNewUnitType(parsedType.data);
                      }}
                    >
                      {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <button className="ost-primary-button pa-focus-ring" type="submit" disabled={saving}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Add unit
                  </button>
                </div>
              </form>
            )}

            <div className="ost-filter-row" aria-label="Filter organizational units">
              <div className="ost-segmented-control">
                {(["all", "department", "district", "province"] as UnitFilter[]).map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                    className={cn(filter === value && "is-active")}
                  >
                    {value === "all" ? "All units" : `${TYPE_LABELS[value]}s`}
                  </button>
                ))}
              </div>
              <span>{filteredUnits.length} result{filteredUnits.length === 1 ? "" : "s"}</span>
            </div>

            <div className="ost-master-detail">
              <section className="ost-unit-table-panel" aria-labelledby="ost-units-heading">
                <div className="ost-panel-heading">
                  <div>
                    <span>Organization register</span>
                    <h2 id="ost-units-heading">Organizational units</h2>
                  </div>
                  <Building2 size={19} aria-hidden="true" />
                </div>

                <div className="ost-table-wrap">
                  <table className="ost-unit-table">
                    <thead>
                      <tr>
                        <th scope="col">Unit</th>
                        <th scope="col" className="ost-type-column">Type</th>
                        <th scope="col" className="ost-offices-column">Offices</th>
                        <th scope="col" className="ost-actions-column"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUnits.map((unit) => {
                        const selected = unit.id === selectedUnitId;
                        const editing = unit.id === editingUnitId;
                        const officeCount = unit.offices?.length || 0;
                        return (
                          <tr key={unit.id} className={cn(selected && "is-selected")}>
                            <td>
                              {editing ? (
                                <div className="ost-inline-edit">
                                  <input
                                    autoFocus
                                    value={unitDraft}
                                    onChange={(event) => setUnitDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") saveUnitName(unit.id);
                                      if (event.key === "Escape") setEditingUnitId(null);
                                    }}
                                    aria-label={`Rename ${unit.name}`}
                                  />
                                  <button type="button" onClick={() => saveUnitName(unit.id)} aria-label="Save unit name"><Check size={14} /></button>
                                  <button type="button" onClick={() => setEditingUnitId(null)} aria-label="Cancel unit rename"><X size={14} /></button>
                                </div>
                              ) : (
                                <button type="button" className="ost-unit-select" onClick={() => selectUnit(unit.id)} aria-current={selected ? "true" : undefined}>
                                  <span dir="auto">{unit.name}</span>
                                  <small>{TYPE_LABELS[(unit.type || "").toLowerCase()] || unit.type}</small>
                                  <span className="ost-mobile-type"><TypeBadge type={unit.type} /></span>
                                </button>
                              )}
                            </td>
                            <td className="ost-type-column"><TypeBadge type={unit.type} /></td>
                            <td className="ost-offices-column">
                              <button type="button" className="ost-office-count" onClick={() => selectUnit(unit.id)} aria-label={`View ${officeCount} offices for ${unit.name}`}>
                                <strong>{officeCount}</strong>
                                <span>office{officeCount === 1 ? "" : "s"}</span>
                              </button>
                            </td>
                            <td className="ost-actions-column">
                              <div className="ost-row-actions">
                                <button
                                  type="button"
                                  title="Rename unit"
                                  aria-label={`Rename ${unit.name}`}
                                  onClick={() => {
                                    setEditingUnitId(unit.id);
                                    setUnitDraft(unit.name);
                                  }}
                                ><Pencil size={14} /></button>
                                <button
                                  type="button"
                                  className="is-danger"
                                  title="Delete unit"
                                  aria-label={`Delete ${unit.name}`}
                                  onClick={() => setDeleteTarget({ kind: "unit", unitId: unit.id, name: unit.name })}
                                ><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {loading && units.length === 0 && (
                    <div className="ost-empty-table">
                      <Loader2 size={24} className="animate-spin text-[var(--pa-primary)]" />
                      <strong>Loading units...</strong>
                      <span>Fetching live organizational structure from database.</span>
                    </div>
                  )}
                  {!loading && pagedUnits.length === 0 && (
                    <div className="ost-empty-table">
                      <Search size={22} />
                      <strong>No matching units</strong>
                      <span>Adjust the search or unit type filter.</span>
                    </div>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="ost-pagination" aria-label="Organization table pagination">
                    <span>{filteredUnits.length ? `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filteredUnits.length)} of ${filteredUnits.length}` : "0 results"}</span>
                    <div>
                      <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Previous organization page"><ChevronLeft size={15} /></button>
                      <strong>{page} / {totalPages}</strong>
                      <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} aria-label="Next organization page"><ChevronRight size={15} /></button>
                    </div>
                  </div>
                )}
              </section>

              <aside
                ref={officePanelRef}
                className="ost-office-panel"
                aria-labelledby="ost-offices-heading"
              >
                {selectedUnit ? (
                  <>
                    <div className="ost-office-panel__header">
                      <div className="ost-office-panel__icon"><Building2 size={19} /></div>
                      <div>
                        <TypeBadge type={selectedUnit.type} />
                        <h2 id="ost-offices-heading" dir="auto">{selectedUnit.name}</h2>
                        <p>{TYPE_LABELS[(selectedUnit.type || "").toLowerCase()] || selectedUnit.type}</p>
                      </div>
                    </div>

                    <div className="ost-office-toolbar">
                      <label>
                        <Search size={14} aria-hidden="true" />
                        <span className="sr-only">Search selected unit offices</span>
                        <input type="search" value={officeSearch} onChange={(event) => setOfficeSearch(event.target.value)} placeholder="Search offices" />
                      </label>
                      <button type="button" className="ost-secondary-button" onClick={() => setShowOfficeForm((current) => !current)} aria-expanded={showOfficeForm} disabled={saving}>
                        <Plus size={14} /> Add office
                      </button>
                    </div>

                    {showOfficeForm && (
                      <form className="ost-add-office" onSubmit={addOffice}>
                        <MapPin size={15} />
                        <input autoFocus value={newOfficeName} onChange={(event) => setNewOfficeName(event.target.value)} placeholder="Office name" aria-label="New office name" required />
                        <button type="submit" aria-label="Save office" disabled={saving}>
                          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                        </button>
                        <button type="button" onClick={() => setShowOfficeForm(false)} aria-label="Cancel adding office"><X size={15} /></button>
                      </form>
                    )}

                    <div className="ost-office-list-heading">
                      <span>Office directory</span>
                      <strong>{visibleOffices.length}</strong>
                    </div>
                    <div className="ost-office-list">
                      {pagedOffices.map((item, index) => (
                        <div className="ost-office-row" key={item.id}>
                          <span className="ost-office-index">
                            {String((officePage - 1) * OFFICE_PAGE_SIZE + index + 1).padStart(2, "0")}
                          </span>
                          {editingOfficeId === item.id ? (
                            <div className="ost-inline-edit ost-inline-edit--office">
                              <input
                                autoFocus
                                value={officeDraft}
                                onChange={(event) => setOfficeDraft(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") saveOfficeName(selectedUnit.id, item.id);
                                  if (event.key === "Escape") setEditingOfficeId(null);
                                }}
                                aria-label={`Rename ${item.name}`}
                              />
                              <button type="button" onClick={() => saveOfficeName(selectedUnit.id, item.id)} aria-label="Save office name"><Check size={14} /></button>
                              <button type="button" onClick={() => setEditingOfficeId(null)} aria-label="Cancel office rename"><X size={14} /></button>
                            </div>
                          ) : (
                            <span className="ost-office-name" dir="auto">{item.name}</span>
                          )}
                          {editingOfficeId !== item.id && (
                            <div className="ost-row-actions">
                              <button type="button" title="Rename office" aria-label={`Rename ${item.name}`} onClick={() => { setEditingOfficeId(item.id); setOfficeDraft(item.name); }}><Pencil size={13} /></button>
                              <button type="button" className="is-danger" title="Delete office" aria-label={`Delete ${item.name}`} onClick={() => setDeleteTarget({ kind: "office", unitId: selectedUnit.id, officeId: item.id, name: item.name })}><Trash2 size={13} /></button>
                            </div>
                          )}
                        </div>
                      ))}
                      {visibleOffices.length === 0 && (
                        <div className="ost-empty-offices">
                          <MapPin size={23} />
                          <strong>{officeSearch ? "No matching offices" : "No offices added"}</strong>
                          <span>{officeSearch ? "Try a different office name." : "Add the first office for this unit."}</span>
                        </div>
                      )}
                    </div>
                    {totalOfficePages > 1 && (
                      <div
                        className="ost-pagination ost-office-pagination"
                        aria-label="Office directory pagination"
                      >
                        <span>
                          {visibleOffices.length
                            ? `${(officePage - 1) * OFFICE_PAGE_SIZE + 1}-${Math.min(officePage * OFFICE_PAGE_SIZE, visibleOffices.length)} of ${visibleOffices.length}`
                            : "0 results"}
                        </span>
                        <div>
                          <button
                            type="button"
                            onClick={() => setOfficePage((current) => Math.max(1, current - 1))}
                            disabled={officePage === 1}
                            aria-label="Previous office page"
                          >
                            <ChevronLeft size={15} />
                          </button>
                          <strong>{officePage} / {totalOfficePages}</strong>
                          <button
                            type="button"
                            onClick={() =>
                              setOfficePage((current) =>
                                Math.min(totalOfficePages, current + 1),
                              )
                            }
                            disabled={officePage === totalOfficePages}
                            aria-label="Next office page"
                          >
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="ost-empty-offices"><Building2 size={24} /><strong>Select a unit</strong><span>Its offices will appear here.</span></div>
                )}
              </aside>
            </div>
          </div>
        </main>

        <footer className="ost-live-footer">
          <Building2 size={13} aria-hidden="true" />
          Live organizational structure connected to database
        </footer>
      </div>

      {deleteTarget && (
        <div className="ost-dialog-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}>
          <div className="ost-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ost-delete-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="ost-dialog__icon"><AlertTriangle size={20} /></div>
            <h2 id="ost-delete-title">Delete {deleteTarget.kind}</h2>
            <p>Are you sure you want to delete <strong dir="auto">{deleteTarget.name}</strong>?</p>
            {deleteTarget.kind === "unit" && <span>All associated sub-offices will also be removed.</span>}
            <div className="ost-dialog__actions">
              <button type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="is-danger" onClick={confirmDelete} disabled={saving}>
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
