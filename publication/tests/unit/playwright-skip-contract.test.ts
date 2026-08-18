import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const sources = [
  'tests/accessibility/axe.spec.ts',
  'tests/e2e/metadata.spec.ts',
  'tests/e2e/no-javascript.spec.ts',
  'tests/e2e/site.spec.ts',
  'tests/visual/resilience.spec.ts',
];

describe('intentional Playwright coverage boundaries', () => {
  it('assigns every test.skip call a documented reason ID', async () => {
    const contents = await Promise.all(
      sources.map((path) => readFile(resolve(root, path), 'utf8')),
    );
    const combined = contents.join('\n');
    const skipCalls = combined.match(/test\.skip\s*\(/gu) ?? [];
    const sourceIds = combined.match(/PW-SKIP-\d{3}/gu) ?? [];
    expect(sourceIds).toHaveLength(skipCalls.length);

    const documented = await readFile(resolve(root, 'tests/PLAYWRIGHT_COVERAGE.md'), 'utf8');
    const uniqueSourceIds = [...new Set(sourceIds)].sort();
    const uniqueDocumentIds = [...new Set(documented.match(/PW-SKIP-\d{3}/gu) ?? [])].sort();
    expect(uniqueSourceIds).toEqual([
      'PW-SKIP-001',
      'PW-SKIP-002',
      'PW-SKIP-003',
      'PW-SKIP-004',
      'PW-SKIP-005',
      'PW-SKIP-006',
    ]);
    expect(uniqueDocumentIds).toEqual(uniqueSourceIds);
    expect(documented).toMatch(/12 reported skips/u);
  });
});
