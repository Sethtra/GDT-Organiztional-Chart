import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

function getPasswordStrength(pwd) {
  if (!pwd) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', color: '#dc2626' };
  if (score === 2) return { level: 2, label: 'Fair', color: '#d97706' };
  if (score === 3) return { level: 3, label: 'Good', color: '#0ea5e9' };
  return { level: 4, label: 'Strong', color: '#059669' };
}

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

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
    <div className="auth-page">
      <div className="auth-glow auth-glow--left" />
      <div className="auth-glow auth-glow--right" />

      <div className="auth-card">
        <div className="auth-card__header">
          <span className="auth-card__emblem" style={{ fontSize: 28 }}>🏛️</span>
          <h1 className="auth-card__title">Set New Password</h1>
          <p className="auth-card__sub">Create a strong new password for your account</p>
        </div>

        {done ? (
          <div className="auth-success-block">
            <CheckCircle size={48} style={{ color: '#059669' }} />
            <h3 style={{ marginTop: 16, color: '#ffffff', fontWeight: 700 }}>Password Updated!</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>
              Redirecting you to the dashboard...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="auth-error">
                <AlertCircle size={15} /> <span>{error}</span>
              </div>
            )}
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="new-password">New Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="new-password"
                    type={showPass ? 'text' : 'password'}
                    className="auth-input auth-input--icon-r"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button type="button" className="auth-input-icon-btn" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && (
                  <div className="auth-strength">
                    <div className="auth-strength__bars">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="auth-strength__bar"
                          style={{ background: i <= strength.level ? strength.color : 'rgba(255,255,255,.1)' }} />
                      ))}
                    </div>
                    <span className="auth-strength__label" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="new-confirm">Confirm New Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="new-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className={`auth-input auth-input--icon-r ${confirm && confirm !== password ? 'auth-input--error' : ''}`}
                    placeholder="Repeat new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button type="button" className="auth-input-icon-btn" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? (
                  <><Loader2 size={17} className="spin" /> Updating...</>
                ) : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
