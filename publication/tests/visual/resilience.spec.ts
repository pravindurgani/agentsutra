import { expect, test } from '@playwright/test';

test('essential content remains visible in forced colours', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Forced-colours emulation is validated in Chromium');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  await expect(page.locator('main#main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});

test('print rendering preserves the article and removes no substantive text', async ({ page }) => {
  await page.goto('/');
  const substantiveText = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main dt, main dd')]
        .filter(
          (element) =>
            !element.closest('[aria-hidden="true"]') &&
            !element.closest('.hero__actions') &&
            getComputedStyle(element).display !== 'none',
        )
        .map((element) => element.textContent?.replace(/\s+/gu, ' ').trim())
        .filter(Boolean)
        .join('\n'),
    );
  const screenText = await substantiveText();
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
  await expect(page.locator('main')).toBeVisible();
  const printText = await substantiveText();
  expect(printText).toBe(screenText);
});
