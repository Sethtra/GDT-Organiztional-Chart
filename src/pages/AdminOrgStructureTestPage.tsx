import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
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
import { ToastContainer, ToastMessage } from "../components/ui/Toast";
import { cn } from "../lib/utils";
import { OrgUnit, useOrgStructure } from "../hooks/useOrgStructure";
import { supabase } from "../supabaseClient";
import "./AdminDashboardTestPage.css";
import "./AdminOrgStructureTestPage.css";

const PAGE_SIZE = 7;
const OFFICE_PAGE_SIZE = 7;

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
  .max(200, "Name must be 200 characters or fewer.")
  .refine((val) => !/\d/.test(val), {
    message: "Name cannot contain numbers.",
  });

const OrganizationNameEnSchema = z
  .string()
  .trim()
  .min(1, "English name is required.")
  .max(200, "English name must be 200 characters or fewer.")
  .refine((val) => !/\d/.test(val), {
    message: "English name cannot contain numbers.",
  });

const OrganizationCodeSchema = z
  .string()
  .trim()
  .min(1, "Shortcut name is required.")
  .max(20, "Shortcut name must be 20 characters or fewer.")
  .refine((val) => !/\d/.test(val), {
    message: "Shortcut name cannot contain numbers.",
  });

type UnitType = z.infer<typeof UnitTypeSchema>;
type UnitFilter = "all" | UnitType;

interface DeleteTarget {
  kind: "unit" | "office";
  unitId: string;
  officeId?: string;
  name: string;
}

interface UnitModalState {
  mode: "create" | "edit";
  unitId?: string;
  name: string;
  nameEn: string;
  code: string;
  type: UnitType;
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
  const [unitModal, setUnitModal] = useState<UnitModalState | null>(null);
  const [unitErrors, setUnitErrors] = useState<{
    name?: string | undefined;
    nameEn?: string | undefined;
    code?: string | undefined;
  }>({});
  const [showOfficeForm, setShowOfficeForm] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState("");
  const [newOfficeError, setNewOfficeError] = useState<string | null>(null);
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [officeDraft, setOfficeDraft] = useState("");
  const [editingOfficeError, setEditingOfficeError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const officePanelRef = useRef<HTMLElement>(null);

  const showToast = (type: ToastMessage["type"], message: string) => {
    const id = "toast_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    setToasts((curr) => [...curr, { id, type, message }]);
  };

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
        (unit.name_en && unit.name_en.toLocaleLowerCase().includes(query)) ||
        (unit.nameEn && unit.nameEn.toLocaleLowerCase().includes(query)) ||
        (unit.code && unit.code.toLocaleLowerCase().includes(query)) ||
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

  const openCreateUnitModal = () => {
    setUnitErrors({});
    setUnitModal({
      mode: "create",
      name: "",
      nameEn: "",
      code: "",
      type: "department",
    });
  };

  const openEditUnitModal = (unit: OrgUnit) => {
    setUnitErrors({});
    setUnitModal({
      mode: "edit",
      unitId: unit.id,
      name: unit.name,
      nameEn: unit.name_en || unit.nameEn || "",
      code: unit.code || "",
      type: (UnitTypeSchema.safeParse(unit.type).success ? unit.type : "department") as UnitType,
    });
  };

  const handleUnitModalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!unitModal) return;

    const input = z
      .object({
        name: OrganizationNameSchema,
        nameEn: OrganizationNameEnSchema,
        code: OrganizationCodeSchema,
        type: UnitTypeSchema,
      })
      .safeParse({
        name: unitModal.name,
        nameEn: unitModal.nameEn,
        code: unitModal.code.trim().toUpperCase(),
        type: unitModal.type,
      });

