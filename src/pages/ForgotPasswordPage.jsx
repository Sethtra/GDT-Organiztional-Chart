import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

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
          {sent ? (
            <div className="gov-auth-success-block">
              <CheckCircle size={48} style={{ color: 'var(--link-color)' }} />
              <h3>Reset Link Sent!</h3>
              <p>
                Check your inbox at <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                The link expires in 1 hour.
              </p>
              <Link to="/login" className="gov-auth-submit-btn" style={{ marginTop: 24, textDecoration: 'none' }}>
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="gov-auth-step-row">
                <span className="gov-auth-step-badge gov-auth-step-badge--1">1</span>
                <span className="gov-auth-step-label">Request reset link</span>
              </div>
              <div className="gov-auth-intro" style={{ textAlign: 'left' }}>
                <h1 className="gov-auth-title">Forgot your password?</h1>
                <p className="gov-auth-subtitle">Enter the work email tied to your staff account and we'll send a reset link.</p>
              </div>

              {error && (
                <div className="gov-auth-error">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <form className="gov-auth-form" onSubmit={handleSubmit} noValidate>
                <div className="gov-auth-field">
                  <label className="gov-auth-label" htmlFor="forgot-email">Work email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="gov-auth-input"
                    placeholder="name@tax.gov.kh"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>

                <button type="submit" className="gov-auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <><Loader2 size={17} className="spin" /> Sending...</>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <p className="gov-auth-switch">
                <Link to="/login" className="gov-auth-switch-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ArrowLeft size={13} /> Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>

        <div className="gov-auth-footer">
          <div className="gov-auth-footer-text">Ministry of Economy and Finance, Kingdom of Cambodia</div>
        </div>
      </div>
    </div>
  );
}
