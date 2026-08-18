import { expect, test } from '@playwright/test';

test.describe('canonical static experience', () => {
  test('has a coherent semantic shell and working primary navigation', async ({ page }) => {
    const runtimeRequests: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith(test.info().project.use.baseURL ?? 'http://127.0.0.1:4321')) {
        runtimeRequests.push(request.url());
      }
    });

    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', /^en(?:-|$)/i);
    await expect(page.locator('main#main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /^https:\/\/agentsutra\.dev\//,
    );

    const primaryLinks = page.getByRole('navigation', { name: 'Primary' }).getByRole('link');
    expect(await primaryLinks.count()).toBeGreaterThanOrEqual(2);
    expect(runtimeRequests, 'ordinary pages must not load third-party runtime assets').toEqual([]);
  });

  test('labels and links the pre-launch specimen as synthetic', async ({ page }) => {
    await page.goto('/');
    const action = page.getByRole('link', { name: 'Inspect FN-000' });
    await expect(action).toHaveAttribute('href', '#experiment-fn-000');
    await expect(page.locator('#experiment-fn-000')).toBeVisible();
    await expect(page.getByText('Synthetic specimen', { exact: true })).toBeVisible();
    await expect(page.getByText(/FN-000 is deliberately fictional/)).toBeVisible();
  });

  test('supports keyboard skip navigation', async ({ page, browserName }) => {
    await page.goto('/');
    if (browserName === 'webkit') {
      // Safari follows the operating-system full-keyboard-access preference for link tabbing.
      await page.locator('.skip-link').focus();
    } else {
      await page.keyboard.press('Tab');
    }
    const focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('href', '#main');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator('#main')).toBeFocused();
  });

  test('reflows at the complete release viewport matrix', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'The full viewport matrix runs once in Chromium');
    for (const viewport of [
      { width: 320, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.locator('main#main')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(dimensions.html, `${viewport.width}px html overflow`).toBeLessThanOrEqual(
        dimensions.viewport + 1,
      );
      expect(dimensions.body, `${viewport.width}px body overflow`).toBeLessThanOrEqual(
        dimensions.viewport + 1,
      );
    }
  });

  test('honours the reduced-motion preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
      true,
    );
    const motion = await page.evaluate(() => {
      const candidates = [
        document.documentElement,
        document.body,
        ...document.querySelectorAll('*'),
      ];
      return candidates
        .map((element) => getComputedStyle(element))
        .filter(
          (style) =>
            style.animationName !== 'none' ||
            style.transitionDuration.split(',').some((duration) => Number.parseFloat(duration) > 0),
        ).length;
    });
    expect(motion, 'reduced-motion mode must remove non-essential animation and transitions').toBe(
      0,
    );
  });
});
