import { expect, test } from '@playwright/test';

test('public landing page loads without exposing an editor', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');

  await expect(page.getByRole('link', { name: /gdt logo/i })).toBeVisible();
  await expect(page).toHaveTitle(/GDT/i);
  await expect(page.locator('.react-flow')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
