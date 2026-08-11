import { expect, test } from "@playwright/test";

const READY_OFFICER = {
  id: "00000000-0000-4000-8000-000000000001",
  employeeId: "GDT-001",
  name: "Test Officer",
  nameEn: "Dara Test",
  dateOfBirth: "1996-01-15",
  joinedDate: "2020-03-01",
  retiredDate: null,
  gender: "unspecified",
  status: "active",
  photoUrl: null,
  jobTitle: {
    id: "00000000-0000-4000-8000-000000000014",
    name: "មន្ត្រី",
    nameEn: "Officer",
    rankOrder: 50,
    positionScope: "individual",
  },
  currentPosition: null,
  organizationalPlacement: {
    departmentId: "00000000-0000-4000-8000-000000000004",
    departmentName: "Finance and Personnel",
    officeId: null,
    officeName: null,
  },
  education: null,
  phone: null,
  address: null,
  otherInformation: null,
  createdAt: "2026-07-29T02:36:10+00:00",
  updatedAt: "2026-07-29T02:36:10+00:00",
};

const NOT_READY_OFFICER = {
  ...READY_OFFICER,
  id: "00000000-0000-4000-8000-000000000002",
  employeeId: "GDT-002",
  name: "Not Ready Officer",
  nameEn: "Officer Pending",
};

const PROMOTION_READINESS = {
  staffId: READY_OFFICER.id,
  employeeId: READY_OFFICER.employeeId,
  name: READY_OFFICER.name,
  nameEn: READY_OFFICER.nameEn,
  photoUrl: null,
  departmentName: "Finance and Personnel",
  officeName: null,
  currentJobTitle: READY_OFFICER.jobTitle,
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

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`Ready to Promote filters the staff table on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
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

    await page.route("https://fonts.googleapis.com/**", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("https://fonts.gstatic.com/**", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("**/rest/v1/rpc/get_hr_staff_directory", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([READY_OFFICER, NOT_READY_OFFICER]),
      }),
    );
    await page.route("**/rest/v1/rpc/get_promotion_readiness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([PROMOTION_READINESS]),
      }),
    );
    await page.route("**/rest/v1/org_units**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "00000000-0000-4000-8000-000000000004",
            name: "Finance and Personnel",
            type: "department",
            sort_order: 1,
            parent_id: null,
            org_offices: [],
          },
        ]),
      }),
    );

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto("/test-staff?promotion=ready");

    const promotionFilter = page.getByRole("combobox", {
      name: "Filter by promotion readiness",
    });
    await expect(promotionFilter).toHaveValue("ready");
    await expect(page.getByText("Test Officer", { exact: true })).toBeVisible();
    await expect(page.getByText("Not Ready Officer", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Ready to Promote", { exact: true })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: testInfo.outputPath(`staff-ready-filter-${viewport.name}.png`),
      fullPage: true,
    });

    await promotionFilter.selectOption("all");
    await expect(
      page.getByText("Not Ready Officer", { exact: true }),
    ).toBeVisible();

    expect(consoleProblems).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
