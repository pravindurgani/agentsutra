import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function publicRoutes(page: Page): Promise<string[]> {
  await page.goto('/');
  const links = await page.locator('a[href^="/"]').evaluateAll((anchors) =>
    anchors
      .map((anchor) => anchor.getAttribute('href'))
      .filter(
        (href): href is string =>
          Boolean(href) && !href!.startsWith('/__exports/') && !href!.startsWith('/fixtures/'),
      )
      .map((href) => new URL(href, window.location.origin).pathname),
  );
  return [...new Set(['/', ...links])].slice(0, 12);
}

test('public routes have no serious or critical automated accessibility violations', async ({
  page,
}) => {
  for (const route of await publicRoutes(page)) {
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
