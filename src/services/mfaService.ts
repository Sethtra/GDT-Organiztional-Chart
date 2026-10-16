import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "../supabaseClient";

export interface TotpEnrollment {
  factorId: string;
  /** SVG data URI to render as an <img> */
  qrCode: string;
  /** Base32 key for manual entry when the QR code cannot be scanned */
  secret: string;
}

const CODE_PATTERN = /^\d{6}$/;

/** The verified authenticator-app factor, if this account has one. */
export async function getVerifiedTotpFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error("Two-step sign-in settings could not be loaded.");
  return data.totp.find((factor) => factor.status === "verified")?.id ?? null;
}

/**
 * Starts authenticator-app setup. Abandoned, never-verified attempts are
 * removed first so a fresh QR code can always be issued.
 */
export async function startTotpEnrollment(): Promise<TotpEnrollment> {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) throw new Error("Two-step sign-in settings could not be loaded.");

  for (const factor of factors.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator app",
  });
  if (error || !data) throw new Error("Setup could not be started. Refresh the page and try again.");
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Verifies a 6-digit code; on success the session is upgraded to AAL2. */
export async function verifyTotpCode(factorId: string, code: string): Promise<void> {
  const trimmed = code.replace(/\s/g, "");
  if (!CODE_PATTERN.test(trimmed)) {
    throw new Error("Enter the 6-digit code from your authenticator app.");
  }
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: trimmed });
  if (error) {
    throw new Error(
      "That code didn't match. Codes change every 30 seconds — enter the newest one.",
    );
  }
}

/** HR administrators: remove every two-step factor from the account with this email. */
export async function resetUserMfa(email: string): Promise<void> {
  const { error } = await supabase.functions.invoke("reset-user-mfa", {
    body: { email: email.trim().toLowerCase() },
  });
  if (!error) return;
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (body && typeof body.error === "string") throw new Error(body.error);
  }
  throw new Error("Two-step sign-in could not be reset. Try again shortly.");
}
