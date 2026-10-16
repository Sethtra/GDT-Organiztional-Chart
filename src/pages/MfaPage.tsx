import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";

import MfaCodeForm from "../components/auth/MfaCodeForm";
import { useAuth } from "../hooks/useAuth";
import {
  getVerifiedTotpFactorId,
  startTotpEnrollment,
  type TotpEnrollment,
} from "../services/mfaService";

/** The slice of the (JavaScript) auth context this page uses. */
interface MfaAuthState {
  user: { id: string } | null;
  loading: boolean;
  mfaStatus: "loading" | "none" | "required" | "verified";
  signOut: () => Promise<{ error: unknown }>;
}

type Mode =
  | { kind: "loading" }
  | { kind: "verified" }
  | { kind: "error"; message: string }
  | { kind: "setup"; enrollment: TotpEnrollment }
  | { kind: "code"; factorId: string };

/** Two-step sign-in: first-time authenticator setup, or the code step at sign-in. */
export default function MfaPage() {
  const { user, loading, mfaStatus, signOut } = useAuth() as unknown as MfaAuthState;
  const navigate = useNavigate();
  const location = useLocation();
  const destination =
    (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (!user || mfaStatus !== "required" || started.current) return;
    // Enrollment creates a factor server-side; StrictMode must not start it twice.
    started.current = true;
    (async () => {
      try {
        const factorId = await getVerifiedTotpFactorId();
        setMode(
          factorId
            ? { kind: "code", factorId }
            : { kind: "setup", enrollment: await startTotpEnrollment() },
        );
      } catch (error) {
        setMode({
          kind: "error",
          message: error instanceof Error ? error.message : "Two-step sign-in could not start.",
        });
      }
    })();
  }, [user, mfaStatus]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (mfaStatus === "verified") return <Navigate to={destination} replace />;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  // The upgraded session reaches useAuth a moment later; its 'verified'
  // status triggers the redirect above, so the route guards never see a stale one.
  const handleVerified = () => setMode({ kind: "verified" });

  return (
    <div className="gov-auth-page">
      <div className="gov-auth-card">
        <div className="gov-auth-header">
          <img
            src="/GDT-Logo (Soft).png"
            alt="GDT — General Department of Taxation"
            className="gov-auth-logo-img"
          />
        </div>

        <div className="gov-auth-body">
          {mode.kind === "loading" && (
            <div className="gov-auth-success-block" role="status">
              <Loader2 size={32} className="spin" aria-hidden="true" />
              <h1>Preparing two-step sign-in…</h1>
            </div>
          )}

          {mode.kind === "verified" && (
            <div className="gov-auth-success-block" role="status">
              <Loader2 size={32} className="spin" aria-hidden="true" />
              <h1>Verified. Opening GDT Org Chart…</h1>
            </div>
          )}

          {mode.kind === "error" && (
            <div className="gov-auth-error" role="alert">
              <AlertCircle size={15} aria-hidden="true" />
              <span>{mode.message}</span>
            </div>
          )}

          {mode.kind === "setup" && (
            <>
              <div className="gov-auth-intro" style={{ textAlign: "left" }}>
                <h1 className="gov-auth-title">Set up two-step sign-in</h1>
                <p className="gov-auth-subtitle">
                  Every GDT Org Chart account needs a code from an authenticator
                  app, in addition to your password.
                </p>
              </div>

              <ol className="gov-auth-steps">
                <li>
                  Install an authenticator app on your phone, such as
                  <strong> Google Authenticator</strong> or
                  <strong> Microsoft Authenticator</strong>.
                </li>
                <li>
                  In the app, add an account and scan this code:
                  <img
                    className="gov-auth-qr"
                    src={mode.enrollment.qrCode}
                    alt="QR code to add GDT Org Chart to your authenticator app"
                    width={180}
                    height={180}
                  />
                  <span className="gov-auth-hint">
                    Can't scan it? Enter this key instead:
                  </span>
                  <code className="gov-auth-secret">{mode.enrollment.secret}</code>
                </li>
                <li>Enter the 6-digit code the app shows.</li>
              </ol>

              <div className="gov-auth-notice" role="note">
                <span>
                  Tip: scan the same code on a second phone or tablet too, so a
                  lost phone doesn't lock you out.
                </span>
              </div>

              <MfaCodeForm
                factorId={mode.enrollment.factorId}
                submitLabel="Turn on two-step sign-in"
                onVerified={handleVerified}
              />
            </>
          )}

          {mode.kind === "code" && (
            <>
              <div className="gov-auth-intro" style={{ textAlign: "left" }}>
                <h1 className="gov-auth-title">Enter your verification code</h1>
                <p className="gov-auth-subtitle">
                  Open your authenticator app and enter the 6-digit code for
                  GDT Org Chart.
                </p>
              </div>
              <MfaCodeForm factorId={mode.factorId} onVerified={handleVerified} />
            </>
          )}

          <p className="gov-auth-switch">
            Lost access to your authenticator app? Ask HR to reset two-step
            sign-in.{" "}
            <button type="button" className="gov-auth-switch-link gov-auth-link-btn" onClick={handleSignOut}>
              Sign out
            </button>
          </p>
        </div>

        <div className="gov-auth-footer">
          <div className="gov-auth-footer-text">Ministry of Economy and Finance, Kingdom of Cambodia</div>
        </div>
      </div>
    </div>
  );
}
