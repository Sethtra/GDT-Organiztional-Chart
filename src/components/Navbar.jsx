import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { LayoutDashboard, LogIn, UserPlus, LogOut, User, ChevronDown, Sun, Moon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, displayName, avatarUrl, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        {/* Brand */}
        <Link to="/" className="navbar__brand">
          <img
            src="/GDT Logo (Soft).png"
            alt="GDT - General Department of Taxation"
            style={{ height: 36, objectFit: 'contain' }}
          />
        </Link>

        {/* Right side */}
        <div className="navbar__actions">
          {/* Theme toggle: paused, not ready for release yet — un-comment to bring back.
          <button
            className="navbar__theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          */}
          {user ? (
            <>
              <Link
                to="/dashboard"
                className={`navbar__link ${isActive('/dashboard') ? 'navbar__link--active' : ''}`}
              >
                <LayoutDashboard size={15} /> Dashboard
              </Link>

              {/* User dropdown */}
              <div className="navbar__avatar-wrap" ref={dropRef}>
                <button
                  className="navbar__avatar-btn"
                  onClick={() => setDropdownOpen((v) => !v)}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="navbar__avatar-img" />
                  ) : (
                    <div className="navbar__avatar-initials">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="navbar__user-name">{displayName}</span>
                  <ChevronDown size={14} style={{ opacity: 0.6, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>

                {dropdownOpen && (
                  <div className="navbar__dropdown">
                    <Link to="/profile" className="navbar__drop-item" onClick={() => setDropdownOpen(false)}>
                      <User size={14} /> Profile Settings
                    </Link>
                    <div className="navbar__drop-divider" />
                    <button className="navbar__drop-item navbar__drop-item--danger" onClick={handleSignOut}>
                      <LogOut size={14} /> Sign Out
                    </button>
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
