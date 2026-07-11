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
  if (score === 3) return { level: 3, label: 'Good', color: '#0f5a34' };
  return { level: 4, label: 'Strong', color: '#0f5a34' };
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
    <div className="gov-auth-page">
      <div className="gov-auth-card">
        <div className="gov-auth-header">
          <img src="/gdt-seal.png" alt="GDT seal" className="gov-auth-seal" />
          <div className="gov-auth-brand">
            <div className="gov-auth-brand-khm">អគ្គនាយកដ្ឋានពន្ធដារ</div>
            <div className="gov-auth-brand-en">General Department of Taxation</div>
          </div>
        </div>

        <div className="gov-auth-body">
          {done ? (
            <div className="gov-auth-success-block">
              <CheckCircle size={48} style={{ color: '#0f5a34' }} />
              <h3>Password Updated!</h3>
              <p>Redirecting you to the dashboard...</p>
            </div>
          ) : (
            <>
              <div className="gov-auth-step-row">
                <span className="gov-auth-step-badge gov-auth-step-badge--2">2</span>
                <span className="gov-auth-step-label">Set a new password</span>
              </div>
              <div className="gov-auth-intro" style={{ textAlign: 'left' }}>
                <h1 className="gov-auth-title" style={{ fontSize: 20 }}>Choose a new password</h1>
                <p className="gov-auth-subtitle">Shown after the staff member opens the link from their email.</p>
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
                    <button type="button" className="gov-auth-input-icon-btn" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
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
                    <button type="button" className="gov-auth-input-icon-btn" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="gov-auth-submit-btn gov-auth-submit-btn--dark" disabled={loading}>
                  {loading ? (
                    <><Loader2 size={17} className="spin" /> Updating...</>
                  ) : 'Reset Password'}
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
