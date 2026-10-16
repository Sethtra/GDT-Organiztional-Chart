import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";

import { cn } from "../../lib/utils";
import { resetUserMfa } from "../../services/mfaService";

const BUTTON_BASE =
  "pa-focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

/** HR control for officers who lost their authenticator app. */
export default function MfaResetPanel() {
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const requestConfirmation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setResult({ tone: "danger", text: "Enter the officer's account email address." });
      return;
    }
    setConfirming(true);
  };

  const confirmReset = async () => {
    setBusy(true);
    try {
      await resetUserMfa(email);
      setResult({
        tone: "success",
        text: `Two-step sign-in was reset for ${email.trim().toLowerCase()}. They will set it up again at their next sign-in.`,
      });
      setEmail("");
      setConfirming(false);
    } catch (error) {
      setResult({
        tone: "danger",
        text: error instanceof Error ? error.message : "Two-step sign-in could not be reset.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="mfa-reset-title"
      className="mb-6 rounded-[14px] border border-[var(--pa-border)] bg-white px-5 py-4 shadow-[var(--pa-shadow)] sm:px-6"
    >
      <div className="flex items-start gap-2.5">
        <KeyRound size={16} className="mt-0.5 shrink-0 text-[var(--pa-primary)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="mfa-reset-title" className="text-[14px] font-extrabold text-[var(--pa-text)]">
            Reset two-step sign-in
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--pa-muted)]">
            For an officer who lost the phone or app that holds their sign-in codes.
          </p>

          <form onSubmit={requestConfirmation} className="mt-3 flex flex-wrap items-end gap-2" noValidate>
            <div className="min-w-[220px] flex-1">
              <label htmlFor="mfa-reset-email" className="text-[12px] font-bold text-[var(--pa-text)]">
                Account email
              </label>
              <input
                id="mfa-reset-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setConfirming(false);
                }}
                disabled={busy}
                autoComplete="off"
                className="mt-1 h-9 w-full rounded-lg border border-[var(--pa-border)] bg-white px-3 text-[12px] text-[var(--pa-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pa-primary)]/30"
              />
            </div>
            {!confirming && (
              <button
                type="submit"
                disabled={busy}
                className={cn(BUTTON_BASE, "border border-[var(--pa-border)] bg-white text-[var(--pa-text)] hover:border-[var(--pa-primary)]")}
              >
                Reset…
              </button>
            )}
          </form>

          {confirming && (
            <div className="mt-3 rounded-lg border border-[var(--pa-gold-border)] bg-[var(--pa-gold-soft)] p-3" role="alert">
              <p className="text-[12px] leading-5 text-[var(--pa-text)]">
                <strong>Confirm the officer's identity first</strong>, in person or by a
                phone call to a number on their staff record. After the reset, anyone
                who knows this account's password can set up two-step sign-in for it.
              </p>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className={cn(BUTTON_BASE, "border border-[var(--pa-border)] bg-white text-[var(--pa-muted)]")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReset}
                  disabled={busy}
                  className={cn(BUTTON_BASE, "bg-[var(--pa-danger)] text-white")}
                >
                  {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                  Identity confirmed — reset
                </button>
              </div>
            </div>
          )}

          <div aria-live="polite">
            {result && (
              <p
                className={cn(
                  "mt-3 flex items-start gap-2 text-[12px] font-bold",
                  result.tone === "success" ? "text-[var(--pa-primary)]" : "text-[var(--pa-danger)]",
                )}
              >
                {result.tone === "success" ? (
                  <CheckCircle2 size={14} className="mt-px shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle size={14} className="mt-px shrink-0" aria-hidden="true" />
                )}
                {result.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
