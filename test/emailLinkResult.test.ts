import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/supabaseClient", () => ({
  supabase: { auth: {} },
  clearAuthStorage: vi.fn(),
}));

import { readEmailLinkResult } from "../src/hooks/useAuth";

function visit(url: string) {
  window.history.replaceState(null, "", url);
}

describe("readEmailLinkResult", () => {
  afterEach(() => visit("/"));

  it("takes an invitation session from the address and removes it from history", () => {
    visit("/#access_token=aaa&refresh_token=bbb&expires_in=3600&type=invite");

    expect(readEmailLinkResult()).toEqual({
      accessToken: "aaa",
      refreshToken: "bbb",
      type: "invite",
    });
    expect(window.location.hash).toBe("");
  });

  it("accepts password-recovery links too", () => {
    visit("/reset-password#access_token=aaa&refresh_token=bbb&type=recovery");

    expect(readEmailLinkResult()).toMatchObject({ type: "recovery" });
    expect(window.location.pathname).toBe("/reset-password");
  });

  it("reports an expired or used link", () => {
    visit("/#error=access_denied&error_code=otp_expired&error_description=expired");

    expect(readEmailLinkResult()).toEqual({ error: true });
    expect(window.location.hash).toBe("");
  });

  it("ignores ordinary addresses and other sign-in types", () => {
    visit("/dashboard#section");
    expect(readEmailLinkResult()).toBeNull();

    visit("/#access_token=aaa&refresh_token=bbb&type=magiclink");
    expect(readEmailLinkResult()).toBeNull();
    expect(window.location.hash).toBe("#access_token=aaa&refresh_token=bbb&type=magiclink");
  });
});
