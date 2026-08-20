import { expect, test } from '@playwright/test';

const PROJECT_ID = 'ojuyrhwmgwefwdxdmisr';
const USER_ID = '00000000-0000-4000-8000-000000000001';

async function prepareAuthenticatedPage(page) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const payload = Buffer.from(JSON.stringify({
    aud: 'authenticated',
    exp: expiresAt,
    sub: USER_ID,
    email: 'member@gdt.gov.kh',
    role: 'authenticated',
  })).toString('base64url');
  const accessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature`;

  await page.addInitScript(
    ({ projectId, userId, token, expiration }) => {
      const session = JSON.stringify({
        access_token: token,
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: expiration,
        token_type: 'bearer',
        user: {
          id: userId,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'member@gdt.gov.kh',
          user_metadata: { display_name: 'Tra' },
          app_metadata: {},
          created_at: '2026-01-01T00:00:00.000Z',
          last_sign_in_at: '2026-08-20T12:00:00.000Z',
        },
      });
      const encoded = btoa(encodeURIComponent(session));
      localStorage.setItem(`__gdt_s_sb-${projectId}-auth-token`, encoded);
    },
    { projectId: PROJECT_ID, userId: USER_ID, token: accessToken, expiration: expiresAt },
  );

  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
  await page.route('https://fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
  await page.route('**/rest/v1/rpc/is_hr_admin', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'false' }),
  );
  await page.route('**/rest/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

for (const viewport of [
  { name: 'desktop', width: 1920, height: 1000, headerHeight: 74 },
  { name: 'mobile', width: 390, height: 844, headerHeight: 64 },
]) {
  test(`primary headers keep shared rhythm and page alignment on ${viewport.name}`, async ({ page }, testInfo) => {
    await prepareAuthenticatedPage(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const measurements = [];
    for (const surface of [
      { route: '/', name: 'landing', desktopWidth: 1540, desktopInset: 40, contentSelector: '.gdt-register-landing > main' },
      { route: '/test-dashboard', name: 'test-dashboard', desktopWidth: 1400, desktopInset: 46 },
      { route: '/profile', name: 'profile', desktopWidth: 1400, desktopInset: 46 },
    ]) {
      await page.goto(surface.route);
      const header = page.locator('.gdt-shell-header__inner');
      const logo = page.locator('.gdt-shell-header__logo');
      await expect(header).toBeVisible();
      await expect(logo).toBeVisible();
      await expect.poll(() => logo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
      await logo.evaluate((image) => image.decode());

      const measurement = await header.evaluate((node, contentSelector) => {
        const rect = node.getBoundingClientRect();
        const image = node.querySelector('.gdt-shell-header__logo').getBoundingClientRect();
        const style = getComputedStyle(node);
        const content = contentSelector ? document.querySelector(contentSelector) : null;
        const contentStyle = content ? getComputedStyle(content) : null;
        const contentRect = content?.getBoundingClientRect();
        return {
          height: rect.height,
          width: rect.width,
          left: rect.left,
          paddingLeft: parseFloat(style.paddingLeft),
          logoHeight: image.height,
          logoWidth: image.width,
          logoLeft: image.left,
          contentLeft: contentRect && contentStyle
            ? contentRect.left + parseFloat(contentStyle.paddingLeft)
            : null,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          clippedChildren: [...node.children].filter((child) => {
            const childRect = child.getBoundingClientRect();
            return childRect.left < 0 || childRect.right > window.innerWidth;
          }).length,
          overlappingChildren: [...node.children].some((child, index, children) => {
            if (index === 0) return false;
            return children[index - 1].getBoundingClientRect().right > child.getBoundingClientRect().left;
          }),
        };
      }, surface.contentSelector ?? null);
      measurements.push(measurement);

      await page.screenshot({
        path: testInfo.outputPath(`${viewport.name}-${surface.name}.png`),
        fullPage: false,
      });

      const expectedWidth = viewport.name === 'desktop' ? surface.desktopWidth : viewport.width;
      const expectedInset = viewport.name === 'desktop' ? surface.desktopInset : 16;
      expect(measurement.width).toBe(expectedWidth);
      expect(measurement.paddingLeft).toBe(expectedInset);
      if (surface.name === 'landing') {
        expect(measurement.logoLeft).toBe(measurement.contentLeft);
      }

      if (surface.name === 'profile') {
        const seal = page.locator('.acct-seal img');
        await expect(seal).toHaveAttribute('src', '/gdt-seal-mark@3x.png');
        await expect.poll(() => seal.evaluate((image) => image.naturalWidth)).toBe(96);
        await expect.poll(() => seal.evaluate((image) => image.getBoundingClientRect().width)).toBe(36);
        await expect(page.getByText('Current session')).toBeVisible();
        await expect(page.getByText(/Google Chrome on Windows/i)).toBeVisible();
        await expect(page.getByText('Computer', { exact: true })).toBeVisible();
        await page.getByRole('heading', { name: 'Active sessions' }).scrollIntoViewIfNeeded();
        await page.screenshot({
          path: testInfo.outputPath(`${viewport.name}-profile-sessions.png`),
          fullPage: false,
        });

        await page.getByRole('button', { name: 'Delete account' }).click();
        const confirmation = page.getByLabel('Type DELETE to confirm');
        await expect(confirmation).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Delete permanently' }),
        ).toBeDisabled();
        await page.screenshot({
          path: testInfo.outputPath(`${viewport.name}-profile-deletion.png`),
          fullPage: false,
        });
        await page.getByRole('button', { name: 'Cancel' }).click();
      }
    }

    for (const measurement of measurements) {
      expect(measurement.height).toBe(viewport.headerHeight);
      expect(measurement.logoHeight).toBe(viewport.name === 'mobile' ? 36 : 40);
      expect(measurement.overflow).toBeLessThanOrEqual(1);
      expect(measurement.clippedChildren).toBe(0);
      expect(measurement.overlappingChildren).toBe(false);
    }
    expect(new Set(measurements.map(({ height }) => height)).size).toBe(1);
    expect(new Set(measurements.map(({ logoHeight }) => logoHeight)).size).toBe(1);
  });
}

test('confirmed account deletion invokes the protected function and returns to sign-in', async ({ page }) => {
  await prepareAuthenticatedPage(page);
  let deletionRequest = null;
  await page.route('**/functions/v1/delete-account', async (route) => {
    deletionRequest = {
      authorization: route.request().headers().authorization,
      body: route.request().postDataJSON(),
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ deleted: true }),
    });
  });

  await page.goto('/profile');
  await page.getByRole('button', { name: 'Delete account' }).click();
  const deleteButton = page.getByRole('button', { name: 'Delete permanently' });
  await expect(deleteButton).toBeDisabled();
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByText('Your account and owned chart data were deleted.'),
  ).toBeVisible();
  expect(deletionRequest?.body).toEqual({ confirmation: 'DELETE' });
  expect(deletionRequest?.authorization).toMatch(/^Bearer /);
});
