import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useHrAdmin } from "../hooks/useHrAdmin";
import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  LogIn,
  UserPlus,
  LogOut,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function Navbar({ search, setSearch }) {
  const { user, displayName, avatarUrl, signOut } = useAuth();
  const { isHrAdmin } = useHrAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar__inner gdt-shell-header__inner">
        {/* Brand */}
        <Link to="/" className="navbar__brand">
          <img
            src="/GDT-Logo (Light).png"
            alt="GDT - General Department of Taxation"
            className="gdt-shell-header__logo"
          />
        </Link>

        {/* Optional Search Bar */}
        {search !== undefined && setSearch && (
          <div className="navbar__search">
            <Search size={18} className="navbar__search-icon" />
            <input
              type="text"
              className="navbar__search-input"
              placeholder="Search in Drive"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Right side */}
        <div className="navbar__actions">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className={`navbar__link ${isActive("/dashboard") ? "navbar__link--active" : ""}`}
              >
                <LayoutGrid size={15} /> Dashboard
              </Link>

              {/* User dropdown */}
              <div className="navbar__avatar-wrap" ref={dropRef}>
                <button
                  className="navbar__avatar-btn"
                  onClick={() => setDropdownOpen((v) => !v)}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="navbar__avatar-img"
                    />
                  ) : (
                    <div className="navbar__avatar-initials">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="navbar__user-name">{displayName}</span>
                  <ChevronDown
                    size={14}
                    style={{
                      opacity: 0.6,
                      transform: dropdownOpen ? "rotate(180deg)" : "none",
                      transition: "transform .2s",
                    }}
                  />
                </button>

                {dropdownOpen && (
                  <div className="navbar__dropdown">
                    {/* User info header */}
                    <div className="navbar__drop-header">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="navbar__drop-header-avatar"
                        />
                      ) : (
                        <div className="navbar__drop-header-initials">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="navbar__drop-header-info">
                        <strong className="navbar__drop-header-name">
                          {displayName}
                        </strong>
                        <span className="navbar__drop-header-email">
                          {user?.email || "Signed-in account"}
                        </span>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="navbar__drop-section">
                      <Link
                        to="/dashboard"
                        className="navbar__drop-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <LayoutGrid size={16} /> My charts
                      </Link>
                      <Link
                        to="/profile"
                        className="navbar__drop-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Settings2 size={16} /> Profile settings
                      </Link>
                      {isHrAdmin && (
                        <Link
                          to="/admin"
                          className="navbar__drop-item navbar__drop-item--admin"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <ShieldCheck size={16} />
                          Admin portal
                          <ChevronRight size={14} className="navbar__drop-item-chevron" />
                        </Link>
                      )}
                    </div>

                    {/* Sign out */}
                    <div className="navbar__drop-section navbar__drop-section--border">
                      <button
                        className="navbar__drop-item navbar__drop-item--danger"
                        onClick={handleSignOut}
                      >
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar__link">
                <LogIn size={15} /> Sign In
              </Link>
              <Link to="/register" className="navbar__cta">
                <UserPlus size={15} /> Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
