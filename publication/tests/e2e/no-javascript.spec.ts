import { expect, test } from '@playwright/test';

test('the learning surface remains useful without JavaScript', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-no-js', 'No-JavaScript contract project only');
  const response = await page.goto('/');
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('main#main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  expect((await page.locator('main').innerText()).trim().length).toBeGreaterThan(120);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});
