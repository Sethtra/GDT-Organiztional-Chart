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

const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  1: "1 · Basic awareness",
  2: "2 · Working guidance",
  3: "3 · Proficient",
  4: "4 · Advanced",
  5: "5 · Expert",
};

const inputClass =
  "min-h-11 w-full rounded-[9px] border border-[#d9e1dc] bg-[#f3f5f2] px-3 py-2 text-[13px] font-medium text-[#16211b] outline-none transition placeholder:text-[#87918b] focus:border-[#136232] focus:bg-white focus:ring-2 focus:ring-[#136232]/25 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass =
  "grid gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-[#66716b]";

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
      <DialogContent
        className="max-w-4xl overflow-hidden rounded-[16px] border-[#d9e1dc] bg-white p-0 text-[#16211b] shadow-2xl"
        style={{ fontFamily: "'Manrope', 'Noto Sans Khmer', system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="border-b border-[#d9e1dc] bg-[#f3f5f2] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.015em] text-[#16211b]">
            <Award className="size-5 text-[#136232]" />
            Officer Skills · {staff?.name}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[12.5px] font-medium text-[#66716b]">
            Manage skills and proficiency levels (1–5). Changes update officer record history.
          </DialogDescription>
        </div>

        <div className="grid max-h-[calc(100vh-12rem)] gap-4 overflow-y-auto p-6">
          {error && (
            <div
              role="alert"
              className="rounded-[10px] border border-[#efc8c4] bg-[#fdecea] p-3 text-[12px] font-medium leading-relaxed text-[#9c332d]"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-36 items-center justify-center gap-2 text-[12px] font-semibold text-[#66716b]">
              <Loader2 className="size-4 animate-spin text-[#136232]" />
              Loading skills…
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
              {/* ── Active Skills List (left rail) ─────────────── */}
              <section className="grid gap-2 lg:col-span-5">
                <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[#66716b]">
                  Current Skills ({activeSkills.length})
                </h3>

                {activeSkills.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-[#bfcac3] bg-[#f3f5f2] p-4 text-center text-[12px] font-medium text-[#66716b]">
                    No active skills recorded for this officer yet.
                  </div>
                ) : (
                  <div className="grid gap-2.5">
                    {activeSkills.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col justify-between rounded-[10px] border border-[#d9e1dc] bg-[#f3f5f2] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[12.5px] font-bold text-[#16211b]">
                            {entry.skill.name}
                          </span>
                          <span className="inline-flex shrink-0 items-center rounded-full border border-[#c6e1d1] bg-[#e7f3ec] px-2 py-0.5 text-[10.5px] font-bold text-[#136232]">
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
                                    ? "bg-[#136232]"
                                    : "bg-[#d9e1dc]"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-medium text-[#87918b]">
                            Since {entry.effectiveFrom}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Tab Control (Assign vs Create) — right panel ─ */}
              <section className="grid gap-3 rounded-[12px] border border-[#d9e1dc] bg-[#f3f5f2] p-4 lg:col-span-7">
                <div className="flex items-center gap-2 border-b border-[#d9e1dc] pb-3">
                  <button
                    type="button"
                    className={`rounded-[8px] px-3 py-1.5 text-[11px] font-bold transition ${
                      activeTab === "assign"
                        ? "bg-[#136232] text-white"
                        : "text-[#66716b] hover:bg-[#eef2ee] hover:text-[#16211b]"
                    }`}
                    onClick={() => setActiveTab("assign")}
                  >
                    Assign / Update Skill
                  </button>
                  <button
                    type="button"
                    className={`rounded-[8px] px-3 py-1.5 text-[11px] font-bold transition ${
                      activeTab === "create"
                        ? "bg-[#136232] text-white"
                        : "text-[#66716b] hover:bg-[#eef2ee] hover:text-[#16211b]"
                    }`}
                    onClick={() => setActiveTab("create")}
                  >
                    + Create New Skill
                  </button>
                </div>

                {/* Tab 1: Assign Skill */}
                {activeTab === "assign" && (
                  <div className="grid gap-3">
                    <label className={labelClass}>
                      Select Skill
                      <select
                        className={inputClass}
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
                      <label className={labelClass}>
                        Proficiency Level
                        <select
                          className={inputClass}
                          value={proficiency}
                          onChange={(e) =>
                            setProficiency(Number(e.target.value) as ProficiencyLevel)
                          }
                        >
                          {([1, 2, 3, 4, 5] as ProficiencyLevel[]).map((level) => (
                            <option key={level} value={level}>
                              {PROFICIENCY_LABELS[level]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={labelClass}>
                        Effective Date
                        <input
                          type="date"
                          className={inputClass}
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                        />
                      </label>
                    </div>

                    <label className={labelClass}>
                      Assessment Notes
                      <textarea
                        className={`${inputClass} min-h-16 resize-y`}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional details or evaluation notes…"
                        rows={2}
                      />
                    </label>

                    <button
                      type="button"
                      className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] bg-[#136232] px-4 text-[12.5px] font-extrabold text-white transition hover:bg-[#0f5129] disabled:opacity-60"
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
                    <label className={labelClass}>
                      New Skill Name
                      <input
                        className={inputClass}
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        placeholder="e.g. Tax Law, Data Analysis, Risk Audit"
                      />
                    </label>

                    <label className={labelClass}>
                      Description
                      <textarea
                        className={`${inputClass} min-h-16 resize-y`}
                        value={newSkillDescription}
                        onChange={(e) => setNewSkillDescription(e.target.value)}
                        placeholder="Optional description of skill scope…"
                        rows={2}
                      />
                    </label>

                    <button
                      type="button"
                      className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-[#c6e1d1] px-4 text-[12.5px] font-extrabold text-[#136232] transition hover:bg-[#e7f3ec] disabled:opacity-60"
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
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#d9e1dc] bg-[#f3f5f2] px-6 py-3">
          <button
            type="button"
            className="min-h-9 rounded-[9px] border border-[#d9e1dc] px-4 text-[12px] font-bold text-[#16211b] transition hover:bg-[#eef2ee] disabled:opacity-60"
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
