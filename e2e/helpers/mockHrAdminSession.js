const PROJECT_ID = "ojuyrhwmgwefwdxdmisr";
const USER_ID = "00000000-0000-4000-8000-000000000001";

/** Verified authenticator factor for mock users (two-step sign-in is required). */
export const MOCK_VERIFIED_FACTORS = [
  {
    id: "00000000-0000-4000-8000-0000000000f1",
    factor_type: "totp",
    status: "verified",
    friendly_name: "Authenticator app",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

/**
 * Unsigned test access token for a session that has passed two-step sign-in.
 * supabase-js decodes it client-side to read the assurance level, so every
 * part must be valid base64url even though the signature is never checked.
 */
export function createMockAccessToken({ userId, email, expiresAt }) {
  const payload = Buffer.from(
    JSON.stringify({
      aud: "authenticated",
      exp: expiresAt,
      sub: userId,
      email,
      role: "authenticated",
      aal: "aal2",
      amr: [
        { method: "password", timestamp: expiresAt - 3600 },
        { method: "totp", timestamp: expiresAt - 3600 },
      ],
    }),
  ).toString("base64url");
  const signature = Buffer.from("e2e-test-signature").toString("base64url");
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.${signature}`;
}

export async function mockHrAdminSession(page) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const accessToken = createMockAccessToken({
    userId: USER_ID,
    email: "hr@example.com",
    expiresAt,
  });

  await page.addInitScript(
    ({ storageKey, token, expiration, userId, factors }) => {
      const session = JSON.stringify({
        access_token: token,
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        expires_at: expiration,
        token_type: "bearer",
        user: {
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          email: "hr@example.com",
          user_metadata: {},
          app_metadata: {},
          created_at: "2026-01-01T00:00:00.000Z",
          factors,
        },
      });
      localStorage.setItem(storageKey, btoa(encodeURIComponent(session)));
    },
    {
      storageKey: `__gdt_s_sb-${PROJECT_ID}-auth-token`,
      token: accessToken,
      expiration: expiresAt,
      userId: USER_ID,
      factors: MOCK_VERIFIED_FACTORS,
    },
  );

  await page.route("**/rest/v1/rpc/is_hr_admin", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "true",
    }),
  );
}
