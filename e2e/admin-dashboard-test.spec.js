import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  test(`admin design preview is stable on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    const consoleProblems = [];
    const failedRequests = [];
    const hrRequests = [];

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        consoleProblems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });
    page.on("request", (request) => {
      if (/\/rest\/v1\/|\/rpc\/|\.supabase\.co/i.test(request.url())) {
        hrRequests.push(request.url());
      }
    });

    await page.route("https://fonts.googleapis.com/**", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("https://fonts.gstatic.com/**", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/test-admin");

    await expect(
      page.getByRole("heading", { name: "Executive overview" }),
    ).toBeVisible();
    await expect(page.getByText("Design preview · Sample data")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Key workforce metrics" }),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();

    if (viewport.name === "mobile") {
      const menuButton = page.getByRole("button", {
        name: "Open admin navigation",
      });
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await expect(
        page.getByRole("button", { name: "Close menu" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close menu" }).click();
    } else {
      await expect(
        page.getByRole("navigation", { name: "Admin navigation" }),
      ).toBeVisible();
    }

    await page.screenshot({
      path: testInfo.outputPath(`admin-preview-${viewport.name}.png`),
      fullPage: true,
    });

    const departmentHeading = page.getByRole("heading", {
      name: "Department coverage",
    });
    await departmentHeading.scrollIntoViewIfNeeded();
    await expect(departmentHeading).toBeVisible();

    const activityHeading = page.getByRole("heading", {
      name: "Recent activity",
    });
    await activityHeading.scrollIntoViewIfNeeded();
    await expect(activityHeading).toBeVisible();

    if (viewport.name === "mobile") {
      await page.screenshot({
        path: testInfo.outputPath("admin-preview-mobile-lower.png"),
      });
    }

    expect(consoleProblems).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(hrRequests).toEqual([]);
  });
}
