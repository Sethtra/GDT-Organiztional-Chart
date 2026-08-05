import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];

async function preparePage(page) {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "" }),
  );
  await page.route("https://fonts.gstatic.com/**", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
  await page.addInitScript(() => {
    localStorage.setItem("gdt_landing_theme", "light");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

for (const viewport of VIEWPORTS) {
  test(`civic landing is stable on ${viewport.name}`, async ({ page }, testInfo) => {
    const consoleProblems = [];
    const failedRequests = [];

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        consoleProblems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    await preparePage(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await expect(page.getByText("One structure. Every role in view.")).toBeVisible();
    await expect(page.getByRole("link", { name: "GDT organizational chart home" })).toBeVisible();

    const heroImage = page.getByRole("img", {
      name: "General Department of Taxation headquarters in Phnom Penh",
    });
    await expect(heroImage).toBeVisible();
    await expect
      .poll(() => heroImage.evaluate((image) => image.complete && image.naturalWidth > 0))
      .toBe(true);

    const moduleRegion = page.getByRole("region", {
      name: "Explore the connected GDT work areas",
    });
    await expect(moduleRegion.locator(".lc-module")).toHaveCount(3);

    const overflow = await page.evaluate(() => {
      const landing = document.querySelector(".landing-civic-page");
      return {
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        landing: landing ? landing.scrollWidth - landing.clientWidth : Number.POSITIVE_INFINITY,
      };
    });
    expect(overflow.document).toBeLessThanOrEqual(1);
    expect(overflow.landing).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: testInfo.outputPath(`landing-civic-${viewport.name}.png`),
    });

    const menuTrigger = page.getByRole("button", { name: "Open navigation" });
    if (viewport.width <= 1220) {
      await expect(menuTrigger).toBeVisible();
      await menuTrigger.click();
      const dialog = page.getByRole("dialog", { name: "Navigation" });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator(":focus")).toHaveCount(1);

      const sheetOverflow = await dialog.evaluate((node) => node.scrollWidth - node.clientWidth);
      expect(sheetOverflow).toBeLessThanOrEqual(1);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(menuTrigger).toBeFocused();
    } else {
      await expect(menuTrigger).toBeHidden();
      await expect(page.getByRole("navigation", { name: "Administrative areas" })).toBeVisible();
    }

    if (viewport.name === "mobile") {
      await page.getByRole("heading", {
        name: "How the organization is structured, and how privacy is protected",
      }).scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath("landing-civic-mobile-proof.png"),
      });
    }

    expect(consoleProblems).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}

test("theme switch swaps the wordmark and preserves the civic palette", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const landing = page.locator(".landing-civic-page");
  const brandImage = page
    .getByRole("link", { name: "GDT organizational chart home" })
    .getByRole("img");

  await expect(landing).toHaveAttribute("data-landing-theme", "light");
  await expect(brandImage).toHaveAttribute("src", "/GDT-Logo (Light).png");

  await page.getByRole("button", { name: "Switch to dark appearance" }).click();
  await expect(landing).toHaveAttribute("data-landing-theme", "dark");
  await expect(brandImage).toHaveAttribute("src", "/GDT-Logo (Dark).png");
});

test("signed-in profile exposes settings and completes logout", async ({ page }) => {
  const projectId = "ojuyrhwmgwefwdxdmisr";
  const userId = "00000000-0000-4000-8000-000000000001";
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const payload = Buffer.from(
    JSON.stringify({
      aud: "authenticated",
      exp: expiresAt,
      sub: userId,
      email: "member@gdt.gov.kh",
      role: "authenticated",
    }),
  ).toString("base64url");
  const accessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature`;
  let logoutCalled = false;

  await preparePage(page);
  await page.addInitScript(
    ({ storageKey, token, expiration, id }) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: token,
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          expires_at: expiration,
          token_type: "bearer",
          user: {
            id,
            aud: "authenticated",
            role: "authenticated",
            email: "member@gdt.gov.kh",
            user_metadata: { display_name: "Sokchea An" },
            app_metadata: {},
            created_at: "2026-01-01T00:00:00.000Z",
          },
        }),
      );
    },
    {
      storageKey: `sb-${projectId}-auth-token`,
      token: accessToken,
      expiration: expiresAt,
      id: userId,
    },
  );
  await page.route("**/rest/v1/rpc/is_hr_admin", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "false" }),
  );
  await page.route("**/auth/v1/logout**", (route) => {
    logoutCalled = true;
    return route.fulfill({ status: 204, body: "" });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const profile = page.locator(".lc-profile-trigger");
  await expect(profile).toBeVisible();
  await profile.click();
  const accountOptions = page.getByLabel("Account options");
  await expect(accountOptions.getByRole("link", { name: "Profile settings" })).toHaveAttribute(
    "href",
    "/profile",
  );
  await expect(accountOptions.getByRole("link", { name: "My charts" })).toHaveAttribute(
    "href",
    "/dashboard",
  );

  await accountOptions.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(logoutCalled).toBe(true);
});
