import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import MfaCodeForm from '../components/auth/MfaCodeForm';
import { getVerifiedTotpFactorId } from '../services/mfaService';

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

export default function ResetPasswordPage() {
  const { updatePassword, acceptInvite, user, mfaStatus } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteTokenHash =
    searchParams.get('type') === 'invite' ? searchParams.get('token_hash') : null;
  const isInvite = Boolean(inviteTokenHash);
  // 'verifying' → redeeming the one-time invitation token; 'invalid' → expired or used.
  const [inviteStatus, setInviteStatus] = useState(isInvite ? 'verifying' : 'ready');
  const inviteRedeemed = useRef(false);

  useEffect(() => {
    if (!inviteTokenHash || inviteRedeemed.current) return;
    // The token is single-use; StrictMode's second effect run must not spend it again.
    inviteRedeemed.current = true;
    acceptInvite(inviteTokenHash).then(({ error }) => {
      // Keep the one-time token out of browser history and shared screenshots.
      window.history.replaceState(null, '', '/reset-password');
      setInviteStatus(error ? 'invalid' : 'ready');
    });
  }, [acceptInvite, inviteTokenHash]);

  // An account that already has two-step sign-in must confirm a code before
  // Supabase accepts a password change; newly invited accounts have none yet.
  const [mfaFactorId, setMfaFactorId] = useState(null);
  useEffect(() => {
    if (inviteStatus !== 'ready' || !user || mfaStatus !== 'required') {
      setMfaFactorId(null);
      return undefined;
    }
    let cancelled = false;
    getVerifiedTotpFactorId()
      .then((factorId) => {
        if (!cancelled) setMfaFactorId(factorId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [inviteStatus, user, mfaStatus]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 2500);
    }
  };

  return (
    <div className="gov-auth-page">
      <div className="gov-auth-card">
        <Link to="/" className="gov-auth-header">
          <img
            src="/GDT-Logo (Soft).png"
            alt="GDT — General Department of Taxation"
            className="gov-auth-logo-img"
          />
        </Link>

        <div className="gov-auth-body">
          {inviteStatus === 'verifying' ? (
            <div className="gov-auth-success-block" role="status">
              <Loader2 size={32} className="spin" aria-hidden="true" />
              <h1>Checking your invitation…</h1>
            </div>
          ) : inviteStatus === 'invalid' ? (
            <div className="gov-auth-success-block" role="alert">
              <AlertCircle size={40} aria-hidden="true" style={{ color: 'var(--pa-danger)' }} />
              <h1>This invitation link no longer works</h1>
              <p>
                It has expired or was already used. Ask HR to resend your
                invitation, or sign in if you have already set a password.
              </p>
              <p className="gov-auth-switch">
                <Link to="/login" className="gov-auth-switch-link">Go to sign in</Link>
              </p>
            </div>
          ) : mfaFactorId ? (
            <>
              <div className="gov-auth-intro" style={{ textAlign: 'left' }}>
                <h1 className="gov-auth-title" style={{ fontSize: 20 }}>Confirm it's you</h1>
                <p className="gov-auth-subtitle">
                  Enter the 6-digit code from your authenticator app before
                  choosing a new password.
                </p>
              </div>
              <MfaCodeForm
                factorId={mfaFactorId}
                submitLabel="Continue"
                onVerified={() => setMfaFactorId(null)}
              />
            </>
          ) : done ? (
            <div className="gov-auth-success-block">
              <CheckCircle size={48} style={{ color: 'var(--link-color)' }} />
              <h3>{isInvite ? 'Password set!' : 'Password Updated!'}</h3>
              <p>Redirecting you to the dashboard...</p>
            </div>
          ) : (
            <>
              <div className="gov-auth-step-row">
                <span className="gov-auth-step-badge gov-auth-step-badge--2">2</span>
                <span className="gov-auth-step-label">
                  {isInvite ? 'Set your password' : 'Set a new password'}
                </span>
              </div>
              <div className="gov-auth-intro" style={{ textAlign: 'left' }}>
                <h1 className="gov-auth-title" style={{ fontSize: 20 }}>
                  {isInvite ? 'Welcome — set your password' : 'Choose a new password'}
                </h1>
                <p className="gov-auth-subtitle">
                  {isInvite
                    ? 'Your access request was approved. Choose a password to finish setting up your account.'
                    : 'Shown after the staff member opens the link from their email.'}
                </p>
              </div>

              {error && (
                <div className="gov-auth-error">
                  <AlertCircle size={15} /> <span>{error}</span>
                </div>
              )}

              <form className="gov-auth-form" onSubmit={handleSubmit} noValidate>
                <div className="gov-auth-field">
                  <label className="gov-auth-label" htmlFor="new-password">New password</label>
                  <div className="gov-auth-input-wrap">
                    <input
                      id="new-password"
                      type={showPass ? 'text' : 'password'}
                      className="gov-auth-input gov-auth-input--icon"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="gov-auth-input-icon-btn"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password && (
                    <div className="gov-auth-strength">
                      <div className="gov-auth-strength__bars">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="gov-auth-strength__bar"
                            style={{ background: i <= strength.level ? strength.color : undefined }} />
                        ))}
                      </div>
                      <span className="gov-auth-strength__label" style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  )}
                </div>

                <div className="gov-auth-field">
                  <label className="gov-auth-label" htmlFor="new-confirm">Confirm new password</label>
                  <div className="gov-auth-input-wrap">
                    <input
                      id="new-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      className={`gov-auth-input gov-auth-input--icon ${confirm && confirm !== password ? 'gov-auth-input--error' : ''}`}
                      placeholder="Repeat new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="gov-auth-input-icon-btn"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="gov-auth-submit-btn gov-auth-submit-btn--dark" disabled={loading}>
                  {loading ? (
                    <><Loader2 size={17} className="spin" /> Updating...</>
                  ) : isInvite ? 'Set Password' : 'Reset Password'}
                </button>
              </form>
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
