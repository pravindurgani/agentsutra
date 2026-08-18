import { expect, test } from '@playwright/test';

const fixtureRoute = '/field-notes/fn-000-stress-test/';

test('the synthetic Thread fixture has a visible semantic text equivalent', async ({ page }) => {
  const response = await page.goto(fixtureRoute);
  expect(response?.status(), `${fixtureRoute} should exist only in the fixture build`).toBe(200);

  const diagrams = page.locator('svg[data-thread-diagram]');
  const wide = page.locator('svg[data-thread-variant="wide"]');
  const compact = page.locator('svg[data-thread-variant="compact"]');
  const textEquivalent = page.locator('[data-diagram-text-equivalent]');
  await expect(diagrams).toHaveCount(2);
  await expect(wide).toBeVisible();
  await expect(compact).toBeHidden();
  await expect(textEquivalent).toBeVisible();
  expect((await textEquivalent.innerText()).trim().length).toBeGreaterThan(40);
  expect(
    await wide.evaluate((diagram) => ({
      animationName: getComputedStyle(diagram).animationName,
      transitionDuration: getComputedStyle(diagram).transitionDuration,
    })),
  ).toEqual({ animationName: 'none', transitionDuration: '0s' });

  await expect(wide).toHaveAttribute('aria-hidden', 'true');
  await expect(compact).toHaveAttribute('aria-hidden', 'true');

  const materialNodeIds = new Set(
    await wide
      .locator('[data-node-id]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-node-id')!)),
  );
  const materialEdgeIds = new Set(
    await wide
      .locator('[data-edge-id]')
      .evaluateAll((edges) => edges.map((edge) => edge.getAttribute('data-edge-id')!)),
  );
  const nodeReferences = new Set(
    await textEquivalent
      .locator('[data-node-refs]')
      .evaluateAll((steps) =>
        steps.flatMap((step) =>
          (step.getAttribute('data-node-refs') ?? '').split(/\s+/u).filter(Boolean),
        ),
      ),
  );
  const edgeReferences = new Set(
    await textEquivalent
      .locator('[data-edge-refs]')
      .evaluateAll((steps) =>
        steps.flatMap((step) =>
          (step.getAttribute('data-edge-refs') ?? '').split(/\s+/u).filter(Boolean),
        ),
      ),
  );
  expect(nodeReferences).toEqual(materialNodeIds);
  expect(edgeReferences).toEqual(materialEdgeIds);

  const stageColours = {
    intent: 'var(--violet)',
    reasoning: 'var(--periwinkle)',
    outcome: 'var(--cyan)',
  };
  const colourTransitions = await wide.evaluate((diagram) =>
    [...diagram.querySelectorAll<SVGGElement>('[data-edge-id]')].map((edge) => {
      const from = edge.getAttribute('data-edge-from')!;
      const to = edge.getAttribute('data-edge-to')!;
      const stroke = edge.querySelector('path')!.getAttribute('stroke')!;
      const gradientId = stroke.slice('url(#'.length, -1);
      const stops = [...diagram.querySelectorAll(`#${CSS.escape(gradientId)} stop`)].map((stop) =>
        stop.getAttribute('stop-color'),
      );
      return {
        fromStage: diagram
          .querySelector(`[data-node-id="${from}"]`)!
          .getAttribute('data-node-stage'),
        toStage: diagram.querySelector(`[data-node-id="${to}"]`)!.getAttribute('data-node-stage'),
        stops,
      };
    }),
  );
  for (const transition of colourTransitions) {
    expect(transition.stops).toEqual([
      stageColours[transition.fromStage as keyof typeof stageColours],
      stageColours[transition.toStage as keyof typeof stageColours],
    ]);
  }

  await page.setViewportSize({ width: 320, height: 800 });
  await expect(wide).toBeHidden();
  await expect(compact).toBeVisible();
  const dimensions = await page.locator('.thread__canvas').evaluate((canvas) => ({
    clientWidth: canvas.clientWidth,
    scrollWidth: canvas.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

  await page.emulateMedia({ media: 'print' });
  await expect(wide).toBeVisible();
  await expect(compact).toBeHidden();
  await expect(textEquivalent).toBeVisible();
});
