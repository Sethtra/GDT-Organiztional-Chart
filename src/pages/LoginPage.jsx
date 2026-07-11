import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Loader2, AlertCircle, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const { error } = await signIn({ email, password });
    setLoading(false);
    if (error) {
      if (error.message?.toLowerCase().includes('invalid login')) {
        setError('Incorrect email or password. Please try again.');
      } else if (error.message?.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email before signing in.');
      } else {
        setError(error.message);
      }
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    // Google OAuth redirects the page, so no further action needed here
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
            <h1 className="gov-auth-title">Welcome back</h1>
            <p className="gov-auth-subtitle">Sign in to manage the organizational chart</p>
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
            Continue with Google
          </button>

          <div className="gov-auth-divider">
            <span className="gov-auth-divider__line" />
            <span className="gov-auth-divider__text">or sign in with email</span>
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
              <label className="gov-auth-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="gov-auth-input"
                placeholder="you@mef.gov.kh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="gov-auth-field">
              <div className="gov-auth-label-row">
                <label className="gov-auth-label" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="gov-auth-forgot-link">Forgot password?</Link>
              </div>
              <div className="gov-auth-input-wrap">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="gov-auth-input gov-auth-input--icon"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="gov-auth-input-icon-btn"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="gov-auth-checkbox-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="gov-auth-checkbox"
              />
              <span className="gov-auth-checkbox-label">Remember me for 30 days</span>
            </label>

            <button
              type="submit"
              className="gov-auth-submit-btn"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <><Loader2 size={17} className="spin" /> Signing in...</>
              ) : (
                <><LogIn size={17} /> Sign In</>
              )}
            </button>
          </form>

          <p className="gov-auth-switch">
            Don't have an account?{' '}
            <Link to="/register" className="gov-auth-switch-link">Create one</Link>
          </p>
        </div>

        <div className="gov-auth-footer">
          <div className="gov-auth-footer-text">Ministry of Economy and Finance, Kingdom of Cambodia</div>
        </div>
      </div>
    </div>
  );
}
