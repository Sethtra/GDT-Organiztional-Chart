import { beforeEach, describe, expect, it, vi } from "vitest";

const mfa = vi.hoisted(() => ({
  listFactors: vi.fn(),
  unenroll: vi.fn(async () => ({ data: {}, error: null })),
  enroll: vi.fn(),
  challengeAndVerify: vi.fn(),
}));

vi.mock("../src/supabaseClient", () => ({
  supabase: { auth: { mfa }, functions: { invoke: vi.fn() } },
}));

import {
  getVerifiedTotpFactorId,
  startTotpEnrollment,
  verifyTotpCode,
} from "../src/services/mfaService";

describe("mfaService", () => {
  beforeEach(() => {
    Object.values(mfa).forEach((fn) => fn.mockClear());
  });

  it("finds only a verified authenticator factor", async () => {
    mfa.listFactors.mockResolvedValue({
      data: {
        all: [],
        totp: [
          { id: "pending", factor_type: "totp", status: "unverified" },
          { id: "done", factor_type: "totp", status: "verified" },
        ],
      },
      error: null,
    });
    await expect(getVerifiedTotpFactorId()).resolves.toBe("done");
  });

  it("removes abandoned setup attempts before issuing a new QR code", async () => {
    mfa.listFactors.mockResolvedValue({
      data: {
        all: [
          { id: "abandoned", factor_type: "totp", status: "unverified" },
          { id: "phone", factor_type: "phone", status: "unverified" },
        ],
        totp: [],
      },
      error: null,
    });
    mfa.enroll.mockResolvedValue({
      data: { id: "new", totp: { qr_code: "data:image/svg+xml,qr", secret: "SECRET" } },
      error: null,
    });

    await expect(startTotpEnrollment()).resolves.toEqual({
      factorId: "new",
      qrCode: "data:image/svg+xml,qr",
      secret: "SECRET",
    });
    expect(mfa.unenroll).toHaveBeenCalledTimes(1);
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "abandoned" });
  });

  it("rejects malformed codes locally and normalizes spaces", async () => {
    await expect(verifyTotpCode("f", "12345")).rejects.toThrow("6-digit code");
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled();

    mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    await verifyTotpCode("f", "123 456");
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "f", code: "123456" });
  });

  it("explains a rejected code", async () => {
    mfa.challengeAndVerify.mockResolvedValue({ data: null, error: { message: "Invalid TOTP code" } });
    await expect(verifyTotpCode("f", "123456")).rejects.toThrow("didn't match");
  });
});
