import { useEffect, useMemo, useState } from "react";
import { Award, Loader2, Plus, Save } from "lucide-react";

import type {
  HrStaffDirectoryRecord,
  ProficiencyLevel,
  SkillCatalogItem,
  StaffProfile,
} from "../../contracts/hr";
import { loadStaffProfile } from "../../services/staffProfileService";
import {
  listSkillCatalog,
  saveSkillCatalogItem,
  setStaffSkill,
} from "../../services/skillService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "../ui/dialog";

interface StaffSkillsDialogProps {
  open: boolean;
  staff: HrStaffDirectoryRecord | null;
  onOpenChange: (open: boolean) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const PROFICIENCY_LABELS: Record<ProficiencyLevel, { label: string; color: string }> = {
  1: { label: "1 · Basic awareness", color: "border-slate-500/30 bg-slate-500/10 text-slate-300" },
  2: { label: "2 · Working guidance", color: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  3: { label: "3 · Proficient", color: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
  4: { label: "4 · Advanced", color: "border-blue-500/30 bg-blue-500/10 text-blue-300" },
  5: { label: "5 · Expert", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
};

export default function StaffSkillsDialog({
  open,
  staff,
  onOpenChange,
}: StaffSkillsDialogProps) {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [activeTab, setActiveTab] = useState<"assign" | "create">("assign");
  const [skillId, setSkillId] = useState("");
  const [proficiency, setProficiency] = useState<ProficiencyLevel>(3);
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");

  const reload = async (staffId: string) => {
    const [nextProfile, nextCatalog] = await Promise.all([
      loadStaffProfile(staffId),
      listSkillCatalog(),
    ]);
    setProfile(nextProfile);
    setCatalog(nextCatalog);
  };

  useEffect(() => {
    if (!open || !staff) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveTab("assign");
    void Promise.all([loadStaffProfile(staff.id), listSkillCatalog()])
      .then(([nextProfile, nextCatalog]) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setCatalog(nextCatalog);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load skills.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, staff]);

  const activeSkills = useMemo(
    () => profile?.skills.filter((entry) => entry.effectiveTo === null) ?? [],
    [profile],
  );

  const handleSaveProficiency = async () => {
    if (!staff || !skillId) return;
    setSaving(true);
    setError(null);
    try {
      await setStaffSkill({
        staffId: staff.id,
        skillId,
        proficiency,
        effectiveDate,
        notes,
      });
      await reload(staff.id);
      setSkillId("");
      setNotes("");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save proficiency.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSkill = async () => {
    if (!staff || !newSkillName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const createdId = await saveSkillCatalogItem({
        name: newSkillName,
        description: newSkillDescription,
      });
      await reload(staff.id);
      setSkillId(createdId);
      setNewSkillName("");
      setNewSkillDescription("");
      setActiveTab("assign");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to create the skill.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border border-border/80 bg-background shadow-xl">
        {/* Header */}
        <div className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Award className="size-4 text-primary" />
            Officer Skills · {staff?.name}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs text-muted-foreground">
            Manage skills and proficiency levels (1–5). Changes update officer record history.
          </DialogDescription>
        </div>

        <div className="grid max-h-[calc(100vh-12rem)] gap-5 overflow-y-auto p-6">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-36 items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading skills…
            </div>
          ) : (
            <>
              {/* ── Active Skills List ────────────────────────── */}
              <section className="grid gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Current Skills ({activeSkills.length})
                  </h3>
                </div>

                {activeSkills.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/60 bg-secondary/20 p-4 text-center text-xs text-muted-foreground">
                    No active skills recorded for this officer yet.
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {activeSkills.map((entry) => {
                      const meta = PROFICIENCY_LABELS[entry.proficiency] || PROFICIENCY_LABELS[3];
                      return (
                        <div
                          key={entry.id}
                          className="flex flex-col justify-between rounded-lg border border-border/60 bg-secondary/30 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {entry.skill.name}
                            </span>
                            <span
                              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.color}`}
                            >
                              Lvl {entry.proficiency}
                            </span>
                          </div>

                          {/* 5-bar visual indicator */}
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <div
                                  key={lvl}
                                  className={`h-1.5 w-5 rounded-full ${
                                    lvl <= entry.proficiency
                                      ? "bg-primary"
                                      : "bg-secondary"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              Since {entry.effectiveFrom}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── Tab Control (Assign vs Create) ─────────────── */}
              <section className="mt-2 grid gap-3 rounded-lg border border-border/60 bg-secondary/20 p-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      activeTab === "assign"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab("assign")}
                  >
                    Assign / Update Skill
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      activeTab === "create"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab("create")}
                  >
                    + Create New Skill
                  </button>
                </div>

                {/* Tab 1: Assign Skill */}
                {activeTab === "assign" && (
                  <div className="grid gap-3">
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Select Skill
                      <select
                        className="pp-input"
                        value={skillId}
                        onChange={(e) => setSkillId(e.target.value)}
                      >
                        <option value="">Choose skill from catalog…</option>
                        {catalog
                          .filter((s) => s.isActive)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Proficiency Level
                        <select
                          className="pp-input"
                          value={proficiency}
                          onChange={(e) =>
                            setProficiency(Number(e.target.value) as ProficiencyLevel)
                          }
                        >
                          <option value={1}>1 · Basic awareness</option>
                          <option value={2}>2 · Working with guidance</option>
                          <option value={3}>3 · Proficient</option>
                          <option value={4}>4 · Advanced</option>
                          <option value={5}>5 · Expert</option>
                        </select>
                      </label>

                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Effective Date
                        <input
                          type="date"
                          className="pp-input"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                        />
                      </label>
                    </div>

                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Assessment Notes
                      <textarea
                        className="pp-textarea min-h-16"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional details or evaluation notes…"
                        rows={2}
                      />
                    </label>

                    <button
                      type="button"
                      className="pp-btn pp-btn--save mt-1"
                      disabled={!skillId || saving}
                      onClick={() => void handleSaveProficiency()}
                    >
                      {saving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save size={13} />
                      )}
                      Save Skill Proficiency
                    </button>
                  </div>
                )}

                {/* Tab 2: Create Skill Catalog Item */}
                {activeTab === "create" && (
                  <div className="grid gap-3">
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      New Skill Name
                      <input
                        className="pp-input"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        placeholder="e.g. Tax Law, Data Analysis, Risk Audit"
                      />
                    </label>

                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                      Description
                      <textarea
                        className="pp-textarea min-h-16"
                        value={newSkillDescription}
                        onChange={(e) => setNewSkillDescription(e.target.value)}
                        placeholder="Optional description of skill scope…"
                        rows={2}
                      />
                    </label>

                    <button
                      type="button"
                      className="pp-btn pp-btn--add mt-1"
                      disabled={!newSkillName.trim() || saving}
                      onClick={() => void handleCreateSkill()}
                    >
                      {saving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus size={13} />
                      )}
                      Add to Skill Catalog
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 bg-secondary/30 px-6 py-3">
          <button
            type="button"
            className="pp-btn pp-btn--ghost text-xs"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
