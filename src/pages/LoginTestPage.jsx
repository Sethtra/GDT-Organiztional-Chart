import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRoundCheck,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const DEMO_EMAIL = 'demo@gdt.gov.kh';
const DEMO_PASSWORD = 'GDT-demo-2026';

export default function LoginTestPage() {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState(null);

  const emailInvalid = submitted && !email.trim();
  const passwordInvalid = submitted && !password;

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (!email.trim() || !password) {
      setNotice({
        type: 'error',
        message: 'Enter an email address and password to test the form state.',
      });
      return;
    }

    setNotice({
      type: 'success',
      message: 'UI demo complete. No authentication request was sent.',
    });
  };

  const fillDemoCredentials = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setSubmitted(false);
    setNotice({
      type: 'info',
      message: 'Demo credentials filled locally. You can now test Sign in.',
    });
  };

  const showInactiveFeature = (feature) => {
    setNotice({
      type: 'info',
      message: `${feature} is clickable for this prototype, but no backend is connected.`,
    });
  };

  return (
    <div className="login-test-page">
      <div className="login-test-glow login-test-glow--one" aria-hidden="true" />
      <div className="login-test-glow login-test-glow--two" aria-hidden="true" />

      <header className="login-test-topbar">
        <Link to="/" className="login-test-brand" aria-label="GDT home">
          <img
            src={theme === 'dark' ? '/GDT-Logo (Dark).png' : '/GDT-Logo (Light).png'}
            alt=""
          />
        </Link>

        <div className="login-test-topbar__actions">
          <span className="login-test-prototype-badge">
            <Sparkles size={13} aria-hidden="true" />
            UI prototype
          </span>
          <button
            type="button"
            className="login-test-icon-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link to="/" className="login-test-home-link">
            <ArrowLeft size={15} aria-hidden="true" />
            Home
          </Link>
        </div>
      </header>

      <main className="login-test-shell">
        <section className="login-test-story" aria-labelledby="login-test-story-title">
          <div className="login-test-story__content">
            <div className="login-test-eyebrow">
              <span className="login-test-eyebrow__line" />
              General Department of Taxation
            </div>

            <h1 id="login-test-story-title">
              Organizational clarity starts with secure access.
            </h1>
            <p className="login-test-story__lead">
              One protected workspace for maintaining reporting lines, team structures,
              and the institutional record.
            </p>

            <div className="login-test-benefits" aria-label="Workspace benefits">
              <div className="login-test-benefit">
                <span><ShieldCheck size={18} aria-hidden="true" /></span>
                <div>
                  <strong>Permission-aware</strong>
                  <small>Access aligned to staff responsibilities</small>
                </div>
              </div>
              <div className="login-test-benefit">
                <span><Building2 size={18} aria-hidden="true" /></span>
                <div>
                  <strong>One institutional view</strong>
                  <small>Structure and reporting lines in one place</small>
                </div>
              </div>
              <div className="login-test-benefit">
                <span><UserRoundCheck size={18} aria-hidden="true" /></span>
                <div>
                  <strong>Built for staff</strong>
                  <small>Focused workflows with a clear audit trail</small>
                </div>
              </div>
            </div>
          </div>

          <div className="login-test-visual">
            <img src="/building-city.png" alt="General Department of Taxation headquarters" />
            <div className="login-test-visual__shade" aria-hidden="true" />
            <div className="login-test-visual__caption">
              <img src="/gdt-seal.png" alt="" />
              <div>
                <span>Kingdom of Cambodia</span>
                <strong>Ministry of Economy and Finance</strong>
              </div>
              <Check size={17} aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="login-test-card" aria-labelledby="login-test-title">
          <div className="login-test-card__heading">
            <div className="login-test-seal-wrap">
              <img src="/gdt-seal.png" alt="" />
            </div>
            <div>
              <p lang="km">អគ្គនាយកដ្ឋានពន្ធដារ</p>
              <span>Internal Organization Workspace</span>
            </div>
          </div>

          <div className="login-test-card__intro">
            <span className="login-test-kicker">Staff access</span>
            <h2 id="login-test-title">Welcome back</h2>
            <p>Enter your work account details to continue.</p>
          </div>

          {notice && (
            <div
              className={`login-test-notice login-test-notice--${notice.type}`}
              role={notice.type === 'error' ? 'alert' : 'status'}
            >
              {notice.type === 'success' ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Sparkles size={16} aria-hidden="true" />
              )}
              <span>{notice.message}</span>
            </div>
          )}

          <form className="login-test-form" onSubmit={handleSubmit} noValidate>
            <div className="login-test-field">
              <label htmlFor="test-login-email">Work email</label>
              <div className={`login-test-control ${emailInvalid ? 'login-test-control--error' : ''}`}>
                <Mail size={17} aria-hidden="true" />
                <input
                  id="test-login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@gdt.gov.kh"
                  autoComplete="email"
                  aria-invalid={emailInvalid}
                  aria-describedby={emailInvalid ? 'test-login-email-error' : undefined}
                />
              </div>
              {emailInvalid && (
                <span id="test-login-email-error" className="login-test-field-error">
                  Enter your work email.
                </span>
              )}
            </div>

            <div className="login-test-field">
              <div className="login-test-label-row">
                <label htmlFor="test-login-password">Password</label>
                <button
                  type="button"
                  className="login-test-text-btn"
                  onClick={() => showInactiveFeature('Password recovery')}
                >
                  Forgot password?
                </button>
              </div>
              <div className={`login-test-control ${passwordInvalid ? 'login-test-control--error' : ''}`}>
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  id="test-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={passwordInvalid}
                  aria-describedby={passwordInvalid ? 'test-login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="login-test-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {passwordInvalid && (
                <span id="test-login-password-error" className="login-test-field-error">
                  Enter your password.
                </span>
              )}
            </div>

            <div className="login-test-options">
              <label className="login-test-checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span aria-hidden="true"><Check size={12} /></span>
                Keep me signed in
              </label>
              <button
                type="button"
                className="login-test-demo-btn"
                onClick={fillDemoCredentials}
              >
                Fill demo details
              </button>
            </div>

            <button type="submit" className="login-test-submit">
              Sign in
              <ArrowRight size={17} aria-hidden="true" />
            </button>

            <div className="login-test-divider">
              <span />
              <small>or</small>
              <span />
            </div>

            <button
              type="button"
              className="login-test-sso"
              onClick={() => showInactiveFeature('Government SSO')}
            >
              <KeyRound size={17} aria-hidden="true" />
              Continue with government SSO
            </button>
          </form>

          <p className="login-test-demo-note">
            Prototype only — this page never sends credentials or signs in.
          </p>
        </section>
      </main>
    </div>
  );
}
