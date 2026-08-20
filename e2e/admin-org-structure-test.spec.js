import { expect, test } from "@playwright/test";

import { mockHrAdminSession } from "./helpers/mockHrAdminSession";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 820, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  test(`organization table prototype is responsive on ${viewport.name}`, async ({ page }, testInfo) => {
    await mockHrAdminSession(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/test-org-structure");

    await expect(page.getByRole("heading", { name: "Organization structure" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("1 / 2", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "នាយកដ្ឋានរដ្ឋបាល និងបុគ្គលិក" })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: testInfo.outputPath(`organization-table-${viewport.name}.png`),
      fullPage: true,
    });

    if (viewport.name === "mobile") {
      await page.getByRole("button", { name: /View 7 offices/ }).click();
      await expect(
        page.getByRole("heading", { name: "នាយកដ្ឋានរដ្ឋបាល និងបុគ្គលិក" }),
      ).toBeInViewport();
      await page.screenshot({
        path: testInfo.outputPath("organization-office-directory-mobile.png"),
      });
    }
  });
}

test("selecting a table row updates the separate office directory", async ({ page }) => {
  await mockHrAdminSession(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/test-org-structure");

  await page.getByRole("button", { name: /Information Technology Department/ }).click();
  await expect(page.getByRole("heading", { name: "នាយកដ្ឋានព័ត៌មានវិទ្យា" })).toBeVisible();
  await expect(page.getByText("ការិយាល័យសន្តិសុខឌីជីថល")).toBeVisible();

  const officeSearch = page.getByRole("searchbox", { name: "Search selected unit offices" });
  await officeSearch.fill("ទិន្នន័យ");
  await expect(page.getByText("ការិយាល័យទិន្នន័យ")).toBeVisible();
  await expect(page.getByText("ការិយាល័យប្រព័ន្ធ")).toBeHidden();
});

test("office directory has independent pagination", async ({ page }) => {
  await mockHrAdminSession(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/test-org-structure");

  const officePanel = page.locator(".ost-office-panel");
  await expect(officePanel.getByText("1 / 2", { exact: true })).toBeVisible();
  await expect(officePanel.getByText("1-6 of 7", { exact: true })).toBeVisible();
  await officePanel.getByRole("button", { name: "Next office page" }).click();
  await expect(officePanel.getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(officePanel.getByText("7-7 of 7", { exact: true })).toBeVisible();
  await expect(officePanel.getByText("ការិយាល័យផ្គត់ផ្គង់")).toBeVisible();
});

test("six office rows meet the pagination footer without a gap", async ({ page }) => {
  await mockHrAdminSession(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/test-org-structure");

  const geometry = await page.locator(".ost-office-panel").evaluate((panel) => {
    const list = panel.querySelector(".ost-office-list")?.getBoundingClientRect();
    const lastRow = panel.querySelector(".ost-office-row:last-child")?.getBoundingClientRect();
    const footer = panel.querySelector(".ost-office-pagination")?.getBoundingClientRect();
    if (!list || !lastRow || !footer) throw new Error("Office panel geometry is incomplete.");
    return {
      rowToListGap: list.bottom - lastRow.bottom,
      listToFooterGap: footer.top - list.bottom,
    };
  });

  expect(Math.abs(geometry.rowToListGap)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.listToFooterGap)).toBeLessThanOrEqual(1);
});
