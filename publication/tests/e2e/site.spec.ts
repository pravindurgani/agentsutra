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

  test('states the reader promise and keeps the engineering fixture out of the primary path', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#home-title')).toContainText('Push the model');
    await expect(page.locator('.home-hero__lead')).toContainText(
      'turns first-hand experiments with AI tools and agents into visual Field Notes',
    );
    await expect(page.getByText('No public notes have been released yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'See how a Field Note works' })).toHaveAttribute(
      'href',
      '#how-field-notes-work',
    );
    await expect(page.locator('a[href*="fn-000"], a[href="#experiment-fn-000"]')).toHaveCount(0);
  });

  test('ships distinct automatic dark and Daylight Proof themes', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Computed theme tokens run once in Chromium');
    await page.goto('/');

    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute(
      'content',
      'dark light',
    );
    const themeMetadata = await page.locator('meta[name="theme-color"]').evaluateAll((elements) =>
      elements.map((element) => ({
        color: element.getAttribute('content'),
        media: element.getAttribute('media'),
      })),
    );
    expect(themeMetadata).toEqual([
      { color: '#07090e', media: '(prefers-color-scheme: dark)' },
      { color: '#f4f0e6', media: '(prefers-color-scheme: light)' },
    ]);

    const tokens = () =>
      page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return Object.fromEntries(
          ['--canvas', '--ink', '--surface', '--line', '--violet', '--cyan'].map((token) => [
            token,
            style.getPropertyValue(token).trim(),
          ]),
        );
      });

    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await tokens()).toEqual({
      '--canvas': '#07090e',
      '--ink': '#f4f5f2',
      '--surface': '#0d1119',
      '--line': '#323a49',
      '--violet': '#aa8eff',
      '--cyan': '#64e8f3',
    });

    await page.emulateMedia({ colorScheme: 'light' });
    expect(await tokens()).toEqual({
      '--canvas': '#f4f0e6',
      '--ink': '#17131b',
      '--surface': '#ece5d8',
      '--line': '#b8ada2',
      '--violet': '#5b2ab8',
      '--cyan': '#006b73',
    });
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
