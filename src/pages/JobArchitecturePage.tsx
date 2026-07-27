import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Loader2,
  Plus,
  Save,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

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
import { listSkillCatalog } from "../services/skillService";

const fieldClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export default function JobArchitecturePage() {
  const [titles, setTitles] = useState<JobTitle[]>([]);
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [rankOrder, setRankOrder] = useState(100);
  const [scope, setScope] = useState<PositionScope>("individual");
  const [requirementSkillId, setRequirementSkillId] = useState("");
  const [minimumLevel, setMinimumLevel] =
    useState<ProficiencyLevel>(3);

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

  return (
    <main className="min-h-full bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-5">
          <Link
            to="/dashboard"
            className="grid size-10 place-items-center rounded-md border border-border hover:bg-accent"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <BriefcaseBusiness className="size-5 text-primary" />
              Job Titles & Required Skills
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reusable position rules and minimum proficiency levels
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[360px_1fr]">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm lg:col-span-2"
          >
            {error}
          </div>
        )}

        <aside className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4 text-sm font-semibold">
            Job titles
          </div>
          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="divide-y divide-border">
              {titles.map((title) => (
                <button
                  key={title.id}
                  className={`w-full p-4 text-left hover:bg-accent ${
                    selectedId === title.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedId(title.id)}
                >
                  <div className="text-sm font-medium">{title.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {title.positionScope} · rank {title.rankOrder} ·{" "}
                    {title.requirements.length} requirements
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="grid content-start gap-5">
          <section className="grid gap-3 rounded-lg border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Plus className="size-4 text-primary" />
              Add job title
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={fieldClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Khmer / primary title"
              />
              <input
                className={fieldClass}
                value={nameEn}
                onChange={(event) => setNameEn(event.target.value)}
                placeholder="English title"
              />
              <input
                className={fieldClass}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Optional code"
              />
              <input
                className={fieldClass}
                type="number"
                min={1}
                max={1000}
                value={rankOrder}
                onChange={(event) => setRankOrder(Number(event.target.value))}
                aria-label="Rank order"
              />
              <select
                className={fieldClass}
                value={scope}
                onChange={(event) =>
                  setScope(event.target.value as PositionScope)
                }
              >
                <option value="individual">Individual staff</option>
                <option value="office">Office leadership</option>
                <option value="department">Department leadership</option>
                <option value="organization">Organization leadership</option>
              </select>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                disabled={!name.trim() || saving}
                onClick={() => void handleAddTitle()}
              >
                <Save className="size-4" />
                Save title
              </button>
            </div>
          </section>

          <section className="grid gap-4 rounded-lg border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-primary" />
              {selected
                ? `Requirements · ${selected.name}`
                : "Select a job title"}
            </h2>
            {selected && (
              <>
                <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                  <select
                    className={fieldClass}
                    value={requirementSkillId}
                    onChange={(event) =>
                      setRequirementSkillId(event.target.value)
                    }
                  >
                    <option value="">Select required skill…</option>
                    {skills
                      .filter((skill) => skill.isActive)
                      .map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                  </select>
                  <select
                    className={fieldClass}
                    value={minimumLevel}
                    onChange={(event) =>
                      setMinimumLevel(
                        Number(event.target.value) as ProficiencyLevel,
                      )
                    }
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <option key={level} value={level}>
                        Minimum level {level}
                      </option>
                    ))}
                  </select>
                  <button
                    className="min-h-10 rounded-md border border-border px-4 text-sm font-semibold hover:bg-accent disabled:opacity-60"
                    disabled={!requirementSkillId || saving}
                    onClick={() => void handleRequirement()}
                  >
                    Add / update
                  </button>
                </div>
                <div className="grid gap-2">
                  {selected.requirements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No required skills yet.
                    </p>
                  ) : (
                    selected.requirements.map((requirement) => (
                      <div
                        key={requirement.id}
                        className="flex items-center justify-between rounded-md border border-border bg-secondary/40 p-3 text-sm"
                      >
                        <span>{requirement.skill.name}</span>
                        <span className="text-muted-foreground">
                          Minimum level {requirement.minimumProficiency}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
