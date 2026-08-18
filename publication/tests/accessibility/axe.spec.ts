import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PUBLIC_ROUTES, REPRESENTATIVE_FIELD_NOTE } from '../helpers/routes';

test('public routes have no serious or critical automated accessibility violations', async ({
  page,
}) => {
  for (const route of PUBLIC_ROUTES) {
    const response = await page.goto(route);
    expect(response && response.status() < 400, `${route} must resolve`).toBeTruthy();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    const material = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(material, `${route}: ${JSON.stringify(material, null, 2)}`).toEqual([]);
  }
});

test('the Daylight Proof theme has no serious or critical accessibility violations', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    '[PW-SKIP-003] The light-theme Axe route matrix runs once in Chromium',
  );
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  for (const route of [...PUBLIC_ROUTES, REPRESENTATIVE_FIELD_NOTE]) {
    const response = await page.goto(route);
    expect(response && response.status() < 400, `${route} must resolve`).toBeTruthy();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    const material = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(material, `${route}: ${JSON.stringify(material, null, 2)}`).toEqual([]);
  }
});
