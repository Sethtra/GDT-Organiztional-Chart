import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Filter,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Star,
  UsersRound,
  X,
} from "lucide-react";

import AdminFooter from "../components/admin/AdminFooter";
import AdminHeader from "../components/admin/AdminHeader";
import AdminSidebar from "../components/admin/AdminSidebar";
import type {
  JobTitle,
  PositionScope,
  ProficiencyLevel,
  SkillCatalogItem,
} from "../contracts/hr";
import {
  listJobArchitecture,
  saveJobTitle,
  setJobTitleRequirement,
} from "../services/jobArchitectureService";
import { listSkillCatalog, saveSkillCatalogItem } from "../services/skillService";
import { cn } from "../lib/utils";
import "./AdminDashboardTestPage.css";

function StatusBadge({
  children,
  tone = "neutral",
  dot = true,
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "info" | "neutral" | "danger";
  dot?: boolean;
}) {
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

export default function JobArchitecturePage() {
  const [titles, setTitles] = useState<JobTitle[]>([]);
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");

  // New Title Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const rankOrder = 100;
  const [scope, setScope] = useState<PositionScope>("individual");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // New Skill Catalog Modal state
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const newSkillInputRef = useRef<HTMLInputElement>(null);

  // Skill Requirement state
  const [requirementSkillId, setRequirementSkillId] = useState("");
  const [minimumLevel, setMinimumLevel] = useState<ProficiencyLevel>(3);

  useEffect(() => {
    if (showAddForm) {
      nameInputRef.current?.focus();
    }
  }, [showAddForm]);

  useEffect(() => {
    if (showNewSkillModal) {
      newSkillInputRef.current?.focus();
    }
  }, [showNewSkillModal]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextTitles, nextSkills] = await Promise.all([
        listJobArchitecture(),
        listSkillCatalog(),
      ]);
      setTitles(nextTitles);
      setSkills(nextSkills);
      setSelectedId((current) => current || nextTitles[0]?.id || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load job architecture.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => titles.find((title) => title.id === selectedId) ?? null,
    [selectedId, titles],
  );

  const filteredTitles = useMemo(() => {
    return titles.filter((t) => {
      if (scopeFilter !== "all" && t.positionScope !== scopeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchKhmer = t.name.toLowerCase().includes(q);
        const matchEn = t.nameEn?.toLowerCase().includes(q) ?? false;
        const matchCode = t.code?.toLowerCase().includes(q) ?? false;
        return matchKhmer || matchEn || matchCode;
      }
      return true;
    });
  }, [titles, scopeFilter, search]);

  const totalRequirementsCount = useMemo(() => {
    return titles.reduce((sum, t) => sum + (t.requirements?.length || 0), 0);
  }, [titles]);

  const leadershipCount = useMemo(() => {
    return titles.filter(
      (t) =>
        t.positionScope === "office" ||
        t.positionScope === "department" ||
        t.positionScope === "organization",
    ).length;
  }, [titles]);

  const handleAddTitle = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const id = await saveJobTitle({
        name,
        nameEn,
        code,
        rankOrder,
        positionScope: scope,
      });
      setName("");
      setNameEn("");
      setCode("");
      setShowAddForm(false);
      await load();
      setSelectedId(id);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the job title.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCatalogSkill = async () => {
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const newSkillId = await saveSkillCatalogItem({
        name: trimmed,
        description: newSkillDesc.trim() || null,
        isActive: true,
      });
      setNewSkillName("");
      setNewSkillDesc("");
      setShowNewSkillModal(false);
      await load();
      setRequirementSkillId(newSkillId);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to add new skill to catalog.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRequirement = async () => {
    if (!selected || !requirementSkillId) return;
    setSaving(true);
    setError(null);
    try {
      await setJobTitleRequirement({
        jobTitleId: selected.id,
        skillId: requirementSkillId,
        minimumProficiency: minimumLevel,
      });
      setRequirementSkillId("");
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the requirement.",
      );
    } finally {
      setSaving(false);
    }
  };

  const getScopeBadgeTone = (scopeVal: string) => {
    if (scopeVal === "organization") return "warning";
    if (scopeVal === "department") return "info";
    if (scopeVal === "office") return "success";
    return "neutral";
  };

  const getScopeDotClass = (scopeVal: string) => {
    if (scopeVal === "organization") return "bg-[var(--pa-gold)]";
    if (scopeVal === "department") return "bg-[var(--pa-info)]";
    if (scopeVal === "office") return "bg-[var(--pa-primary)]";
    return "bg-[var(--pa-muted)]";
  };

  const getScopeLabel = (scopeVal: string) => {
    if (scopeVal === "organization") return "Organization";
    if (scopeVal === "department") return "Department";
    if (scopeVal === "office") return "Office";
    return "Individual";
  };

  return (
    <div className="admin-dashboard-test flex h-screen overflow-hidden bg-[var(--pa-canvas)]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[var(--pa-sidebar-border)] bg-[var(--pa-sidebar)] lg:flex h-full">
        <AdminSidebar currentTab="jobs" />
      </aside>

      {/* Mobile Navigation Drawer */}
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
            <AdminSidebar
              currentTab="jobs"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex flex-1 flex-col h-full overflow-hidden min-w-0">
        {/* Sticky Compact Header */}
        <AdminHeader
          mobileNavOpen={mobileNavOpen}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search job titles or requirements..."
          searchLabel="Search job titles"
          saving={saving}
        />

        {/* Scrollable Center Content Area */}
        <main className="pa-scrollbar flex-1 overflow-y-auto mx-auto w-full max-w-[1540px] px-4 pb-12 pt-6 sm:px-7 lg:px-10">
          {/* Page Title Header */}
          <div className="mb-3.5 flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
            <div>
              <div className="mb-0.5 flex flex-wrap items-center gap-2">
                <StatusBadge tone="success">Active Catalog</StatusBadge>
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--pa-faint)]">
                  Position Rules & Required Skills
                </span>
              </div>
              <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-[var(--pa-text)] sm:text-[22px]">
                Job Architecture
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNewSkillModal(true)}
                className="pa-focus-ring inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] px-3 text-[11px] font-extrabold text-[var(--pa-primary)] transition-colors hover:bg-[var(--pa-primary)] hover:text-white"
              >
                <Sparkles size={13} aria-hidden="true" />
                Add Skill to Catalog
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="pa-focus-ring inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[var(--pa-primary)] px-3 text-[11px] font-extrabold text-white transition-colors hover:bg-[var(--pa-primary-hover)]"
              >
                <Plus size={13} strokeWidth={2.2} aria-hidden="true" />
                Add Job Title
              </button>
            </div>
          </div>

          {/* Compact Top KPI Metrics Bar */}
          <section
            className="mb-3.5 grid gap-px overflow-hidden rounded-[10px] border border-[var(--pa-border)] bg-[var(--pa-border)] shadow-2xs sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Job architecture statistics"
          >
            {[
              {
                label: "Job Titles",
                value: titles.length,
                detail: "Active position titles",
                tone: "success",
                icon: BriefcaseBusiness,
              },
              {
                label: "Mapped Requirements",
                value: totalRequirementsCount,
                detail: "Skill rules configured",
                tone: "info",
                icon: Sparkles,
              },
              {
                label: "Leadership Roles",
                value: leadershipCount,
                detail: "Executive & manager scopes",
                tone: "warning",
                icon: UsersRound,
              },
              {
                label: "Skill Catalog",
                value: skills.length,
                detail: "Available competencies in Supabase",
                tone: "neutral",
                icon: CheckCircle2,
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.label} className="bg-white p-2.5 sm:p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex size-6.5 items-center justify-center rounded-md border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
                      <Icon size={13} strokeWidth={1.9} aria-hidden="true" />
                    </div>
                    <StatusBadge tone={stat.tone as any} dot={false}>
                      Active
                    </StatusBadge>
                  </div>
                  <div className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-[var(--pa-muted)]">
                    {stat.label}
                  </div>
                  <div className="pa-tabular mt-0.5 text-[20px] font-extrabold leading-none tracking-[-0.03em] text-[var(--pa-text)]">
                    {loading ? "—" : stat.value}
                  </div>
                </article>
              );
            })}
          </section>

          {/* New Job Title Inline Form */}
          {showAddForm && (
            <div className="mb-3.5 rounded-[10px] border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] p-3.5 shadow-2xs">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-[12px] font-extrabold text-[var(--pa-primary)] flex items-center gap-1.5">
                  <Plus size={14} /> Create New Job Title
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-[var(--pa-muted)] hover:text-[var(--pa-text)]"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--pa-muted)]">
                    Khmer Title *
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. ប្រធាននាយកដ្ឋាន"
                    dir="auto"
                    className="pa-focus-ring h-8 w-full rounded-[6px] border border-[var(--pa-border)] bg-white px-2.5 text-[11.5px] font-medium text-[var(--pa-text)] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--pa-muted)]">
                    English Title
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Department Director"
                    className="pa-focus-ring h-8 w-full rounded-[6px] border border-[var(--pa-border)] bg-white px-2.5 text-[11.5px] font-medium text-[var(--pa-text)] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--pa-muted)]">
                    Position Scope
                  </label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as PositionScope)}
                    className="pa-focus-ring h-8 w-full rounded-[6px] border border-[var(--pa-border)] bg-white px-2 text-[11px] font-bold text-[var(--pa-text)] outline-none"
                  >
                    <option value="individual">Individual Staff</option>
                    <option value="office">Office Leadership</option>
                    <option value="department">Department Leadership</option>
                    <option value="organization">Organization Leadership</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void handleAddTitle()}
                    disabled={!name.trim() || saving}
                    className="pa-focus-ring inline-flex h-8 items-center gap-1 rounded-[6px] bg-[var(--pa-primary)] px-3 text-[11px] font-extrabold text-white transition-colors hover:bg-[var(--pa-primary-hover)] disabled:opacity-50 shrink-0"
                  >
                    {saving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div className="mb-3.5 flex items-center gap-2 rounded-lg border border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] p-3 text-[11px] font-semibold text-[var(--pa-danger)]">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Master-Detail Split Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            {/* Left Column: Job Titles List (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-2.5">
              <div className="flex flex-1 flex-col rounded-[10px] border border-[var(--pa-border)] bg-white p-3 shadow-2xs">
                {/* Filter Toolbar */}
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--pa-border)] pb-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[var(--pa-text)]">
                    <Filter size={13} className="text-[var(--pa-primary)]" />
                    <span>Job Titles ({filteredTitles.length})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { id: "all", label: "All" },
                      { id: "individual", label: "Staff" },
                      { id: "office", label: "Office" },
                      { id: "department", label: "Dept" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setScopeFilter(tab.id)}
                        className={cn(
                          "pa-focus-ring h-6 rounded px-1.5 text-[9.5px] font-extrabold transition-colors",
                          scopeFilter === tab.id
                            ? "bg-[var(--pa-primary)] text-white"
                            : "text-[var(--pa-muted)] hover:bg-[var(--pa-surface-muted)]",
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Job Titles List */}
                {loading ? (
                  <div className="flex flex-1 min-h-[160px] flex-col items-center justify-center p-4 text-center">
                    <Loader2 size={22} className="animate-spin text-[var(--pa-primary)]" />
                    <span className="mt-2 text-[11px] font-extrabold text-[var(--pa-text)]">
                      Loading titles...
                    </span>
                  </div>
                ) : filteredTitles.length === 0 ? (
                  <div className="flex flex-1 min-h-[160px] flex-col items-center justify-center p-4 text-center">
                    <BriefcaseBusiness size={24} className="text-[var(--pa-faint)]" />
                    <span className="mt-1.5 text-[11.5px] font-extrabold text-[var(--pa-text)]">
                      No matching job titles
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pa-scrollbar pr-1 py-1">
                    {filteredTitles.map((title) => {
                      const isSelected = selectedId === title.id;
                      const reqCount = title.requirements?.length || 0;

                      return (
                        <button
                          key={title.id}
                          type="button"
                          onClick={() => setSelectedId(title.id)}
                          className={cn(
                            "w-full text-left rounded-lg border px-3 py-2 transition-colors duration-150 cursor-pointer",
                            isSelected
                              ? "border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)]/40"
                              : "border-[var(--pa-border)] bg-white hover:border-[var(--pa-border-strong)] hover:bg-[var(--pa-canvas)]/60",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "size-1.5 shrink-0 rounded-full",
                                    getScopeDotClass(title.positionScope),
                                  )}
                                  aria-hidden="true"
                                />
                                <span
                                  dir="auto"
                                  className="truncate text-[12.5px] font-extrabold text-[var(--pa-text)]"
                                >
                                  {title.name}
                                </span>
                              </div>
                              <div className="mt-0.5 truncate pl-3 text-[10px] font-semibold text-[var(--pa-muted)]">
                                {title.nameEn ? `${title.nameEn} · ` : ""}
                                {getScopeLabel(title.positionScope)}
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] font-bold text-[var(--pa-faint)]">
                              {reqCount} req{reqCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Selected Job Title Details & Skill Requirements (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {selected ? (
                <div className="flex-1 rounded-[10px] border border-[var(--pa-border)] bg-white p-4 shadow-2xs">
                  {/* Selected Title Header */}
                  <div className="mb-4 border-b border-[var(--pa-border)] pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]">
                          <BriefcaseBusiness size={15} />
                        </span>
                        <h2 dir="auto" className="text-[16px] font-extrabold text-[var(--pa-text)]">
                          {selected.name}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge tone={getScopeBadgeTone(selected.positionScope) as any}>
                          {selected.positionScope} scope
                        </StatusBadge>
                      </div>
                    </div>
                    {selected.nameEn && (
                      <p className="text-[11.5px] font-semibold text-[var(--pa-muted)] pl-9">
                        {selected.nameEn} {selected.code && `· Code: ${selected.code}`}
                      </p>
                    )}
                  </div>

                  {/* Skill Requirements Section */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-[12px] font-extrabold text-[var(--pa-text)] flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[var(--pa-primary)]" />
                        Required Skill Competencies ({selected.requirements?.length || 0})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowNewSkillModal(true)}
                        className="text-[10.5px] font-bold text-[var(--pa-primary)] hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> Add new skill to database catalog
                      </button>
                    </div>

                    {/* Add Requirement Bar */}
                    <div className="mb-3.5 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)]/40 p-2.5">
                      <select
                        value={requirementSkillId}
                        onChange={(e) => setRequirementSkillId(e.target.value)}
                        className="pa-focus-ring h-8 flex-1 min-w-[180px] rounded-md border border-[var(--pa-border)] bg-white px-2.5 text-[11.5px] font-semibold text-[var(--pa-text)] outline-none"
                      >
                        <option value="">Select skill from catalog...</option>
                        {skills
                          .filter((skill) => skill.isActive)
                          .map((skill) => (
                            <option key={skill.id} value={skill.id}>
                              {skill.name}
                            </option>
                          ))}
                      </select>

                      <select
                        value={minimumLevel}
                        onChange={(e) => setMinimumLevel(Number(e.target.value) as ProficiencyLevel)}
                        className="pa-focus-ring h-8 rounded-md border border-[var(--pa-border)] bg-white px-2.5 text-[11px] font-bold text-[var(--pa-text)] outline-none"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Min Level {lvl}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => void handleRequirement()}
                        disabled={!requirementSkillId || saving}
                        className="pa-focus-ring inline-flex h-8 items-center gap-1 rounded-md bg-[var(--pa-primary)] px-3 text-[11px] font-extrabold text-white transition-colors hover:bg-[var(--pa-primary-hover)] disabled:opacity-50 shrink-0"
                      >
                        {saving ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Plus size={13} />
                        )}
                        Add Skill
                      </button>
                    </div>

                    {/* Requirements List */}
                    {selected.requirements.length === 0 ? (
                      <div className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--pa-border-strong)] bg-[var(--pa-canvas)]/40 p-5 text-center">
                        <Sparkles size={22} className="text-[var(--pa-faint)]" />
                        <span className="mt-1.5 text-[11.5px] font-extrabold text-[var(--pa-text)]">
                          No skill requirements mapped yet
                        </span>
                        <p className="mt-0.5 text-[10.5px] text-[var(--pa-muted)]">
                          Select a skill above and specify minimum required proficiency level.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {selected.requirements.map((req) => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--pa-border)] bg-white p-3 shadow-2xs transition-colors hover:border-[var(--pa-border-strong)]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded bg-[var(--pa-primary-soft)] text-[var(--pa-primary)] text-[10px] font-bold">
                                L{req.minimumProficiency}
                              </span>
                              <div>
                                <div className="text-[12.5px] font-extrabold text-[var(--pa-text)] truncate">
                                  {req.skill.name}
                                </div>
                                <div className="text-[10px] font-medium text-[var(--pa-faint)]">
                                  Minimum Required Proficiency: Level {req.minimumProficiency} of 5
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={12}
                                  className={cn(
                                    star <= req.minimumProficiency
                                      ? "fill-[var(--pa-gold)] text-[var(--pa-gold)]"
                                      : "text-[var(--pa-border-strong)]",
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 min-h-[300px] flex-col items-center justify-center rounded-[10px] border border-[var(--pa-border)] bg-white p-6 text-center shadow-2xs">
                  <BriefcaseBusiness size={30} className="text-[var(--pa-faint)]" />
                  <div className="mt-2 text-[13px] font-extrabold text-[var(--pa-text)]">
                    Select a job title from the left
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--pa-muted)]">
                    Click any title in the list to inspect or configure its required competencies.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Synchronized Bottom Footer */}
        <AdminFooter />
      </div>

      {/* Add New Skill Catalog Item Modal */}
      {showNewSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081a12]/60 p-4 backdrop-blur-[2px]">
          <div
            className="w-full max-w-md rounded-xl border border-[var(--pa-border)] bg-white p-5 shadow-xl motion-safe:animate-in motion-safe:fade-in-50 motion-safe:zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-[var(--pa-border)] pb-2.5">
              <div className="flex items-center gap-2 text-[13.5px] font-extrabold text-[var(--pa-text)]">
                <Sparkles size={16} className="text-[var(--pa-primary)]" />
                Add New Skill to Database Catalog
              </div>
              <button
                type="button"
                onClick={() => setShowNewSkillModal(false)}
                className="text-[var(--pa-muted)] hover:text-[var(--pa-text)]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--pa-muted)]">
                  Skill Name *
                </label>
                <input
                  ref={newSkillInputRef}
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Tax Inspection & Audit"
                  dir="auto"
                  className="pa-focus-ring h-8.5 w-full rounded-md border border-[var(--pa-border)] bg-white px-3 text-[12px] font-semibold text-[var(--pa-text)] outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--pa-muted)]">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newSkillDesc}
                  onChange={(e) => setNewSkillDesc(e.target.value)}
                  placeholder="Enter competency description..."
                  className="pa-focus-ring w-full rounded-md border border-[var(--pa-border)] bg-white p-2.5 text-[11.5px] font-medium text-[var(--pa-text)] outline-none resize-none"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--pa-border)] pt-3">
              <button
                type="button"
                onClick={() => setShowNewSkillModal(false)}
                className="pa-focus-ring h-8 rounded-lg border border-[var(--pa-border)] bg-white px-3 text-[11px] font-bold text-[var(--pa-muted)] hover:bg-[var(--pa-surface-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateCatalogSkill()}
                disabled={!newSkillName.trim() || saving}
                className="pa-focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--pa-primary)] px-3.5 text-[11px] font-extrabold text-white transition-colors hover:bg-[var(--pa-primary-hover)] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                Save Skill to Catalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
