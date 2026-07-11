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
        <div className="profile-hero__name">{d.name || "ឈ្មោះ"}</div>
        {d.nameEn && <div className="profile-hero__name-en">{d.nameEn}</div>}
        {meta.label && <span className="profile-hero__chip">{meta.label}</span>}
      </div>

      {/* Details */}
      <div className="pp-body">
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
      </div>

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
