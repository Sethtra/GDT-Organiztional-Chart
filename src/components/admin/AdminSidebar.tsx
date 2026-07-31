import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Shield,
  UsersRound,
} from "lucide-react";

interface AdminSidebarProps {
  currentTab?: "analytics" | "staff" | "org-structure" | "jobs";
}

const NAV_ITEMS = [
  {
    id: "analytics",
    label: "Analytics & Overview",
    sub: "HR Performance Insights",
    icon: BarChart3,
    path: "/admin",
  },
  {
    id: "staff",
    label: "Staff Directory",
    sub: "Personnel & Officers",
    icon: UsersRound,
    path: "/admin/staff",
  },
  {
    id: "org-structure",
    label: "Organization Setup",
    sub: "Departments & Offices",
    icon: Building2,
    path: "/admin/org-structure",
  },
  {
    id: "jobs",
    label: "Job Architecture",
    sub: "Positions & Requirements",
    icon: BriefcaseBusiness,
    path: "/admin/job-architecture",
  },
] as const;

export default function AdminSidebar({ currentTab }: AdminSidebarProps) {
  const location = useLocation();

  const getActiveTab = () => {
    if (currentTab) return currentTab;
    const path = location.pathname;
    if (path.includes("/admin/staff")) return "staff";
    if (path.includes("/admin/org-structure")) return "org-structure";
    if (path.includes("/admin/job-architecture")) return "jobs";
    return "analytics";
  };

  const active = getActiveTab();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__seal">
          <Shield size={19} strokeWidth={1.6} />
        </div>
        <div className="admin-sidebar__brand-text">
          <b className="admin-sidebar__brand-kh">អគ្គនាយកដ្ឋានពន្ធដារ</b>
          <span className="admin-sidebar__brand-en">
            General Department of Taxation
          </span>
        </div>
      </div>

      <div className="admin-sidebar__identity">
        <div className="admin-sidebar__avatar">G.</div>
        <div>
          <div className="admin-sidebar__identity-role">
            Admin
            <Shield size={12} className="text-[var(--a-green)]" fill="currentColor" />
          </div>
          <div className="admin-sidebar__identity-sub">HR Administrator</div>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        <div className="admin-sidebar__nav-label">Admin Management</div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`admin-sidebar__item ${isActive ? "admin-sidebar__item--active" : ""}`}
            >
              <div className="admin-sidebar__item-icon">
                <Icon size={15} strokeWidth={2} />
              </div>
              <div>
                <div className="admin-sidebar__item-label">{item.label}</div>
                <div className="admin-sidebar__item-sub">{item.sub}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar__footer">
        <Link to="/dashboard" className="admin-sidebar__back">
          <ArrowLeft size={15} />
          Back to main website
        </Link>
      </div>
    </aside>
  );
}
