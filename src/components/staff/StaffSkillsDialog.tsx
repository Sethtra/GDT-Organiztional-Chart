import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Sparkles } from "lucide-react";

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
const fieldClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

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
      <DialogContent className="max-w-3xl p-0">
        <div className="border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Officer skills · {staff?.name}
          </DialogTitle>
          <DialogDescription className="mt-2">
            Proficiency uses levels 1–5. Every change closes the previous
            active record and preserves it in history.
          </DialogDescription>
        </div>

        <div className="grid max-h-[calc(100vh-10rem)] gap-5 overflow-y-auto p-6">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading skills…
            </div>
          ) : (
            <>
              <section className="grid gap-3">
                <h3 className="text-sm font-semibold">Current proficiencies</h3>
                {activeSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active skills have been recorded.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeSkills.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-md border border-border bg-secondary/40 p-3"
                      >
                        <div className="text-sm font-medium">
                          {entry.skill.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Level {entry.proficiency} · since {entry.effectiveFrom}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="grid gap-3 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">
                  Add or update a current skill
                </h3>
                <select
                  className={fieldClass}
                  value={skillId}
                  onChange={(event) => setSkillId(event.target.value)}
                >
                  <option value="">Select skill…</option>
                  {catalog
                    .filter((skill) => skill.isActive)
                    .map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                </select>
                {catalog.filter((skill) => skill.isActive).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No skills exist yet. Create the first skill below, then
                    record the officer’s proficiency.
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">
                    Proficiency level
                    <select
                      className={fieldClass}
                      value={proficiency}
                      onChange={(event) =>
                        setProficiency(
                          Number(event.target.value) as ProficiencyLevel,
                        )
                      }
                    >
                      <option value={1}>1 · Basic awareness</option>
                      <option value={2}>2 · Working with guidance</option>
                      <option value={3}>3 · Proficient</option>
                      <option value={4}>4 · Advanced</option>
                      <option value={5}>5 · Expert</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Effective date
                    <input
                      type="date"
                      className={fieldClass}
                      value={effectiveDate}
                      onChange={(event) =>
                        setEffectiveDate(event.target.value)
                      }
                    />
                  </label>
                </div>
                <textarea
                  className={`${fieldClass} min-h-20`}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional assessment notes"
                />
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  disabled={!skillId || saving}
                  type="button"
                  onClick={() => void handleSaveProficiency()}
                >
                  <Save className="size-4" />
                  Save current skill
                </button>
              </section>

              <section className="grid gap-3 rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold">
                  Create a skill
                </h3>
                <input
                  className={fieldClass}
                  value={newSkillName}
                  onChange={(event) => setNewSkillName(event.target.value)}
                  placeholder="Skill name"
                />
                <textarea
                  className={`${fieldClass} min-h-16`}
                  value={newSkillDescription}
                  onChange={(event) =>
                    setNewSkillDescription(event.target.value)
                  }
                  placeholder="Optional description"
                />
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-accent disabled:opacity-60"
                  disabled={!newSkillName.trim() || saving}
                  type="button"
                  onClick={() => void handleCreateSkill()}
                >
                  <Plus className="size-4" />
                  Add skill
                </button>
              </section>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-secondary/40 px-6 py-4">
          <button
            className="min-h-10 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
            type="button"
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
