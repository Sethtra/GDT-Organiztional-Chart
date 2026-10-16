import { useState, type FormEvent } from "react";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";

import { verifyTotpCode } from "../../services/mfaService";

/** Six-digit authenticator code entry; calls onVerified once the session is AAL2. */
export default function MfaCodeForm({
  factorId,
  submitLabel = "Verify",
  onVerified,
}: {
  factorId: string;
  submitLabel?: string;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setVerifying(true);
    try {
      await verifyTotpCode(factorId, code);
      onVerified();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Verification failed.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <form className="gov-auth-form" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="gov-auth-error" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <div className="gov-auth-field">
        <label className="gov-auth-label" htmlFor="mfa-code">6-digit code</label>
        <input
          id="mfa-code"
          className="gov-auth-input gov-auth-input--code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={verifying}
          aria-invalid={error ? true : undefined}
          autoFocus
        />
      </div>
      <button
        type="submit"
        className="gov-auth-submit-btn"
        disabled={verifying || code.length !== 6}
      >
        {verifying ? (
          <><Loader2 size={17} className="spin" aria-hidden="true" /> Verifying...</>
        ) : (
          <><ShieldCheck size={17} aria-hidden="true" /> {submitLabel}</>
        )}
      </button>
    </form>
  );
}
