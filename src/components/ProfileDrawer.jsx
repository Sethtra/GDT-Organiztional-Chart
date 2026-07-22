import { useState, useMemo } from "react";
import { X, Pencil, Hash, Calendar, Users, Phone, MapPin, Heart, GraduationCap, Sparkles, Briefcase, Contact, ChevronDown, ChevronUp, Clock, FileText } from "lucide-react";
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

function Row({ icon, label, value, hideIfEmpty = false }) {
  if (hideIfEmpty && (!value || value === "—")) return null;
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

function HistoryItem({ record, defaultOpen }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const marital = record.maritalStatus === "married" ? "Married"
    : record.maritalStatus === "single" ? "Single" : record.maritalStatus || "";

  const hasPersonal = !!(record.phone || record.address || marital || record.siblings);
  const hasBackground = !!(record.education || record.skill);

  return (
    <div style={{
      background: 'rgba(var(--surface-rgb), 0.04)',
      borderRadius: '10px',
      border: '1px solid rgba(var(--surface-rgb), 0.08)',
      marginBottom: '12px',
      overflow: 'hidden',
      flexShrink: 0,
      transition: 'all 0.2s ease'
    }}>
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isOpen ? 'rgba(var(--surface-rgb), 0.06)' : 'transparent',
          transition: 'background 0.2s'
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {record.name || "Past Staff"}
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '2px 8px', 
              borderRadius: '12px', 
              background: record.exitStatus === 'Retired' ? 'rgba(148,163,184,0.15)' : 
                          record.exitStatus === 'Transferred' ? 'rgba(56,189,248,0.15)' : 
                          record.exitStatus === 'Suspended' ? 'rgba(234,179,8,0.15)' : 'rgba(244,63,94,0.15)',
              color: record.exitStatus === 'Retired' ? '#94a3b8' : 
                     record.exitStatus === 'Transferred' ? '#38bdf8' : 
                     record.exitStatus === 'Suspended' ? '#eab308' : '#f43f5e',
              border: '1px solid currentColor'
            }}>
              {record.exitStatus || "Resigned"}
            </span>
          </div>
          {record.nameEn && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>{record.nameEn}</div>}
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 4 }}>
            Left: <strong style={{ color: 'var(--text-secondary)' }}>{formatJoinDate(record.dateLeft) || "—"}</strong>
          </div>
        </div>

        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>{isOpen ? "Hide" : "Details"}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Full Profile View when expanded */}
      {isOpen && (
        <div style={{ padding: '4px 16px 16px', borderTop: '1px solid rgba(var(--surface-rgb), 0.08)' }}>
          <div className="pp-section" style={{ marginBottom: 12 }}>
            <div className="pp-section-label"><Briefcase size={11} /> Work Details</div>
            <Row icon={<Hash size={12} />}     label="ID"         value={record.staffId} hideIfEmpty />
            <Row icon={<Briefcase size={12} />} label="Department" value={record.department} hideIfEmpty />
            <Row icon={<MapPin size={12} />}   label="Office"     value={record.office} hideIfEmpty />
            <Row icon={<Calendar size={12} />} label="Joined"     value={formatJoinDate(record.joinDate)} hideIfEmpty />
            <Row icon={<Clock size={12} />}    label="Left Date"  value={formatJoinDate(record.dateLeft)} />
          </div>

          {hasPersonal && (
            <div className="pp-section" style={{ marginBottom: 12 }}>
              <div className="pp-section-label"><Contact size={11} /> Personal Details</div>
              <Row icon={<Phone size={12} />}  label="Phone"          value={record.phone} hideIfEmpty />
              <Row icon={<MapPin size={12} />} label="Address"        value={record.address} hideIfEmpty />
              <Row icon={<Heart size={12} />}  label="Marital status" value={marital} hideIfEmpty />
              <Row icon={<Users size={12} />}  label="Siblings"       value={record.siblings} hideIfEmpty />
            </div>
          )}

          {hasBackground && (
            <div className="pp-section" style={{ marginBottom: 12 }}>
              <div className="pp-section-label"><GraduationCap size={11} /> Background</div>
              <Row icon={<GraduationCap size={12} />} label="Education" value={record.education} hideIfEmpty />
              <Row icon={<Sparkles size={12} />}      label="Skills"    value={record.skill} hideIfEmpty />
            </div>
          )}

          {record.notes && (
            <div className="pp-section">
              <div className="pp-section-label"><FileText size={11} /> Exit Notes</div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(var(--surface-rgb), 0.05)', padding: '10px 12px', borderRadius: '6px', lineHeight: 1.5 }}>
                "{record.notes}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfileDrawer({ node, teamSize, canEdit, onEdit, onClose }) {
  const d = node.data || {};
  const meta = TYPE_META[d.orgType] || {};
  const initials = (d.nameEn || d.name || "?").trim().charAt(0).toUpperCase();

  const marital = d.maritalStatus === "married" ? "Married"
    : d.maritalStatus === "single" ? "Single" : "";
    
  const rawHistory = d.history || [];
  const history = useMemo(() => {
    const seen = new Set();
    return rawHistory.filter(item => {
      if (!item || typeof item !== 'object') return false;
      // Filter out junk/empty history records
      if (!item.name && !item.nameEn && !item.staffId && !item.dateLeft && !item.exitStatus) return false;
      const key = `${(item.name || '').trim().toLowerCase()}_${(item.nameEn || '').trim().toLowerCase()}_${item.dateLeft || ''}_${item.exitStatus || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawHistory]);

  const isVacant = !d.name && !d.nameEn;
  const [activeTab, setActiveTab] = useState(isVacant && history.length > 0 ? "history" : "current");

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
            {history.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => setActiveTab("history")}
                  style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  View Past Staff History ({history.length})
                </button>
              </div>
            )}
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
        <div className="pp-body" style={{ padding: '12px' }}>
          {history.map((record, i) => (
            <HistoryItem key={record.id || record.dbAssignmentId || i} record={record} defaultOpen={i === 0} />
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
