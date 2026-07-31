import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import AdminSidebar from "../components/admin/AdminSidebar";
import type { HrStaffDirectoryRecord, JobTitle } from "../contracts/hr";
import { useOrgStructure } from "../hooks/useOrgStructure";
import { listJobArchitecture } from "../services/jobArchitectureService";
import { listHrStaff } from "../services/staffService";

export default function AdminDashboardPage() {
  const { units } = useOrgStructure();
  const [staff, setStaff] = useState<HrStaffDirectoryRecord[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffData, jobsData] = await Promise.all([
        listHrStaff(true),
        listJobArchitecture(),
      ]);
      setStaff(staffData);
      setJobTitles(jobsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load admin analytics data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeStaff = useMemo(
    () => staff.filter((s) => s.status === "active"),
    [staff],
  );

  const maleCount = useMemo(
    () => activeStaff.filter((s) => s.gender === "male").length,
    [activeStaff],
  );
  const femaleCount = useMemo(
    () => activeStaff.filter((s) => s.gender === "female").length,
    [activeStaff],
  );
  const genderMalePercent = activeStaff.length
    ? Math.round((maleCount / activeStaff.length) * 100)
    : 0;
  const genderFemalePercent = activeStaff.length
    ? 100 - genderMalePercent
    : 0;

  const doctorateCount = useMemo(
    () => activeStaff.filter((s) => s.education === "បណ្ឌិត").length,
    [activeStaff],
  );
  const mastersCount = useMemo(
    () => activeStaff.filter((s) => s.education === "អនុបណ្ឌិត").length,
    [activeStaff],
  );
  const bachelorsCount = useMemo(
    () => activeStaff.filter((s) => s.education === "បរិញ្ញាបត្រ").length,
    [activeStaff],
  );
  const educationRows = useMemo(() => {
    const rows = [
      { khmer: "បណ្ឌិត", label: "Doctorate", count: doctorateCount },
      { khmer: "អនុបណ្ឌិត", label: "Master's Degree", count: mastersCount },
      { khmer: "បរិញ្ញាបត្រ", label: "Bachelor's Degree", count: bachelorsCount },
    ];
    const max = Math.max(...rows.map((r) => r.count), 1);
    return rows.map((r) => ({ ...r, pct: Math.round((r.count / max) * 100) || 4 }));
  }, [doctorateCount, mastersCount, bachelorsCount]);

  const totalOffices = useMemo(
    () => units.reduce((sum, u) => sum + (u.offices?.length || 0), 0),
    [units],
  );

  const departments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of activeStaff) {
      const dept =
        s.currentPosition?.departmentName ??
        s.organizationalPlacement?.departmentName ??
        null;
      if (!dept) continue;
      counts.set(dept, (counts.get(dept) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    rows.sort((a, b) => b.count - a.count);
    const max = rows[0]?.count ?? 1;
    return rows.map((row, i) => ({
      ...row,
      rank: i + 1,
      pct: Math.round((row.count / max) * 100),
    }));
  }, [activeStaff]);

  const activeRatio = staff.length
    ? Math.round((activeStaff.length / staff.length) * 100)
    : 0;

  return (
    <div className="admin-shell">
      <AdminSidebar currentTab="analytics" />
      <main className="admin-main">
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 20,
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

        <div className="admin-page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span className="admin-eyebrow">
                <span className="admin-eyebrow__dot" />
                Executive Portal
              </span>
              <span style={{ fontSize: 12, color: "var(--a-text-muted)" }}>
                GDT General Department of Taxation
              </span>
            </div>
            <h1>Admin Analytics &amp; HR Intelligence</h1>
            <p>
              Real-time strategic oversight of officer distribution, gender
              balance, education levels, and organizational hierarchy.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flex: "none" }}>
            <button
              type="button"
              className="admin-btn"
              onClick={() => void loadData()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              Refresh Data
            </button>
            <Link to="/admin/staff" className="admin-btn admin-btn--primary">
              <Plus size={15} strokeWidth={2.4} />
              Add Officer
            </Link>
          </div>
        </div>

        <div className="admin-kpi-grid">
          <div className="admin-kpi">
            <div className="admin-kpi__top">
              <span className="admin-kpi__label">Total HR Officers</span>
              <span
                className="admin-kpi__icon"
                style={{ background: "color-mix(in oklch, var(--a-green) 15%, transparent)", color: "var(--a-green-text)" }}
              >
                <UsersRound size={16} />
              </span>
            </div>
            <div className="admin-kpi__value">{loading ? "—" : staff.length}</div>
            <div className="admin-kpi__foot">
              <span style={{ color: "var(--a-green-text)", fontWeight: 700 }}>
                {activeStaff.length} Active
              </span>
              <span style={{ color: "var(--a-text-faint)" }}>
                {staff.length - activeStaff.length} Archived
              </span>
            </div>
          </div>

          <div className="admin-kpi">
            <div className="admin-kpi__top">
              <span className="admin-kpi__label">GDT Units &amp; Offices</span>
              <span
                className="admin-kpi__icon"
                style={{ background: "color-mix(in oklch, var(--a-blue) 16%, transparent)", color: "var(--a-blue-text)" }}
              >
                <Building2 size={16} />
              </span>
            </div>
            <div className="admin-kpi__value">{units.length}</div>
            <div className="admin-kpi__foot">
              <span style={{ color: "var(--a-blue-text)", fontWeight: 700 }}>
                {totalOffices} Sub-Offices
              </span>
              <span style={{ color: "var(--a-text-faint)" }}>Department Hierarchy</span>
            </div>
          </div>

          <div className="admin-kpi">
            <div className="admin-kpi__top">
              <span className="admin-kpi__label">Job Titles</span>
              <span
                className="admin-kpi__icon"
                style={{ background: "color-mix(in oklch, var(--a-green) 15%, transparent)", color: "var(--a-green-text)" }}
              >
                <BriefcaseBusiness size={16} />
              </span>
            </div>
            <div className="admin-kpi__value">{loading ? "—" : jobTitles.length}</div>
            <div className="admin-kpi__foot">
              <span style={{ color: "var(--a-green-text)", fontWeight: 700 }}>
                Standardized Scope
              </span>
              <span style={{ color: "var(--a-text-faint)" }}>Skill Mapping</span>
            </div>
          </div>

          <div className="admin-kpi">
            <div className="admin-kpi__top">
              <span className="admin-kpi__label">Active Ratio</span>
              <span
                className="admin-kpi__icon"
                style={{ background: "color-mix(in oklch, var(--a-gold) 16%, transparent)", color: "var(--a-gold-text)" }}
              >
                <Award size={16} />
              </span>
            </div>
            <div className="admin-kpi__value" style={{ color: "var(--a-gold-text)" }}>
              {activeRatio}%
            </div>
            <div className="admin-kpi__foot">
              <span style={{ color: "var(--a-gold-text)", fontWeight: 700 }}>
                Personnel Placement
              </span>
              <span style={{ color: "var(--a-text-faint)" }}>Active Records</span>
            </div>
          </div>
        </div>

        <div className="admin-grid-2">
          <div className="admin-card">
            <div className="admin-card__head">
              <div className="admin-card__title-row">
                <div className="admin-card__icon">
                  <UsersRound size={16} />
                </div>
                <div>
                  <div className="admin-card__title">Gender Distribution</div>
                  <div className="admin-card__subtitle">Demographic officer balance</div>
                </div>
              </div>
              <span
                className="admin-chip"
                style={{ background: "color-mix(in oklch, var(--a-green) 14%, transparent)", color: "var(--a-green-text)" }}
              >
                {activeStaff.length} Officers
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8, fontWeight: 600 }}>
              <span style={{ color: "var(--a-green-text)" }}>
                ប្រុស (Male): {maleCount} ({genderMalePercent}%)
              </span>
              <span style={{ color: "var(--a-blue-text)" }}>
                ស្រី (Female): {femaleCount} ({genderFemalePercent}%)
              </span>
            </div>
            <div className="admin-bar-track" style={{ marginBottom: 20 }}>
              <div style={{ height: "100%", width: `${genderMalePercent}%`, background: "var(--a-green)" }} />
              <div style={{ height: "100%", width: `${genderFemalePercent}%`, background: "var(--a-blue)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="admin-stat-box">
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--a-green-text)", marginBottom: 8, fontFamily: "'Noto Sans Khmer', sans-serif" }}>
                  ប្រុស (Male)
                </div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{maleCount}</div>
                <div style={{ fontSize: 11, color: "var(--a-text-muted)", marginTop: 4 }}>
                  {genderMalePercent}% of active personnel
                </div>
              </div>
              <div className="admin-stat-box">
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--a-blue-text)", marginBottom: 8, fontFamily: "'Noto Sans Khmer', sans-serif" }}>
                  ស្រី (Female)
                </div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{femaleCount}</div>
                <div style={{ fontSize: 11, color: "var(--a-text-muted)", marginTop: 4 }}>
                  {genderFemalePercent}% of active personnel
                </div>
              </div>
            </div>
          </div>

          <div className="admin-card" style={{ display: "flex", flexDirection: "column" }}>
            <div className="admin-card__head" style={{ marginBottom: 18 }}>
              <div className="admin-card__title-row">
                <div className="admin-card__icon">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <div className="admin-card__title">Education Level Attainment</div>
                  <div className="admin-card__subtitle">Academic qualification metrics</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
              {educationRows.map((row) => (
                <div key={row.label}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 64, fontSize: 10.5, fontWeight: 600, fontFamily: "'Noto Sans Khmer', sans-serif", lineHeight: 1.3 }}>
                      {row.khmer}
                    </div>
                    <div className="admin-bar-track--thin" style={{ flex: 1 }}>
                      <div className="admin-bar-fill--thin" style={{ width: `${row.pct}%`, background: "var(--a-purple)" }} />
                    </div>
                    <div style={{ width: 26, textAlign: "right", fontWeight: 800, fontSize: 14 }}>
                      {row.count}
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--a-text-faint)", margin: "-2px 0 4px 76px" }}>
                    {row.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-grid-2" style={{ marginBottom: 0 }}>
          <div className="admin-card">
            <div className="admin-card__head">
              <div className="admin-card__title-row">
                <div className="admin-card__icon">
                  <Building2 size={16} />
                </div>
                <div>
                  <div className="admin-card__title">Department Staff Headcount</div>
                  <div className="admin-card__subtitle">Personnel distribution across GDT units</div>
                </div>
              </div>
              <span style={{ fontSize: 11.5, color: "var(--a-text-muted)" }}>
                {departments.length} Departments
              </span>
            </div>
            {departments.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--a-text-muted)" }}>
                No officers are placed in a department yet.
              </p>
            ) : (
              departments.map((dept) => (
                <div key={dept.name} className="admin-dept-row">
                  <span className="admin-dept-row__rank">#{dept.rank}</span>
                  <div className="admin-dept-row__track">
                    <div className="admin-dept-row__fill" style={{ width: `${dept.pct}%` }} />
                    <div className="admin-dept-row__name">{dept.name}</div>
                  </div>
                  <span className="admin-dept-row__count">
                    {dept.count} Officers ({dept.pct}%)
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="admin-card">
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
              <div
                className="admin-card__icon"
                style={{ background: "color-mix(in oklch, var(--a-gold) 16%, transparent)", color: "var(--a-gold-text)" }}
              >
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="admin-card__title">Quick Administration</div>
                <div className="admin-card__subtitle">Direct portal shortcuts</div>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <Link to="/admin/staff" className="admin-shortcut">
                <UsersRound size={15} />
                <span>Staff Directory</span>
              </Link>
              <Link to="/admin/org-structure" className="admin-shortcut">
                <Building2 size={15} />
                <span>Organization Setup</span>
              </Link>
              <Link to="/admin/job-architecture" className="admin-shortcut">
                <BriefcaseBusiness size={15} />
                <span>Job Architecture</span>
              </Link>
            </div>
            <div className="admin-notice">
              <ShieldCheck size={15} style={{ flex: "none", marginTop: 1, color: "var(--a-gold-text)" }} />
              <div>HR Administrator permissions active. All changes are logged for security.</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
