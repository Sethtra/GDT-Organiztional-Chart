import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import {
  Network, Users, Share2, Download, Shield, Zap,
  ArrowRight, ChevronDown
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Network size={28} />,
    title: 'Drag & Drop Editor',
    desc: 'Build beautiful org charts with an intuitive canvas. Connect nodes, rearrange teams, and see changes instantly.',
    color: '#0e7d6e',
  },
  {
    icon: <Users size={28} />,
    title: 'Multi-User Collaboration',
    desc: 'Share your charts with colleagues. Grant view or edit access via secure links or email invites.',
    color: '#1e5799',
  },
  {
    icon: <Share2 size={28} />,
    title: 'One-Click Sharing',
    desc: 'Generate shareable links in seconds. Public or private, your charts are always accessible.',
    color: '#7c3aed',
  },
  {
    icon: <Download size={28} />,
    title: 'Export Anywhere',
    desc: 'Download your org chart as a high-resolution PNG, PDF, or SVG. Perfect for presentations.',
    color: '#b45309',
  },
  {
    icon: <Shield size={28} />,
    title: 'Secure & Private',
    desc: 'Enterprise-grade security backed by Supabase. Your data is encrypted and protected at all times.',
    color: '#dc2626',
  },
  {
    icon: <Zap size={28} />,
    title: 'Auto Layout',
    desc: 'One click to perfectly arrange your entire org chart. Vertical or horizontal — your choice.',
    color: '#d97706',
  },
];

