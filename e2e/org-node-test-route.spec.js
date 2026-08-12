import { expect, test } from '@playwright/test';

test('premium org nodes stay isolated and usable on the test editor route', async ({ page }) => {
  const browserErrors = [];
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !message.text().includes('net::ERR_NETWORK_ACCESS_DENIED')
    ) {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/test-chart-editor');

  const premiumNodes = page.getByTestId('org-node-pro');
  await expect(premiumNodes).toHaveCount(5);
  await expect(page.locator('.org-node--person')).toHaveCount(3);

  const rootNode = premiumNodes.first();
  await expect(rootNode).toBeVisible();
  await expect(rootNode).toHaveAccessibleName(/General Department of Taxation/i);

  const rootSize = await rootNode.evaluate((element) => ({
    width: element.offsetWidth,
    height: element.offsetHeight,
  }));
  expect(rootSize.width).toBeGreaterThanOrEqual(176);
  expect(rootSize.height).toBeGreaterThanOrEqual(92);

  await rootNode.click();
  await expect(rootNode).toHaveClass(/gdt-node--selected/);
  await expect(rootNode.locator('.react-flow__resize-control.handle')).toHaveCount(4);

  await rootNode.hover();
  await expect(rootNode.locator('.gdt-node__edit')).toHaveCSS('opacity', '1');

  expect(browserErrors).toEqual([]);
});

test('resize measurement snaps a node to a sibling width', async ({ page }) => {
  await page.goto('/test-chart-editor');

  const nodeWrapper = page.locator('.react-flow__node[data-id="unit-colored"]');
  const node = nodeWrapper.getByTestId('org-node-pro');
  await node.click();

  const start = await node.evaluate((element) => ({
    width: element.offsetWidth,
    screenWidth: element.getBoundingClientRect().width,
  }));
  const scale = start.screenWidth / start.width;
  const handle = node.locator('.react-flow__resize-control.handle.bottom.right');
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + (340 - start.width) * scale,
    handleBox.y + handleBox.height / 2,
    { steps: 8 },
  );

  const measurement = node.locator('.nx-resize-measure');
  await expect(measurement).toBeVisible();
  await expect(measurement.locator('.is-matched')).toContainText('W 340');

  await page.mouse.up();
  await expect.poll(() => node.evaluate((element) => element.offsetWidth)).toBe(340);
  await expect(measurement).toBeHidden();
});

test('the visible side pill resizes without dragging the node', async ({ page }) => {
  await page.goto('/test-chart-editor');

  const wrapper = page.locator('.react-flow__node[data-id="unit-colored"]');
  const node = wrapper.getByTestId('org-node-pro');
  await node.click();

  const before = await wrapper.evaluate((element) => ({
    x: Number(element.style.transform.match(/translate\(([-\d.]+)px/)?.[1]),
    width: element.getBoundingClientRect().width,
  }));
  const box = await node.boundingBox();
  expect(box).not.toBeNull();

  // Three pixels outside the edge is inside the painted pill but outside the
  // underlying 1px line. It used to fall through and drag the entire node.
  await page.mouse.move(box.x + box.width + 3, box.y + box.height / 2 + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 43, box.y + box.height / 2 + 8, {
    steps: 6,
  });
  await page.mouse.up();

  const after = await wrapper.evaluate((element) => ({
    x: Number(element.style.transform.match(/translate\(([-\d.]+)px/)?.[1]),
    width: element.getBoundingClientRect().width,
  }));
  expect(after.width).toBeGreaterThan(before.width + 20);
  expect(after.x).toBe(before.x);
});

test('the selected green ring stays inside the node boundary', async ({ page }) => {
  await page.goto('/test-chart-editor');

  // Person fixtures deliberately use the live OrgNode component on this
  // isolated route, so this verifies the production selection treatment.
  const person = page.locator('.org-node--person').first();
  await person.click();
  await expect(person).toHaveClass(/org-node--selected/);
  await expect(person).toHaveCSS('box-shadow', /inset/);
});
