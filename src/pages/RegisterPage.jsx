import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Loader2, AlertCircle, UserPlus } from 'lucide-react';

function getPasswordStrength(pwd) {
  if (!pwd) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', color: '#dc2626' };
  if (score === 2) return { level: 2, label: 'Fair', color: '#d97706' };
  if (score === 3) return { level: 3, label: 'Good', color: 'var(--link-color)' };
  return { level: 4, label: 'Strong', color: 'var(--link-color)' };
}

export default function RegisterPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) { setError('Please enter your display name.'); return; }
    if (!email) { setError('Please enter your email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('You must agree to the terms to continue.'); return; }

    setLoading(true);
    const { error } = await signUp({ email, password, displayName: displayName.trim() });
    setLoading(false);

    if (error) {
      if (error.message?.includes('already registered')) {
        setError('An account with this email already exists. Try signing in.');
      } else {
        setError(error.message);
      }
    } else {
      // Pass the email so verify page can display it
      navigate('/verify-email', { state: { email } });
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  return (
    <div className="gov-auth-page">
      <Link to="/" className="gov-auth-back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Home
      </Link>

      <div className="gov-auth-card">
        <Link to="/" className="gov-auth-header">
          <img src="/gdt-seal.png" alt="GDT seal" className="gov-auth-seal" />
          <div className="gov-auth-brand">
            <div className="gov-auth-brand-khm">អគ្គនាយកដ្ឋានពន្ធដារ</div>
            <div className="gov-auth-brand-en">General Department of Taxation</div>
          </div>
        </Link>

        <div className="gov-auth-body">
          <div className="gov-auth-intro">
            <h1 className="gov-auth-title">Create staff account</h1>
            <p className="gov-auth-subtitle">Join the GDT Org Chart platform — free for all GDT staff</p>
          </div>

          <button
            className="gov-auth-google-btn"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            type="button"
          >
            {googleLoading ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707C3.784 10.167 3.682 9.59 3.682 9s.102-1.167.282-1.707V4.961H.957C.347 6.174 0 7.548 0 9s.348 2.826.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            Sign up with Google
          </button>

          <div className="gov-auth-divider">
            <span className="gov-auth-divider__line" />
            <span className="gov-auth-divider__text">or register with email</span>
            <span className="gov-auth-divider__line" />
          </div>

          {error && (
            <div className="gov-auth-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <form className="gov-auth-form" onSubmit={handleSubmit} noValidate>
            <div className="gov-auth-field">
              <label className="gov-auth-label" htmlFor="displayName">Full name</label>
              <input
                id="displayName"
                type="text"
                className="gov-auth-input"
                placeholder="e.g. Sok Dara"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                disabled={loading}
              />
            </div>

            <div className="gov-auth-field">
              <label className="gov-auth-label" htmlFor="reg-email">Work email</label>
              <input
                id="reg-email"
                type="email"
                className="gov-auth-input"
                placeholder="name@tax.gov.kh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="gov-auth-field">
              <label className="gov-auth-label" htmlFor="reg-password">Password</label>
              <div className="gov-auth-input-wrap">
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  className="gov-auth-input gov-auth-input--icon"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button type="button" className="gov-auth-input-icon-btn" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && (
                <div className="gov-auth-strength">
                  <div className="gov-auth-strength__bars">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="gov-auth-strength__bar"
                        style={{ background: i <= strength.level ? strength.color : undefined }}
                      />
                    ))}
                  </div>
                  <span className="gov-auth-strength__label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="gov-auth-field">
              <label className="gov-auth-label" htmlFor="confirm-password">Confirm password</label>
              <div className="gov-auth-input-wrap">
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  className={`gov-auth-input gov-auth-input--icon ${confirm && confirm !== password ? 'gov-auth-input--error' : ''}`}
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button type="button" className="gov-auth-input-icon-btn" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirm && confirm !== password && (
                <span className="gov-auth-field-hint gov-auth-field-hint--error">Passwords don't match</span>
              )}
            </div>

            <label className="gov-auth-checkbox-row">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="gov-auth-checkbox"
              />
              <span className="gov-auth-checkbox-label">
                I agree to the <span className="link">Terms of Service</span> and{' '}
                <span className="link">Privacy Policy</span>
              </span>
            </label>

            <button type="submit" className="gov-auth-submit-btn" disabled={loading || googleLoading}>
              {loading ? (
                <><Loader2 size={17} className="spin" /> Creating account...</>
              ) : (
                <><UserPlus size={17} /> Create Account</>
              )}
            </button>
          </form>

          <p className="gov-auth-switch">
            Already have an account?{' '}
            <Link to="/login" className="gov-auth-switch-link">Sign In</Link>
          </p>
        </div>

        <div className="gov-auth-footer">
          <div className="gov-auth-footer-text">Ministry of Economy and Finance, Kingdom of Cambodia</div>
        </div>
      </div>
    </div>
  );
}
