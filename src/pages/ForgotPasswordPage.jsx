import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, ArrowLeft, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    const { error } = await resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow--left" />
      <div className="auth-glow auth-glow--right" />

      <div className="auth-card">
        <div className="auth-card__header">
          <Link to="/" className="auth-card__brand">
            <span className="auth-card__emblem">🏛️</span>
            <div>
              <div className="auth-card__brand-kh">ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ</div>
              <div className="auth-card__brand-en">Ministry of Economy and Finance</div>
            </div>
          </Link>
          <h1 className="auth-card__title">Forgot Password?</h1>
          <p className="auth-card__sub">Enter your email and we'll send you a reset link</p>
        </div>

        {sent ? (
          <div className="auth-success-block">
            <CheckCircle size={48} style={{ color: '#059669' }} />
            <h3 style={{ marginTop: 16, color: '#ffffff', fontWeight: 700 }}>Reset Link Sent!</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>
              Check your inbox at <strong style={{ color: '#0ea5e9' }}>{email}</strong>.
              The link expires in 1 hour.
            </p>
            <Link to="/login" className="auth-submit-btn" style={{ marginTop: 24, display: 'inline-flex', textDecoration: 'none' }}>
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="auth-error">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="forgot-email">Email Address</label>
                <div className="auth-input-wrap">
                  <input
                    id="forgot-email"
                    type="email"
                    className="auth-input auth-input--icon-l"
                    placeholder="you@mef.gov.kh"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                  />
                  <Mail size={16} className="auth-input-icon-left" />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? (
                  <><Loader2 size={17} className="spin" /> Sending...</>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <p className="auth-switch" style={{ marginTop: 16 }}>
              <Link to="/login" className="auth-switch-link">
                <ArrowLeft size={13} style={{ verticalAlign: 'middle' }} /> Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