    if (!input.success) {
      const fieldErrors: { name?: string; nameEn?: string; code?: string } = {};
      input.error.issues.forEach((issue) => {
        const field = issue.path[0] as "name" | "nameEn" | "code";
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setUnitErrors(fieldErrors);
      return;
    }

    setUnitErrors({});
    setSaving(true);
    try {
      if (unitModal.mode === "create") {
        const maxSort = (units || []).reduce(
          (max, u) => Math.max(max, u.sort_order || 0),
          0,
        );

        const payload = {
          name: input.data.name,
          name_en: input.data.nameEn,
          code: input.data.code,
          type: input.data.type,
          sort_order: maxSort + 1,
        };

        const res = await supabase
          .from("org_units")
          .insert(payload)
          .select("id")
          .single();

        if (res.error) {
          // Fallback for legacy DB schema before name_en and code columns
          const legacyRes = await supabase
            .from("org_units")
            .insert({
              name: input.data.name,
              type: input.data.type,
              sort_order: maxSort + 1,
            })
            .select("id")
            .single();
          if (legacyRes.error) throw legacyRes.error;
          const insertedLegacy = legacyRes.data as { id?: string } | null;
          if (insertedLegacy?.id) setSelectedUnitId(String(insertedLegacy.id));
        } else {
          const inserted = res.data as { id?: string } | null;
          if (inserted?.id) setSelectedUnitId(String(inserted.id));
        }
        showToast("success", `Created unit "${input.data.name}" successfully.`);
      } else {
        // Edit mode
        const updatePayload = {
          name: input.data.name,
          name_en: input.data.nameEn,
          code: input.data.code,
          type: input.data.type,
        };

        const res = await supabase
          .from("org_units")
          .update(updatePayload)
          .eq("id", unitModal.unitId!)
          .select("id")
          .maybeSingle();

        if (res.error) {
          const legacyRes = await supabase
            .from("org_units")
            .update({ name: input.data.name, type: input.data.type })
            .eq("id", unitModal.unitId!)
            .select("id")
            .maybeSingle();
          if (legacyRes.error) throw legacyRes.error;
        }
        showToast("success", `Updated "${input.data.name}" successfully.`);
      }

      setUnitModal(null);
      await refetch();
    } catch (err) {
      console.error("Failed to save unit:", err);
      showToast("error", err instanceof Error ? err.message : "Failed to save organizational unit.");
    } finally {
      setSaving(false);
    }
  };

  const addOffice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUnit) return;
    const input = OrganizationNameSchema.safeParse(newOfficeName);
    if (!input.success) {
      setNewOfficeError(input.error.issues[0]?.message ?? "Enter a valid office name.");
      return;
    }

