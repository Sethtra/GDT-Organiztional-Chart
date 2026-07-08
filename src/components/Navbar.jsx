import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, LogIn, UserPlus, LogOut, User, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, displayName, avatarUrl, signOut } = useAuth();
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
          <img src="/gdt-logo.png" alt="GDT" style={{ height: 36, width: 36, objectFit: 'contain', borderRadius: '50%', background: 'white', padding: 2, flexShrink: 0 }} />
          <div>
            <div className="navbar__brand-kh">អគ្គនាយកដ្ឋានពន្ធដារ</div>
            <div className="navbar__brand-en">GDT Org Chart</div>
          </div>
        </Link>

        {/* Right side */}
        <div className="navbar__actions">
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
