import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Loader2, Plus, Save, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

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
import { listSkillCatalog } from "../services/skillService";

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
  const [minimumLevel, setMinimumLevel] = useState<ProficiencyLevel>(3);

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
      const id = await saveJobTitle({ name, nameEn, code, rankOrder, positionScope: scope });
      setName("");
      setNameEn("");
      setCode("");
      await load();
      setSelectedId(id);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save the job title.",
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
        saveError instanceof Error ? saveError.message : "Unable to save the requirement.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar currentTab="jobs" />
      <main className="admin-main">
        <div className="admin-subheader">
          <Link to="/admin" className="admin-btn admin-btn--icon" aria-label="Back to dashboard">
            <ArrowLeft size={16} />
          </Link>
          <div
            className="admin-subheader__icon"
            style={{ background: "color-mix(in oklch, var(--a-purple) 16%, transparent)", color: "var(--a-purple-text)" }}
          >
            <BriefcaseBusiness size={17} />
          </div>
          <div>
            <div className="admin-subheader__title">Job Titles &amp; Required Skills</div>
            <div className="admin-subheader__subtitle">
              Reusable position rules and minimum proficiency levels
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              borderRadius: "var(--a-radius)",
              border: "1px solid color-mix(in oklch, var(--a-danger) 40%, transparent)",
              background: "color-mix(in oklch, var(--a-danger) 10%, transparent)",
              padding: 14,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div className="admin-jobs-grid">
          <div className="admin-jobtitle-list">
            <div className="admin-jobtitle-list__head">Job titles</div>
            {loading ? (
              <div style={{ display: "flex", minHeight: 120, alignItems: "center", justifyContent: "center", gap: 8, color: "var(--a-text-muted)" }}>
                <Loader2 size={16} className="animate-spin" />
                Loading…
              </div>
            ) : (
              titles.map((title) => (
                <button
                  key={title.id}
                  type="button"
                  className={`admin-jobtitle-row ${selectedId === title.id ? "admin-jobtitle-row--active" : ""}`}
                  onClick={() => setSelectedId(title.id)}
                >
                  <div className="admin-jobtitle-row__title">{title.name}</div>
                  <div className="admin-jobtitle-row__meta">
                    {title.positionScope} · rank {title.rankOrder} · {title.requirements.length} requirements
                  </div>
                </button>
              ))
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="admin-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, marginBottom: 16, color: "var(--a-green-text)" }}>
                <Plus size={16} strokeWidth={2.2} />
                Add job title
              </div>
              <div className="admin-form-grid">
                <input
                  className="admin-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Khmer / primary title"
                />
                <input
                  className="admin-input"
                  value={nameEn}
                  onChange={(event) => setNameEn(event.target.value)}
                  placeholder="English title"
                />
              </div>
              <div className="admin-form-grid">
                <input
                  className="admin-input"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Optional code"
                />
                <input
                  className="admin-input"
                  type="number"
                  min={1}
                  max={1000}
                  value={rankOrder}
                  onChange={(event) => setRankOrder(Number(event.target.value))}
                  aria-label="Rank order"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <select
                  className="admin-select"
                  value={scope}
                  onChange={(event) => setScope(event.target.value as PositionScope)}
                >
                  <option value="individual">Individual staff</option>
                  <option value="office">Office leadership</option>
                  <option value="department">Department leadership</option>
                  <option value="organization">Organization leadership</option>
                </select>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  style={{ justifyContent: "center" }}
                  disabled={!name.trim() || saving}
                  onClick={() => void handleAddTitle()}
                >
                  <Save size={14} />
                  Save title
                </button>
              </div>
            </div>

            <div className="admin-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, marginBottom: 16 }}>
                <Sparkles size={16} style={{ color: "var(--a-purple-text)" }} />
                {selected ? (
                  <>
                    Requirements ·{" "}
                    <span style={{ fontFamily: "'Noto Sans Khmer', sans-serif" }}>{selected.name}</span>
                  </>
                ) : (
                  "Select a job title"
                )}
              </div>
              {selected && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 44px", gap: 10, marginBottom: 14 }}>
                    <select
                      className="admin-select"
                      value={requirementSkillId}
                      onChange={(event) => setRequirementSkillId(event.target.value)}
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
                      className="admin-select"
                      value={minimumLevel}
                      onChange={(event) => setMinimumLevel(Number(event.target.value) as ProficiencyLevel)}
                    >
                      {[1, 2, 3, 4, 5].map((level) => (
                        <option key={level} value={level}>
                          Minimum level {level}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="admin-btn admin-btn--primary"
                      style={{ padding: 0, justifyContent: "center" }}
                      disabled={!requirementSkillId || saving}
                      onClick={() => void handleRequirement()}
                    >
                      <Plus size={15} strokeWidth={2.4} />
                    </button>
                  </div>
                  {selected.requirements.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--a-text-muted)" }}>No required skills yet.</p>
                  ) : (
                    selected.requirements.map((requirement) => (
                      <div key={requirement.id} className="admin-req-row">
                        <span>{requirement.skill.name}</span>
                        <span>Minimum level {requirement.minimumProficiency}</span>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
