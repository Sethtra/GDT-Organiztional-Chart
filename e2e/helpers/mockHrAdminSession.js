const PROJECT_ID = "ojuyrhwmgwefwdxdmisr";
const USER_ID = "00000000-0000-4000-8000-000000000001";

export async function mockHrAdminSession(page) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const payload = Buffer.from(
    JSON.stringify({
      aud: "authenticated",
      exp: expiresAt,
      sub: USER_ID,
      email: "hr@example.com",
      role: "authenticated",
    }),
  ).toString("base64url");
  const accessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature`;

  await page.addInitScript(
    ({ storageKey, token, expiration, userId }) => {
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
        },
      });
      localStorage.setItem(storageKey, btoa(encodeURIComponent(session)));
    },
    {
      storageKey: `__gdt_s_sb-${PROJECT_ID}-auth-token`,
      token: accessToken,
      expiration: expiresAt,
      userId: USER_ID,
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
