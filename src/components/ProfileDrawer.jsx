import { useState } from "react";
import { X, Pencil, Hash, Calendar, Users, Phone, MapPin, Heart, GraduationCap, Sparkles, Briefcase, Contact } from "lucide-react";
import { TYPE_META } from "../data/nodeTypes";

// Read-only staff profile drawer — what clicking a person node opens first.
// Editing goes through the full PropertiesPanel via the Edit button, so the
// common action (looking someone up) never risks accidental edits.

function formatJoinDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value; // free-text fallback
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Row({ icon, label, value }) {
  return (
    <div className="profile-row">
      <div className="profile-row__label">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`profile-row__value ${!value ? "profile-row__value--empty" : ""}`}>
        {value || "—"}
      </div>
    </div>
  );
}

export default function ProfileDrawer({ node, teamSize, canEdit, onEdit, onClose }) {
  const d = node.data || {};
  const meta = TYPE_META[d.orgType] || {};
  const initials = (d.nameEn || d.name || "?").trim().charAt(0).toUpperCase();

  const marital = d.maritalStatus === "married" ? "Married"
    : d.maritalStatus === "single" ? "Single" : "";
    
  const [activeTab, setActiveTab] = useState("current");
  const history = d.history || [];
  const isVacant = !d.name && !d.nameEn;

  return (
    <div className="properties-panel profile-drawer">
      {/* Header */}
      <div className="pp-header">
        <div className="pp-header-left">
          <Contact size={14} style={{ color: "#e9dca6" }} />
          <span className="pp-title">Staff Profile</span>
        </div>
        <button className="pp-close" onClick={onClose} title="Close"><X size={15} /></button>
      </div>

      {/* Hero — mirrors the person card's dark/gold look */}
      <div className="profile-hero">
        <div className="profile-hero__avatar" style={{ '--avatar-accent': meta.accent || "#f59e0b" }}>
          {initials}
        </div>
        <div className="profile-hero__text">
          <div className="profile-hero__name">
            {isVacant ? <span style={{ color: "#fca5a5" }}>VACANT POSITION</span> : (d.name || "ឈ្មោះ")}
          </div>
          {d.nameEn && <div className="profile-hero__name-en">{d.nameEn}</div>}
        </div>
      </div>

      {/* Tabs */}
      {history.length > 0 && (
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(var(--surface-rgb), 0.1)' }}>
          <button 
            style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'current' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'current' ? '#38bdf8' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => setActiveTab("current")}
          >
            Current Staff
          </button>
          <button 
            style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'history' ? '2px solid #38bdf8' : '2px solid transparent', color: activeTab === 'history' ? '#38bdf8' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => setActiveTab("history")}
          >
            History ({history.length})
          </button>
        </div>
      )}

      {/* Details */}
      {activeTab === "current" && (
      <div className="pp-body">
        {isVacant && (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            This position is currently vacant. Click "Edit Details" to assign a new staff member.
          </div>
        )}
        {!isVacant && (
          <>
        <div className="pp-section">
          <div className="pp-section-label"><Briefcase size={11} /> Work</div>
          <Row icon={<Hash size={12} />}     label="ID"         value={d.staffId} />
          <Row icon={<Briefcase size={12} />} label="Department" value={d.department} />
          <Row icon={<MapPin size={12} />}   label="Office"     value={d.office} />
          <Row icon={<Calendar size={12} />} label="Joined"     value={formatJoinDate(d.joinDate)} />
          <Row icon={<Users size={12} />}    label="Team"       value={teamSize > 0 ? `${teamSize} people` : ""} />
        </div>

        <div className="pp-section">
          <div className="pp-section-label"><Contact size={11} /> Personal</div>
          <Row icon={<Phone size={12} />}  label="Phone"          value={d.phone} />
          <Row icon={<MapPin size={12} />} label="Address"        value={d.address} />
          <Row icon={<Heart size={12} />}  label="Marital status" value={marital} />
          <Row icon={<Users size={12} />}  label="Siblings"       value={d.siblings} />
        </div>

        <div className="pp-section">
          <div className="pp-section-label"><GraduationCap size={11} /> Background</div>
          <Row icon={<GraduationCap size={12} />} label="Education" value={d.education} />
          <Row icon={<Sparkles size={12} />}      label="Skills"    value={d.skill} />
        </div>
          </>
        )}
      </div>
      )}

      {activeTab === "history" && (
        <div className="pp-body">
          {history.map((record, i) => (
            <div key={record.id || i} style={{ padding: '16px 20px', borderBottom: '1px dashed rgba(var(--surface-rgb), 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                 <div>
                   <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{record.name}</div>
                   {record.nameEn && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{record.nameEn}</div>}
                 </div>
                 <span style={{ 
                   fontSize: '10px', 
                   fontWeight: 700,
                   textTransform: 'uppercase',
                   padding: '2px 8px', 
                   borderRadius: '12px', 
                   background: record.exitStatus === 'Retired' ? 'rgba(148,163,184,0.15)' : 
                               record.exitStatus === 'Transferred' ? 'rgba(56,189,248,0.15)' : 
                               record.exitStatus === 'Resigned' ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)',
                   color: record.exitStatus === 'Retired' ? '#94a3b8' : 
                          record.exitStatus === 'Transferred' ? '#38bdf8' : 
                          record.exitStatus === 'Resigned' ? '#f43f5e' : '#f59e0b',
                   border: '1px solid currentColor'
                 }}>
                   {record.exitStatus}
                 </span>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: 6 }}>
                Left position on: <strong style={{ color: 'var(--text-primary)' }}>{formatJoinDate(record.dateLeft) || "Unknown"}</strong>
              </div>
              {record.notes && (
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(var(--surface-rgb), 0.05)', padding: '8px 12px', borderRadius: '6px' }}>
                  "{record.notes}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer — edit switches to the full properties panel */}
      {canEdit && (
        <div className="pp-sticky-footer">
          <button className="pp-btn pp-btn--add" style={{ width: "100%" }} onClick={onEdit}>
            <Pencil size={13} /> Edit Details
          </button>
        </div>
      )}
    </div>
  );
}
