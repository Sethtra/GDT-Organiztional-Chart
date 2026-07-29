import { expect, test } from '@playwright/test';

const projectId = 'ojuyrhwmgwefwdxdmisr';
const userId = '00000000-0000-4000-8000-000000000001';
const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
const payload = Buffer.from(
  JSON.stringify({
    aud: 'authenticated',
    exp: expiresAt,
    sub: userId,
    email: 'hr@example.com',
    role: 'authenticated',
  }),
).toString('base64url');
const accessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature`;

const jobTitles = [
  ['10', 'DEPARTMENT_HEAD', 'ប្រធាននាយកដ្ឋាន', 'Department Director', 10, 'department'],
  ['11', 'DEPARTMENT_DEPUTY', 'អនុប្រធាននាយកដ្ឋាន', 'Deputy Department Director', 20, 'department'],
  ['12', 'OFFICE_HEAD', 'ប្រធានការិយាល័យ', 'Office Chief', 30, 'office'],
  ['13', 'OFFICE_DEPUTY', 'អនុប្រធានការិយាល័យ', 'Deputy Office Chief', 40, 'office'],
  ['14', 'OFFICER', 'មន្ត្រី', 'Officer', 50, 'individual'],
  ['15', 'CONTRACT_OFFICER', 'មន្ត្រីកិច្ចសន្យា', 'Contract Officer', 60, 'individual'],
].map(([suffix, code, name, nameEn, rankOrder, positionScope]) => ({
  id: `00000000-0000-4000-8000-0000000000${suffix}`,
  code,
  name,
  nameEn,
  rankOrder,
  positionScope,
  isActive: true,
  requirements: [],
}));

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
  await page.route('https://fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 204, body: '' }),
  );

  await page.addInitScript(
    ({ storageKey, token, expiration, id }) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: token,
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          expires_at: expiration,
          token_type: 'bearer',
          user: {
            id,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'hr@example.com',
            user_metadata: {},
            app_metadata: {},
            created_at: '2026-01-01T00:00:00.000Z',
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

  await page.route('**/rest/v1/rpc/is_hr_admin', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'true' }),
  );
  await page.route('**/rest/v1/rpc/get_hr_staff_directory', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: userId,
          employeeId: 'GDT-001',
          name: 'មន្ត្រីសាកល្បង',
          nameEn: 'Test Officer',
          dateOfBirth: '1996-01-15',
          joinedDate: '2020-03-01',
          retiredDate: null,
          gender: 'unspecified',
          status: 'active',
          jobTitle: {
            id: jobTitles[4].id,
            name: jobTitles[4].name,
            nameEn: jobTitles[4].nameEn,
            rankOrder: 50,
            positionScope: 'individual',
          },
          currentPosition: null,
          education: null,
          phone: null,
          address: null,
          maritalStatus: 'unspecified',
          otherInformation: null,
          createdAt: '2026-07-29T02:36:10+00:00',
          updatedAt: '2026-07-29T02:36:10+00:00',
        },
      ]),
    }),
  );
  await page.route('**/rest/v1/rpc/get_job_architecture', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(jobTitles),
    }),
  );
});

test('staff directory and ordered position dropdown render cleanly in dark mode', async ({
  page,
}, testInfo) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/admin/staff');
  await expect(
    page.getByRole('heading', { name: 'GDT Staff Directory' }),
  ).toBeVisible();
  await expect(page.getByText('Test Officer')).toBeVisible();

  const viewButton = page.getByRole('button', {
    name: 'View profile for មន្ត្រីសាកល្បង',
  });
  await expect(viewButton).toBeVisible();
  const iconColor = await viewButton.locator('svg').evaluate(
    (element) => getComputedStyle(element).color,
  );
  expect(iconColor).not.toBe('rgb(0, 0, 0)');

  await page.getByRole('button', { name: 'Add officer' }).click();
  const positionSelect = page.getByRole('combobox', { name: 'Position *' });
  await expect(positionSelect).toBeVisible();
  await expect(positionSelect.locator('option')).toHaveText([
    'Select a position',
    'ប្រធាននាយកដ្ឋាន — Department Director',
    'អនុប្រធាននាយកដ្ឋាន — Deputy Department Director',
    'ប្រធានការិយាល័យ — Office Chief',
    'អនុប្រធានការិយាល័យ — Deputy Office Chief',
    'មន្ត្រី — Officer',
    'មន្ត្រីកិច្ចសន្យា — Contract Officer',
  ]);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('staff-directory-form.png'),
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});