    setNewOfficeError(null);
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
      showToast("success", `Added office "${input.data}" to ${selectedUnit.name}.`);
      await refetch();
      setOfficePage(Math.ceil(((selectedUnit.offices?.length || 0) + 1) / OFFICE_PAGE_SIZE));
    } catch (err) {
      console.error("Failed to add office:", err);
      showToast("error", err instanceof Error ? err.message : "Failed to add office.");
    } finally {
      setSaving(false);
    }
  };

  const saveOfficeName = async (_unitId: string, officeId: string) => {
    const input = OrganizationNameSchema.safeParse(officeDraft);
    if (!input.success) {
      setEditingOfficeError(input.error.issues[0]?.message ?? "Enter a valid office name.");
      return;
    }

    setEditingOfficeError(null);
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
      showToast("success", "Office renamed successfully.");
      await refetch();
    } catch (err) {
      console.error("Failed to rename office:", err);
      showToast("error", err instanceof Error ? err.message : "Failed to rename office.");
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
        showToast("success", `Deleted unit "${deleteTarget.name}".`);
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
        showToast("success", `Deleted office "${deleteTarget.name}".`);
        await refetch();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      showToast("error", err instanceof Error ? err.message : "Failed to delete item.");
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
                  onClick={openCreateUnitModal}
                  aria-haspopup="dialog"
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
                        <th scope="col" className="ost-index-column">N.o</th>
                        <th scope="col">Unit</th>
                        <th scope="col" className="ost-type-column">Type</th>
                        <th scope="col" className="ost-offices-column">Offices</th>
                        <th scope="col" className="ost-actions-column"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUnits.map((unit, index) => {
                        const selected = unit.id === selectedUnitId;
                        const officeCount = unit.offices?.length || 0;
                        const englishLabel = unit.name_en || unit.nameEn || "";
                        const shortcutLabel = unit.code ? ` (${unit.code})` : "";
                        return (
                          <tr key={unit.id} className={cn(selected && "is-selected")}>
                            <td className="ost-index-column">
                              <span className="ost-unit-index">
                                {String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="ost-unit-select"
                                onClick={() => selectUnit(unit.id)}
                                aria-current={selected ? "true" : undefined}
                              >
                                <span dir="auto">{unit.name}</span>
                                <small>{englishLabel ? `${englishLabel}${shortcutLabel}` : (unit.code ? unit.code : "")}</small>
                                <span className="ost-mobile-type"><TypeBadge type={unit.type} /></span>
                              </button>
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
                                  title="Edit unit"
                                  aria-label={`Edit ${unit.name}`}
                                  onClick={() => openEditUnitModal(unit)}
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
                        <h2 id="ost-offices-heading" dir="auto">{selectedUnit.name}</h2>
                        <p>{selectedUnit.name_en || selectedUnit.nameEn || TYPE_LABELS[(selectedUnit.type || "").toLowerCase()] || selectedUnit.type}</p>
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
                      <div className="flex flex-col gap-1 mb-2">
                        <form className="ost-add-office" onSubmit={addOffice}>
                          <MapPin size={15} />
                          <input
                            autoFocus
                            value={newOfficeName}
                            onChange={(event) => {
                              setNewOfficeName(event.target.value);
                              if (newOfficeError) setNewOfficeError(null);
                            }}
                            placeholder="Office name"
                            aria-label="New office name"
                            className={newOfficeError ? "is-invalid" : ""}
                            required
                          />
                          <button type="submit" aria-label="Save office" disabled={saving}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowOfficeForm(false);
                              setNewOfficeError(null);
                            }}
                            aria-label="Cancel adding office"
                          >
                            <X size={15} />
                          </button>
                        </form>
                        {newOfficeError && (
                          <span className="ost-form-error px-1">
                            <AlertCircle size={12} /> {newOfficeError}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="ost-office-list-heading">
                      <div className="ost-office-heading-left">
                        <span className="ost-office-index-label">N.o</span>
                        <span>Office directory</span>
                      </div>
                      <strong>{visibleOffices.length}</strong>
                    </div>
                    <div className="ost-office-list">
                      {pagedOffices.map((item, index) => (
                        <div className="ost-office-row" key={item.id}>
                          <span className="ost-office-index">
                            {String((officePage - 1) * OFFICE_PAGE_SIZE + index + 1).padStart(2, "0")}
                          </span>
                          {editingOfficeId === item.id ? (
                            <div className="flex flex-col flex-1 gap-1">
                              <div className="ost-inline-edit ost-inline-edit--office">
                                <input
                                  autoFocus
                                  value={officeDraft}
                                  onChange={(event) => {
                                    setOfficeDraft(event.target.value);
                                    if (editingOfficeError) setEditingOfficeError(null);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") saveOfficeName(selectedUnit.id, item.id);
                                    if (event.key === "Escape") {
                                      setEditingOfficeId(null);
                                      setEditingOfficeError(null);
                                    }
                                  }}
                                  aria-label={`Rename ${item.name}`}
                                  className={editingOfficeError ? "is-invalid" : ""}
                                />
                                <button type="button" onClick={() => saveOfficeName(selectedUnit.id, item.id)} aria-label="Save office name"><Check size={14} /></button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingOfficeId(null);
                                    setEditingOfficeError(null);
                                  }}
                                  aria-label="Cancel office rename"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              {editingOfficeError && (
                                <span className="ost-form-error">
                                  <AlertCircle size={12} /> {editingOfficeError}
                                </span>
                              )}
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
                          disabled={officePage <= 1}
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
                          disabled={officePage >= totalOfficePages}
                          aria-label="Next office page"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
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

      {unitModal && (
        <div
          className="ost-dialog-backdrop"
          role="presentation"
          onMouseDown={() => !saving && setUnitModal(null)}
        >
          <div
            className="ost-dialog ost-dialog--unit-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ost-unit-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form onSubmit={handleUnitModalSubmit}>
              <div className="ost-dialog__header">
                <div className="ost-dialog__header-left">
                  <div className="ost-dialog__icon ost-dialog__icon--primary">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 id="ost-unit-modal-title">
                      {unitModal.mode === "create" ? "New organizational unit" : "Edit organizational unit"}
                    </h2>
                    <p className="ost-dialog__subtitle">
                      {unitModal.mode === "create" ? "Add a new department or branch to the structure" : "Update department and translation details"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ost-dialog__close"
                  onClick={() => setUnitModal(null)}
                  disabled={saving}
                  aria-label="Close dialog"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="ost-dialog__form-body">
                <div className={`ost-form-group ${unitErrors.name ? "has-error" : ""}`}>
                  <label htmlFor="modal-unit-name">
                    Unit name (Khmer) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modal-unit-name"
                    autoFocus
                    value={unitModal.name}
                    onChange={(event) => {
                      const val = event.target.value;
                      setUnitModal((curr) => (curr ? { ...curr, name: val } : null));
                      if (unitErrors.name) {
                        setUnitErrors((curr) => {
                          const next = { ...curr };
                          delete next.name;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក"
                    className={unitErrors.name ? "is-invalid" : ""}
                    required
                  />
                  {unitErrors.name ? (
                    <span className="ost-form-error">
                      <AlertCircle size={12} /> {unitErrors.name}
                    </span>
                  ) : (
                    <span className="ost-form-hint">Numbers are not allowed in the name.</span>
                  )}
                </div>

                <div className={`ost-form-group ${unitErrors.nameEn ? "has-error" : ""}`}>
                  <label htmlFor="modal-unit-name-en">
                    English name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modal-unit-name-en"
                    value={unitModal.nameEn}
                    onChange={(event) => {
                      const val = event.target.value;
                      setUnitModal((curr) => (curr ? { ...curr, nameEn: val } : null));
                      if (unitErrors.nameEn) {
                        setUnitErrors((curr) => {
                          const next = { ...curr };
                          delete next.nameEn;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. Department of Finance and Personnel"
                    className={unitErrors.nameEn ? "is-invalid" : ""}
                    required
                  />
                  {unitErrors.nameEn ? (
                    <span className="ost-form-error">
                      <AlertCircle size={12} /> {unitErrors.nameEn}
                    </span>
                  ) : (
                    <span className="ost-form-hint">Numbers are not allowed in the name.</span>
                  )}
                </div>

                <div className="ost-form-row">
                  <div className={`ost-form-group ${unitErrors.code ? "has-error" : ""}`}>
                    <label htmlFor="modal-unit-code">
                      Shortcut name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="modal-unit-code"
                      value={unitModal.code}
                      onChange={(event) => {
                        const val = event.target.value.toUpperCase();
                        setUnitModal((curr) => (curr ? { ...curr, code: val } : null));
                        if (unitErrors.code) {
                          setUnitErrors((curr) => {
                            const next = { ...curr };
                            delete next.code;
                            return next;
                          });
                        }
                      }}
                      placeholder="e.g. DFP"
                      className={`font-mono uppercase font-bold ${unitErrors.code ? "is-invalid" : ""}`}
                      maxLength={20}
                      required
                    />
                    {unitErrors.code && (
                      <span className="ost-form-error">
                        <AlertCircle size={12} /> {unitErrors.code}
                      </span>
                    )}
                  </div>

                  <div className="ost-form-group">
                    <label htmlFor="modal-unit-type">Unit type</label>
                    <select
                      id="modal-unit-type"
                      value={unitModal.type}
                      onChange={(event) => {
                        const parsedType = UnitTypeSchema.safeParse(event.target.value);
                        if (parsedType.success) {
                          setUnitModal((curr) =>
                            curr ? { ...curr, type: parsedType.data } : null
                          );
                        }
                      }}
                    >
                      {Object.entries(TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="ost-dialog__actions">
                <button
                  type="button"
                  onClick={() => setUnitModal(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ost-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      {unitModal.mode === "create" ? "Add unit" : "Save changes"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((curr) => curr.filter((t) => t.id !== id))}
      />
    </div>
  );
}
