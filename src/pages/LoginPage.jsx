import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, LogIn } from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const accountDeleted = location.state?.accountDeleted === true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    const { error } = await signIn({ email, password });
    setLoading(false);
    if (error) {
      if (error.message?.toLowerCase().includes("invalid login")) {
        setError("Incorrect email or password. Please try again.");
      } else if (error.message?.toLowerCase().includes("email not confirmed")) {
        setError("Please verify your email before signing in.");
      } else {
        setError(error.message);
      }
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="gov-auth-page">
      <Link to="/" className="gov-auth-back-link">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Home
      </Link>

      <div className="gov-auth-card">
        <Link to="/" className="gov-auth-header">
          <img
            src="/GDT-Logo (Soft).png"
            alt="GDT — General Department of Taxation"
            className="gov-auth-logo-img"
          />
        </Link>

        <div className="gov-auth-body">
          <div className="gov-auth-intro">
            <h1 className="gov-auth-title">Welcome back</h1>
            <p className="gov-auth-subtitle">
              Sign in to manage the organizational chart
            </p>
          </div>

          {accountDeleted && (
            <div className="gov-auth-notice" role="status">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>Your account and owned chart data were deleted.</span>
            </div>
          )}

          {error && (
            <div className="gov-auth-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <form className="gov-auth-form" onSubmit={handleSubmit} noValidate>
            <div className="gov-auth-field">
              <label className="gov-auth-label" htmlFor="email">
                Email Address
              </label>
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
                <label className="gov-auth-label" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="gov-auth-forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="gov-auth-input-wrap">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
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
                  aria-label={showPass ? "Hide password" : "Show password"}
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
              <span className="gov-auth-checkbox-label">
                Remember me for 30 days
              </span>
            </label>

            <button
              type="submit"
              className="gov-auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="spin" /> Signing in...
                </>
              ) : (
                <>
                  <LogIn size={17} /> Sign In
                </>
              )}
            </button>
          </form>

          <p className="gov-auth-switch">
            Don't have an account?{" "}
            <Link to="/register" className="gov-auth-switch-link">
              Request access
            </Link>
          </p>
        </div>

        <div className="gov-auth-footer">
          <div className="gov-auth-footer-text">
            Ministry of Economy and Finance, Kingdom of Cambodia
          </div>
        </div>
      </div>
    </div>
  );
}
