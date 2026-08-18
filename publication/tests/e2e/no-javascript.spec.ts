import { expect, test } from '@playwright/test';
import { REPRESENTATIVE_FIELD_NOTE } from '../helpers/routes';

test('the learning surface remains useful without JavaScript', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-no-js', 'No-JavaScript contract project only');
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  for (const route of [
    '/',
    '/start-here/',
    '/field-notes/',
    '/method/',
    REPRESENTATIVE_FIELD_NOTE,
  ]) {
    const response = await page.goto(route);
    expect(response?.ok(), route).toBeTruthy();
    await expect(page.locator('main#main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    expect((await page.locator('main').innerText()).trim().length, route).toBeGreaterThan(120);
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      html: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(dimensions.html, `${route} html overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.body, `${route} body overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});
