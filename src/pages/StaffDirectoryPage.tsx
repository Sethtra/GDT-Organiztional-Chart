import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Award,
  CalendarDays,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  UserRound,
} from "lucide-react";

import ConfirmModal from "../components/ConfirmModal";
import AdminSidebar from "../components/admin/AdminSidebar";
import StaffFormDialog from "../components/staff/StaffFormDialog";
import StaffProfileDialog from "../components/staff/StaffProfileDialog";
import StaffSkillsDialog from "../components/staff/StaffSkillsDialog";
import type { HrStaffDirectoryRecord } from "../contracts/hr";
import { useOrgStructure } from "../hooks/useOrgStructure";
import { archiveStaff, listHrStaff } from "../services/staffService";
import {
  getStaffLocationLabel,
  getStaffPositionTitle,
} from "../utils/staffDisplay";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function StaffDirectoryPage() {
  const { units, getOfficesForUnit } = useOrgStructure();
  const [staff, setStaff] = useState<HrStaffDirectoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HrStaffDirectoryRecord | null>(null);
  const [archiveTarget, setArchiveTarget] =
    useState<HrStaffDirectoryRecord | null>(null);
  const [skillsTarget, setSkillsTarget] =
    useState<HrStaffDirectoryRecord | null>(null);
  const [profileTarget, setProfileTarget] =
    useState<HrStaffDirectoryRecord | null>(null);
  const [archiving, setArchiving] = useState(false);

  const availableOffices = useMemo(() => {
    if (!selectedDepartment) return [];
    return getOfficesForUnit(selectedDepartment);
  }, [selectedDepartment, getOfficesForUnit]);

  const load = useCallback(async (): Promise<HrStaffDirectoryRecord[]> => {
    setLoading(true);
    setError(null);
    try {
      const nextStaff = await listHrStaff(includeArchived);
      setStaff(nextStaff);
      return nextStaff;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the staff directory.",
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return staff.filter((person) => {
      if (selectedDepartment) {
        const dept =
          person.currentPosition?.departmentName ||
          person.organizationalPlacement?.departmentName;
        if (dept !== selectedDepartment) return false;
      }
      if (selectedOffice) {
        const off =
          person.currentPosition?.officeName ||
          person.organizationalPlacement?.officeName;
        if (off !== selectedOffice) return false;
      }
      if (query) {
        const matchesQuery = [
          person.name,
          person.nameEn,
          person.employeeId,
          person.jobTitle?.name,
          person.jobTitle?.nameEn,
          person.currentPosition?.title,
          person.currentPosition?.departmentName,
          person.currentPosition?.officeName,
          person.organizationalPlacement?.departmentName,
          person.organizationalPlacement?.officeName,
        ].some((value) => value?.toLocaleLowerCase().includes(query));
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [search, selectedDepartment, selectedOffice, staff]);

  const openNewOfficer = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveStaff(archiveTarget.id);
      setArchiveTarget(null);
      await load();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive this officer record.",
      );
      setArchiveTarget(null);
    } finally {
      setArchiving(false);
    }
  };

  const handleOfficerSaved = async (
    savedStaffId: string,
    manageSkills: boolean,
  ) => {
    const nextStaff = await load();
    if (!manageSkills) return;
    const savedStaff = nextStaff.find((person) => person.id === savedStaffId);
    if (savedStaff) setSkillsTarget(savedStaff);
  };

  return (
    <div className="admin-shell">
      <AdminSidebar currentTab="staff" />
      <main className="admin-main">
        <div className="admin-subheader" style={{ marginBottom: 20 }}>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}
            className="admin-btn admin-btn--icon"
            aria-label="Back to dashboard"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </a>
          <div className="admin-sidebar__seal" style={{ width: 36, height: 36 }}>
            <Shield size={17} strokeWidth={1.6} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Noto Sans Khmer', sans-serif" }}>
              អគ្គនាយកដ្ឋានពន្ធដារ
            </div>
            <div style={{ fontSize: 10.5, letterSpacing: ".05em", color: "var(--a-text-muted)", textTransform: "uppercase" }}>
              General Department of Taxation
            </div>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            style={{ marginLeft: "auto" }}
            onClick={openNewOfficer}
            aria-label="Add officer"
          >
            <Plus size={15} strokeWidth={2.4} />
            Add New Officer
          </button>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={15} style={{ color: "var(--a-text-muted)" }} />
            <input
              placeholder="Search by officer name, employee ID, position, or department…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="admin-select"
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedOffice("");
            }}
          >
            <option value="">All Departments</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.name}>
                {unit.name}
              </option>
            ))}
          </select>
          <select
            className="admin-select"
            style={!selectedDepartment ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            value={selectedOffice}
            disabled={!selectedDepartment}
            onChange={(e) => setSelectedOffice(e.target.value)}
          >
            <option value="">
              {!selectedDepartment ? "Select department first…" : "All Offices"}
            </option>
            {availableOffices.map((off) => (
              <option key={off.id} value={off.name}>
                {off.name}
              </option>
            ))}
          </select>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            Include archived records
          </label>
          <button
            type="button"
            className="admin-btn admin-btn--icon"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh staff directory"
            title="Refresh Directory"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
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

        <div className="admin-table-card">
          {loading ? (
            <div style={{ display: "grid", minHeight: 200, placeItems: "center", color: "var(--a-text-muted)", fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={16} className="animate-spin" />
                Loading directory records…
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "grid", minHeight: 220, placeItems: "center", padding: 20, textAlign: "center" }}>
              <div style={{ maxWidth: 360 }}>
                <div
                  style={{
                    margin: "0 auto",
                    display: "grid",
                    placeItems: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid var(--a-border-strong)",
                    color: "var(--a-text-muted)",
                  }}
                >
                  <UserRound size={20} />
                </div>
                <h2 style={{ marginTop: 12, fontSize: 14, fontWeight: 700 }}>
                  {search ? "No matching officers found" : "No officer records yet"}
                </h2>
                <p style={{ marginTop: 4, fontSize: 12, color: "var(--a-text-muted)" }}>
                  {search
                    ? "Try adjusting your search query or department filter."
                    : "Click below to add your first officer to the HR directory."}
                </p>
                {!search && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    style={{ marginTop: 16 }}
                    onClick={openNewOfficer}
                  >
                    <Plus size={15} />
                    Add First Officer
                  </button>
                )}
              </div>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Officer name</th>
                  <th>Employee ID</th>
                  <th>Position &amp; placement</th>
                  <th>Service date</th>
                  <th className="admin-table__th--right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((person, index) => (
                  <tr key={person.id}>
                    <td style={{ color: "var(--a-text-faint)", fontWeight: 700 }}>
                      {index + 1}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="admin-table__name-kh" dir="auto">
                          {person.name}
                        </span>
                        {person.status === "archived" && (
                          <span
                            style={{
                              borderRadius: 6,
                              border: "1px solid color-mix(in oklch, var(--a-danger) 30%, transparent)",
                              background: "color-mix(in oklch, var(--a-danger) 10%, transparent)",
                              padding: "1px 6px",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "var(--a-danger)",
                            }}
                          >
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="admin-table__name-en">{person.nameEn || "—"}</div>
                    </td>
                    <td>
                      {person.employeeId ? (
                        <span className="admin-chip">{person.employeeId}</span>
                      ) : (
                        <span style={{ color: "var(--a-gold-text)" }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Noto Sans Khmer', sans-serif" }} dir="auto">
                        {getStaffPositionTitle(person)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--a-text-muted)", marginTop: 2, fontFamily: "'Noto Sans Khmer', sans-serif" }}>
                        {getStaffLocationLabel(person)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "color-mix(in oklch, var(--a-text) 75%, transparent)" }}>
                        <CalendarDays size={12} />
                        {formatDate(person.joinedDate)}
                      </div>
                      {person.retiredDate && (
                        <div style={{ fontSize: 11, color: "var(--a-gold-text)", marginTop: 3, fontWeight: 600 }}>
                          Retired {formatDate(person.retiredDate)}
                        </div>
                      )}
                    </td>
                    <td className="admin-table__actions">
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => setProfileTarget(person)}
                          aria-label={`View profile for ${person.name}`}
                          title="View Profile"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => setSkillsTarget(person)}
                          aria-label={`Manage skills for ${person.name}`}
                          title="Manage Skills"
                        >
                          <Award size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => {
                            setEditing(person);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${person.name}`}
                          title="Edit Officer Info"
                        >
                          <Pencil size={14} />
                        </button>
                        {person.status !== "archived" && (
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => setArchiveTarget(person)}
                            aria-label={`Archive ${person.name}`}
                            title="Archive Officer Record"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <StaffFormDialog
        open={formOpen}
        staff={editing}
        onOpenChange={setFormOpen}
        onSaved={handleOfficerSaved}
      />
      <StaffSkillsDialog
        open={Boolean(skillsTarget)}
        staff={skillsTarget}
        onOpenChange={(open) => {
          if (!open) setSkillsTarget(null);
        }}
      />
      {profileTarget && (
        <StaffProfileDialog
          staffId={profileTarget.id}
          onClose={() => setProfileTarget(null)}
        />
      )}

      {archiveTarget && (
        <ConfirmModal
          title="Archive Officer Record"
          message={`Archive ${archiveTarget.name}? Position history will be preserved. A currently assigned officer must be vacated first.`}
          confirmLabel={archiving ? "Archiving…" : "Archive"}
          onConfirm={() => void confirmArchive()}
          onCancel={() => !archiving && setArchiveTarget(null)}
          danger
        />
      )}
    </div>
  );
}
