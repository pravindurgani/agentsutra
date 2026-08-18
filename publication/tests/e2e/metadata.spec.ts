import { expect, test, type Page } from '@playwright/test';

import { REPRESENTATIVE_FIELD_NOTE } from '../helpers/routes';

async function readStructuredData(page: Page): Promise<Record<string, unknown>[]> {
  return page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent ?? '{}') as Record<string, unknown>),
    );
}

test.describe('publication identity and article metadata', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(
      browserName !== 'chromium',
      '[PW-SKIP-006] Static publication metadata contracts run once in Chromium',
    );
  });

  test('identifies the publication and its accountable creator without shipping design notes', async ({
    page,
  }) => {
    await page.goto('/method/');

    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://agentsutra.dev/social/agentsutra-default.png',
    );
    await expect(page.locator('#editor')).toContainText(
      'AgentSutra is an independent publication created and edited by Pravin Durgani.',
    );
    await expect(page.locator('#editor')).toContainText(
      'editorial distance rather than strict anonymity',
    );
    await expect(page.locator('#editor a[rel~="author"]')).toHaveAttribute(
      'href',
      'https://github.com/pravindurgani',
    );

    const html = await page.content();
    expect(html).not.toContain('THESIS:');
    expect(html).not.toContain('FINISH: production-ready');

    const records = await readStructuredData(page);
    const publication = records.find((record) => record['@type'] === 'Organization');
    const creator = records.find((record) => record['@type'] === 'Person');
    expect(publication).toMatchObject({
      '@id': 'https://agentsutra.dev/#publication',
      name: 'AgentSutra',
      founder: { '@id': 'https://agentsutra.dev/#creator' },
    });
    expect(creator).toMatchObject({
      '@id': 'https://agentsutra.dev/#creator',
      name: 'Pravin Durgani',
      url: 'https://agentsutra.dev/method/#editor',
    });
  });

  test('exposes a Field Note as an Article and keeps its description visible', async ({ page }) => {
    await page.goto(REPRESENTATIVE_FIELD_NOTE);

    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute(
      'content',
      '2026-08-17',
    );
    await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(0);
    await expect(page.locator('meta[property="article:author"]')).toHaveAttribute(
      'content',
      'https://agentsutra.dev/method/#editor',
    );
    await expect(page.locator('meta[property="article:section"]')).toHaveAttribute(
      'content',
      'Publishing foundations',
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://agentsutra.dev/social/agentsutra-default.png',
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      'content',
      '1200',
    );
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
      'content',
      '630',
    );

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    await expect(page.getByText(description!, { exact: true })).toBeVisible();

    const byline = page.locator('.field-note__byline');
    await expect(byline).toContainText('Created and edited by Pravin Durgani');
    await expect(byline.locator('a[rel~="author"]')).toHaveAttribute('href', '/method/#editor');
    await expect(byline.locator('time')).toHaveAttribute('datetime', '2026-08-17');
    await expect(byline.locator('time')).toHaveText('17 Aug 2026');
    const topic = page
      .locator('.field-note-header__meta > div')
      .filter({ has: page.getByText('Topic', { exact: true }) });
    await expect(topic.locator('dd')).toHaveText('Publishing foundations');

    const records = await readStructuredData(page);
    const article = records.find((record) => record['@type'] === 'Article');
    expect(article).toMatchObject({
      description,
      dateModified: '2026-08-17',
      articleSection: 'Publishing foundations',
      author: { '@id': 'https://agentsutra.dev/#creator' },
      creator: { '@id': 'https://agentsutra.dev/#creator' },
      publisher: { '@id': 'https://agentsutra.dev/#publication' },
      image: {
        '@type': 'ImageObject',
        url: 'https://agentsutra.dev/social/agentsutra-default.png',
        width: 1200,
        height: 630,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://agentsutra.dev/field-notes/fn-000-stress-test/',
      },
    });
  });
});
