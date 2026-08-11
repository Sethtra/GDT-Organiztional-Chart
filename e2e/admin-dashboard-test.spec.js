import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
];

const PROMOTION_CANDIDATE = {
  staffId: "00000000-0000-4000-8000-000000000001",
  employeeId: "GDT-001",
  name: "Sok Dara",
  nameEn: "Dara Sok",
  photoUrl: null,
  departmentName: "Finance and Personnel",
  officeName: "Personnel Office",
  currentJobTitle: {
    id: "00000000-0000-4000-8000-000000000014",
    name: "មន្ត្រី",
    nameEn: "Officer",
    rankOrder: 50,
    positionScope: "individual",
  },
  targetJobTitle: {
    id: "00000000-0000-4000-8000-000000000013",
    name: "អនុប្រធានការិយាល័យ",
    nameEn: "Deputy Office Chief",
    rankOrder: 40,
    positionScope: "office",
  },
  requiredSkillCount: 3,
  metSkillCount: 3,
  status: "ready",
};

const PROMOTION_CANDIDATES = [
  PROMOTION_CANDIDATE,
  {
    ...PROMOTION_CANDIDATE,
    staffId: "00000000-0000-4000-8000-000000000002",
    employeeId: "GDT-002",
    name: "Khim Vannak",
    nameEn: "Vannak Khim",
  },
  {
    ...PROMOTION_CANDIDATE,
    staffId: "00000000-0000-4000-8000-000000000003",
    employeeId: "GDT-003",
    name: "Keo Sreymom",
    nameEn: "Sreymom Keo",
  },
  {
    ...PROMOTION_CANDIDATE,
    staffId: "00000000-0000-4000-8000-000000000004",
    employeeId: "GDT-004",
    name: "Heng Pisey",
    nameEn: "Pisey Heng",
  },
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
    await page.route("**/rest/v1/rpc/get_promotion_readiness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROMOTION_CANDIDATES),
      }),
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
    await expect(page.getByText(/Illustrative/)).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Key workforce metrics" }),
    ).toBeVisible();
    const candidateLink = page.getByRole("link", {
      name: /Open profile for Sok Dara/,
    });
    await expect(candidateLink).toBeVisible();
    await expect(candidateLink).toHaveAttribute(
      "href",
      "/admin/staff?profile=00000000-0000-4000-8000-000000000001",
    );
    await expect(candidateLink).toContainText("មន្ត្រី");
    await expect(candidateLink).toContainText("អនុប្រធានការិយាល័យ");
    await expect(candidateLink).toContainText("3/3 required skills met");
    await expect(page.getByText("4 ready", { exact: true })).toBeVisible();
    const viewAllCandidates = page.getByRole("link", {
      name: "View all 4 officers",
    });
    await expect(viewAllCandidates).toBeVisible();
    await expect(viewAllCandidates).toHaveAttribute(
      "href",
      "/admin/staff?promotion=ready",
    );

    if (viewport.name === "desktop") {
      const [trendBox, queueBox, identityBox, readinessBox] = await Promise.all([
        page.locator("#workforce-trend").boundingBox(),
        page.locator("#approvals").boundingBox(),
        candidateLink
          .getByText("Finance and Personnel", { exact: true })
          .boundingBox(),
        candidateLink
          .getByText("3/3 required skills met", { exact: true })
          .boundingBox(),
      ]);
      if (!trendBox || !queueBox || !identityBox || !readinessBox) {
        throw new Error("Dashboard promotion layout was not measurable.");
      }
      const trendBottom = trendBox.y + trendBox.height;
      const queueBottom = queueBox.y + queueBox.height;
      expect(Math.abs(trendBottom - queueBottom)).toBeLessThanOrEqual(1);
      expect(readinessBox.x).toBeGreaterThan(identityBox.x + 80);
    }

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
      await candidateLink.scrollIntoViewIfNeeded();
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
    expect(hrRequests.length).toBeGreaterThanOrEqual(1);
    expect(
      hrRequests.every((url) => url.includes("get_promotion_readiness")),
    ).toBe(true);
  });
}
