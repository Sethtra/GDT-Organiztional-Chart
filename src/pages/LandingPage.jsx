import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon, LayoutDashboard, ChevronDown, User, LogOut } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export default function LandingPage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  /* Unlock scrolling for the landing page.
     The app's body/root/app-wrapper all set overflow:hidden + height:100vh
     for the chart builder — we temporarily override that here. */
  useEffect(() => {
    const body = document.body;
    const root = document.getElementById('root');
    const appWrap = document.querySelector('.app-wrapper');
    // Save originals
    const origBody = { overflow: body.style.overflow, height: body.style.height };
    const origRoot = root ? { height: root.style.height } : null;
    const origWrap = appWrap ? { overflow: appWrap.style.overflow, height: appWrap.style.height } : null;
    // Override
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) root.style.height = 'auto';
    if (appWrap) { appWrap.style.overflow = 'visible'; appWrap.style.height = 'auto'; }
    return () => {
      body.style.overflow = origBody.overflow;
      body.style.height = origBody.height;
      if (root && origRoot) root.style.height = origRoot.height;
      if (appWrap && origWrap) { appWrap.style.overflow = origWrap.overflow; appWrap.style.height = origWrap.height; }
    };
  }, []);

  return (
    <div className="landing-page" style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)', fontFamily: '"Inter", sans-serif' }}>
      
      {/* ====== LANDING NAVBAR ====== */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 64px',
        backdropFilter: 'blur(14px)',
        background: 'rgba(var(--bg-surface-rgb), .85)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {/* Left: Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img 
            src={theme === 'dark' ? "/GDT-Logo (Dark).png" : "/GDT-Logo (Light).png"} 
            alt="GDT logo" 
            style={{ height: 40, objectFit: 'contain' }} 
          />
        </Link>
        {/* Right: Theme toggle + Dashboard/Login */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border-subtle)',
              background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .2s',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link to="/dashboard" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500, textDecoration: 'none',
              }}>
                <LayoutDashboard size={15} /> Dashboard
              </Link>
              
              {/* User dropdown (Copied from Navbar) */}
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
                    <Link
                      to="/profile"
                      className="navbar__drop-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User size={14} /> Profile Settings
                    </Link>
                    <div className="navbar__drop-divider" />
                    <button
                      className="navbar__drop-item navbar__drop-item--danger"
                      onClick={handleSignOut}
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              style={{
                fontSize: 13.5, fontWeight: 600, padding: '11px 22px', borderRadius: 100,
                color: '#fff', background: '#0f5a34', textDecoration: 'none',
                transition: 'transform .2s ease, box-shadow .2s ease',
              }}
            >
              Staff Login
            </Link>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: 1360, margin: '0 auto', paddingBottom: 60 }}>
        
        {/* ====== HERO SECTION ====== */}
        <div style={{ position: 'relative', padding: '80px 64px 60px' }}>
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 56, alignItems: 'center' }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 1, background: 'linear-gradient(90deg, #c9a94d, transparent)' }} />
                <div style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: '#a4832f' }}>Kingdom of Cambodia · MEF</div>
              </div>
              <h1 style={{
                margin: 0, fontFamily: '"Source Serif 4", serif',
                fontSize: 56, lineHeight: 1.15, color: theme === 'dark' ? 'var(--text-primary)' : '#0f5a34', fontWeight: 600, letterSpacing: '-1px',
              }}>
                The Department,<br />structured with clarity.
              </h1>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.75, color: 'var(--text-secondary)', maxWidth: 460, fontWeight: 400 }}>
                A refined organizational chart platform for the General Department of Taxation — precise reporting lines, always current, built for an institution of record.
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <Link
                  to={user ? "/dashboard" : "/login"}
                  className="landing-cta-primary"
                  style={{
                    position: 'relative', overflow: 'hidden',
                    background: '#0f5a34', color: '#fff', fontWeight: 600, fontSize: 15,
                    padding: '16px 30px', borderRadius: 100, textDecoration: 'none',
                    transition: 'transform .2s ease, box-shadow .2s ease',
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 1 }}>Launch Chart Builder</span>
                  <span style={{
                    position: 'absolute', top: 0, left: 0, width: '36%', height: '100%',
                    background: 'linear-gradient(120deg, transparent, rgba(255,255,255,.28), transparent)',
                    animation: 'shine 3.8s ease-in-out infinite',
                  }} />
                </Link>
                {!user && (
                  <Link
                    to="/login"
                    style={{
                      border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 15,
                      padding: '16px 30px', borderRadius: 100, textDecoration: 'none',
                      transition: 'border-color .2s ease, transform .2s ease',
                      background: 'var(--bg-surface)'
                    }}
                  >
                    Staff Login
                  </Link>
                )}
              </div>
            </div>
            {/* Right column — building image + floating badge */}
            <div style={{ position: 'relative' }}>
              <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 80px -24px rgba(0,0,0,.28)' }}>
                <img src="/building-city.png" alt="GDT headquarters" style={{ width: '100%', display: 'block' }} />
              </div>
              {/* Floating "Head Office" badge */}
              <div style={{
                position: 'absolute', bottom: -22, left: -22,
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14,
                padding: '18px 22px',
                boxShadow: '0 20px 40px -16px rgba(0,0,0,.22)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <img src="/gdt-seal.png" alt="GDT Seal" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Head Office</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Phnom Penh, Cambodia</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ====== FEATURES SECTION ====== */}
        <div style={{ padding: '80px 64px 72px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, gap: 40 }}>
            <h2 style={{
              margin: 0, fontFamily: '"Source Serif 4", serif',
              fontSize: 32, color: theme === 'dark' ? 'var(--text-primary)' : '#0f5a34', fontWeight: 600, letterSpacing: '-.5px', maxWidth: 440,
            }}>
              Built for an institution that never stops evolving.
            </h2>
            <div style={{ width: 64, height: 1, background: '#c9a94d', flex: 'none', marginBottom: 10 }} />
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
            background: 'var(--border-subtle)', borderRadius: 16, overflow: 'hidden',
            border: '1px solid var(--border-subtle)'
          }}>
            {[
              { n: '01', title: 'Build the structure', desc: 'Add departments, units, and positions on a precise drag-and-drop canvas.' },
              { n: '02', title: 'Keep it current', desc: 'Update reporting lines and personnel the moment the Department changes.' },
              { n: '03', title: 'Share and export', desc: 'Publish the live chart for staff, or export a polished version for print.' },
            ].map((f) => (
              <div key={f.n} style={{
                background: 'var(--bg-surface)', padding: '40px 32px',
                display: 'flex', flexDirection: 'column', gap: 14,
                transition: 'transform .25s ease',
              }}>
                <div style={{ fontFamily: '"Source Serif 4", serif', fontSize: 13, color: '#a4832f', fontWeight: 600 }}>{f.n}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ====== CTA BAND ====== */}
        <div style={{ padding: '0 64px 72px' }}>
          <div style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, #0f5a34, #0a3b21)',
            boxShadow: '0 24px 48px -12px rgba(15,90,52,.35)',
            padding: '56px 64px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32,
          }}>
            <div>
              <div style={{ fontFamily: '"Source Serif 4", serif', fontSize: 26, color: '#ffffff', fontWeight: 600, marginBottom: 8 }}>
                Ready to see the full structure?
              </div>
              <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,.7)' }}>
                Open the live chart builder for the Department.
              </div>
            </div>
            <Link
              to={user ? "/dashboard" : "/login"}
              style={{
                flex: 'none',
                background: 'linear-gradient(135deg, #e9dca6, #c9a94d)',
                color: '#0c0f0d', fontWeight: 700, fontSize: 14.5,
                padding: '16px 30px', borderRadius: 100, textDecoration: 'none',
                transition: 'transform .2s, box-shadow .2s',
              }}
            >
              Launch Chart Builder
            </Link>
          </div>
        </div>

        {/* ====== FOOTER ====== */}
        <div style={{
          padding: '26px 64px 0',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Ministry of Economy and Finance, Kingdom of Cambodia</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>© General Department of Taxation</div>
        </div>
      </main>
    </div>
  );
}