const STEPS = [
  { n: '01', title: 'Create Your Account', desc: 'Sign up in seconds with your email or Google account. No credit card required.' },
  { n: '02', title: 'Design Your Chart', desc: 'Start from the GDT template or a blank canvas. Add nodes, connect teams, customize colors.' },
  { n: '03', title: 'Share & Export', desc: 'Share a view-only link with leadership or download a print-ready PNG for your reports.' },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="landing__hero">
        <div className="landing__hero-glow" />
        <div className="landing__hero-content">
          <div className="landing__badge">
            <span className="landing__badge-dot" />
            Official GDT Internal Tool — General Department of Taxation
          </div>
          <h1 className="landing__headline">
            Organize Your<br />
            <span className="landing__headline-accent">Ministry Structure</span><br />
            with Precision
          </h1>
          <p className="landing__sub">
            The professional org chart designer built for Cambodia's General Department of Taxation.
            Drag, drop, collaborate, and export in minutes.
          </p>
          <div className="landing__hero-cta">
            {user ? (
              <Link to="/dashboard" className="landing__btn-primary">
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link to="/register" className="landing__btn-primary">
                  Get Started Free <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="landing__btn-ghost">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Floating preview card */}
        <div className="landing__hero-card">
          <div className="landing__card-topbar">
            <span className="landing__card-dot" style={{ background: '#ff5f57' }} />
            <span className="landing__card-dot" style={{ background: '#ffbd2e' }} />
            <span className="landing__card-dot" style={{ background: '#28c840' }} />
            <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
              GDT Org Chart Editor
            </span>
          </div>
          <div className="landing__card-canvas">
            {/* Mini SVG org chart preview */}
            <svg width="100%" height="260" viewBox="0 0 380 260" fill="none">
              {/* Root */}
              <rect x="130" y="10" width="120" height="44" rx="8" fill="#0e7d6e" opacity="0.9"/>
              <text x="190" y="28" textAnchor="middle" fill="white" fontSize="9" fontWeight="700">Ministry</text>
              <text x="190" y="42" textAnchor="middle" fill="#a7f3d0" fontSize="7.5">ក្រសួង</text>
              {/* Lines */}
              <line x1="190" y1="54" x2="190" y2="78" stroke="#334155" strokeWidth="1.5"/>
              <line x1="80" y1="78" x2="300" y2="78" stroke="#334155" strokeWidth="1.5"/>
              <line x1="80" y1="78" x2="80" y2="92" stroke="#334155" strokeWidth="1.5"/>
              <line x1="190" y1="78" x2="190" y2="92" stroke="#334155" strokeWidth="1.5"/>
              <line x1="300" y1="78" x2="300" y2="92" stroke="#334155" strokeWidth="1.5"/>
              {/* L2 */}
              <rect x="30" y="92" width="100" height="40" rx="7" fill="#1e5799" opacity="0.9"/>
              <text x="80" y="108" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">Department A</text>
              <text x="80" y="122" textAnchor="middle" fill="#bfdbfe" fontSize="7">នាយកដ្ឋាន ក</text>
              <rect x="140" y="92" width="100" height="40" rx="7" fill="#1e5799" opacity="0.9"/>
              <text x="190" y="108" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">Department B</text>
              <text x="190" y="122" textAnchor="middle" fill="#bfdbfe" fontSize="7">នាយកដ្ឋាន ខ</text>
              <rect x="250" y="92" width="100" height="40" rx="7" fill="#1e5799" opacity="0.9"/>
              <text x="300" y="108" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">Department C</text>
              <text x="300" y="122" textAnchor="middle" fill="#bfdbfe" fontSize="7">នាយកដ្ឋាន គ</text>
              {/* L3 lines from Dept A */}
              <line x1="80" y1="132" x2="80" y2="150" stroke="#334155" strokeWidth="1.5"/>
              <line x1="55" y1="150" x2="105" y2="150" stroke="#334155" strokeWidth="1.5"/>
              <line x1="55" y1="150" x2="55" y2="160" stroke="#334155" strokeWidth="1.5"/>
              <line x1="105" y1="150" x2="105" y2="160" stroke="#334155" strokeWidth="1.5"/>
              <rect x="20" y="160" width="70" height="32" rx="6" fill="#1e4080" opacity="0.85"/>
              <text x="55" y="175" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="600">Division 1</text>
              <text x="55" y="187" textAnchor="middle" fill="#93c5fd" fontSize="6.5">ការិយាល័យ</text>
              <rect x="70" y="160" width="70" height="32" rx="6" fill="#1e4080" opacity="0.85"/>
              <text x="105" y="175" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="600">Division 2</text>
              <text x="105" y="187" textAnchor="middle" fill="#93c5fd" fontSize="6.5">ការិយាល័យ</text>
              {/* L3 from Dept B */}
              <line x1="190" y1="132" x2="190" y2="160" stroke="#334155" strokeWidth="1.5"/>
              <rect x="150" y="160" width="80" height="32" rx="6" fill="#1e4080" opacity="0.85"/>
              <text x="190" y="175" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="600">Office B1</text>
              <text x="190" y="187" textAnchor="middle" fill="#93c5fd" fontSize="6.5">ការិយាល័យ</text>
              {/* L3 from Dept C */}
              <line x1="300" y1="132" x2="300" y2="150" stroke="#334155" strokeWidth="1.5"/>
              <line x1="270" y1="150" x2="330" y2="150" stroke="#334155" strokeWidth="1.5"/>
              <line x1="270" y1="150" x2="270" y2="160" stroke="#334155" strokeWidth="1.5"/>
              <line x1="330" y1="150" x2="330" y2="160" stroke="#334155" strokeWidth="1.5"/>
              <rect x="232" y="160" width="74" height="32" rx="6" fill="#1e4080" opacity="0.85"/>
              <text x="269" y="175" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="600">Office C1</text>
              <text x="269" y="187" textAnchor="middle" fill="#93c5fd" fontSize="6.5">ការិយាល័យ</text>
              <rect x="296" y="160" width="74" height="32" rx="6" fill="#1e4080" opacity="0.85"/>
              <text x="333" y="175" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="600">Office C2</text>
              <text x="333" y="187" textAnchor="middle" fill="#93c5fd" fontSize="6.5">ការិយាល័យ</text>
              {/* Animated pulse ring */}
              <circle cx="190" cy="32" r="28" stroke="#0e7d6e" strokeWidth="1" strokeDasharray="4 4" opacity="0.4">
                <animateTransform attributeName="transform" type="rotate" from="0 190 32" to="360 190 32" dur="10s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
        </div>

        <div className="landing__hero-scroll">
          <ChevronDown size={20} className="landing__scroll-icon" />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="landing__section landing__features" id="features">
        <div className="landing__section-inner">
          <div className="landing__section-header">
            <span className="landing__section-tag">Everything You Need</span>
            <h2 className="landing__section-title">Built for Government Teams</h2>
            <p className="landing__section-sub">
              A complete toolkit for designing, managing, and sharing your organization's structure.
            </p>
          </div>
          <div className="landing__feature-grid">
            {FEATURES.map((f, i) => (
              <div className="landing__feature-card" key={i}>
                <div className="landing__feature-icon" style={{ color: f.color, background: `${f.color}18` }}>
                  {f.icon}
                </div>
                <h3 className="landing__feature-title">{f.title}</h3>
                <p className="landing__feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="landing__section landing__how" id="how-it-works">
        <div className="landing__section-inner">
          <div className="landing__section-header">
            <span className="landing__section-tag">Simple Process</span>
            <h2 className="landing__section-title">Up and Running in Minutes</h2>
          </div>
          <div className="landing__steps">
            {STEPS.map((s, i) => (
              <div className="landing__step" key={i}>
                <div className="landing__step-number">{s.n}</div>
                <div className="landing__step-body">
                  <h3 className="landing__step-title">{s.title}</h3>
                  <p className="landing__step-desc">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && <div className="landing__step-arrow"><ArrowRight size={20} /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="landing__cta-banner">
        <div className="landing__cta-glow" />
        <div className="landing__section-inner" style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="landing__cta-title">Ready to Organize Your Ministry?</h2>
          <p className="landing__cta-sub">Join GDT staff already using the platform. Free for all GDT users.</p>
          <Link to="/register" className="landing__btn-primary landing__btn-lg">
            Create Your Account <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="landing__footer">
        <div className="landing__section-inner landing__footer-inner">
          <div className="landing__footer-brand">
            <span style={{ fontSize: 24 }}>🏛️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#d4af37', fontSize: 13 }}>GDT Org Chart</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>General Department of Taxation</div>
            </div>
          </div>
          <div className="landing__footer-links">
            <Link to="/login" className="landing__footer-link">Sign In</Link>
            <Link to="/register" className="landing__footer-link">Register</Link>
          </div>
          <div style={{ fontSize: 11, color: '#475569' }}>
            © {new Date().getFullYear()} Ministry of Economy and Finance — Cambodia
          </div>
        </div>
      </footer>
    </div>
  );
}
