import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function VerifyEmailPage() {
  const { resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Poll for session every 3s → auto-redirect once verified
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        clearInterval(interval);
        navigate('/dashboard');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    await resendVerificationEmail(email);
    setResending(false);
    setResent(true);
    setCooldown(60);
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow--left" />
      <div className="auth-glow auth-glow--right" />

      <div className="auth-card auth-card--centered">
        <div className="auth-verify-icon">
          <Mail size={48} className="auth-verify-mail" />
          <div className="auth-verify-pulse" />
        </div>

        <h1 className="auth-card__title" style={{ marginTop: 24 }}>Check Your Inbox</h1>
        <p className="auth-card__sub" style={{ maxWidth: 340, margin: '8px auto 0' }}>
          We sent a verification link to
          {email && <strong style={{ color: '#0ea5e9', display: 'block', marginTop: 4 }}>{email}</strong>}
          Click the link in the email to activate your account.
        </p>

        <div className="auth-verify-steps">
          <div className="auth-verify-step">
            <span className="auth-verify-step-num">1</span>
            Open your email inbox
          </div>
          <div className="auth-verify-step">
            <span className="auth-verify-step-num">2</span>
            Find the email from GDT Org Chart
          </div>
          <div className="auth-verify-step">
            <span className="auth-verify-step-num">3</span>
            Click "Confirm your email" — you'll be redirected automatically
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
          <Loader2 size={14} className="spin" />
          Waiting for verification...
        </div>

        {resent && !resending && (
          <div className="auth-success" style={{ marginTop: 16 }}>
            <CheckCircle size={15} /> Verification email resent!
          </div>
        )}

        <button
          className="auth-submit-btn"
          onClick={handleResend}
          disabled={resending || cooldown > 0 || !email}
          style={{ marginTop: 20 }}
        >
          {resending ? (
            <><Loader2 size={16} className="spin" /> Sending...</>
          ) : cooldown > 0 ? (
            <><RefreshCw size={16} /> Resend in {cooldown}s</>
          ) : (
            <><RefreshCw size={16} /> Resend Verification Email</>
          )}
        </button>

        <p className="auth-switch" style={{ marginTop: 16 }}>
          Wrong email?{' '}
          <Link to="/register" className="auth-switch-link">Start over</Link>
          {' '}·{' '}
          <Link to="/login" className="auth-switch-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
