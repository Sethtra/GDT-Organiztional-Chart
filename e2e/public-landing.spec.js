import { expect, test } from '@playwright/test';

test('public landing page loads without exposing an editor', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
  await page.route('https://fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );

  await page.goto('/');

  await expect(page.getByRole('link', { name: 'GDT register home' })).toBeVisible();
  await expect(page).toHaveTitle(/GDT/i);
  await expect(page.locator('.react-flow')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
