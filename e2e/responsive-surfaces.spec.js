import { expect, test } from "@playwright/test";

import { mockHrAdminSession } from "./helpers/mockHrAdminSession";

const VIEWPORTS = [
  { name: "small-phone", width: 320, height: 568 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "laptop", width: 1440, height: 900 },
  { name: "wide-desktop", width: 1920, height: 1080 },
];

const PUBLIC_SURFACES = [
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/test-chart-editor",
];

async function blockRemoteFonts(page) {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
  await page.route("https://fonts.gstatic.com/**", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
}

async function expectNoDocumentOverflow(page, route) {
  const metrics = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const rootWidth = document.querySelector("#root")?.scrollWidth ?? 0;
    return {
      overflow: Math.max(documentWidth, bodyWidth, rootWidth) - window.innerWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(metrics.overflow, `${route} overflowed at ${metrics.viewportWidth}px`).toBeLessThanOrEqual(1);
}

for (const viewport of VIEWPORTS) {
  test(`public surfaces fit the ${viewport.name} viewport`, async ({ page }) => {
    await blockRemoteFonts(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);

    for (const route of PUBLIC_SURFACES) {
      await page.goto(route);
      await expect(page.locator("#root")).toBeVisible();
      await expectNoDocumentOverflow(page, route);
    }
  });
}

for (const viewport of [VIEWPORTS[0], VIEWPORTS[2], VIEWPORTS[4]]) {
  test(`admin catalogs fit the ${viewport.name} viewport`, async ({ page }) => {
    await mockHrAdminSession(page);
    await blockRemoteFonts(page);
    await page.route("**/rest/v1/org_units**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route("**/rest/v1/rpc/get_job_architecture", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route("**/rest/v1/rpc/get_hr_skill_catalog", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);

    for (const surface of [
      { route: "/admin/org-structure", heading: "Organization structure" },
      { route: "/admin/job-architecture", heading: "Job Architecture" },
    ]) {
      await page.goto(surface.route);
      await expect(
        page.getByRole("heading", { name: surface.heading }),
      ).toBeVisible();
      await expect(page.getByRole("searchbox")).toBeVisible();
      await expectNoDocumentOverflow(page, surface.route);
    }
  });
}
