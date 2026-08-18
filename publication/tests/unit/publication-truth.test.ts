import { describe, expect, it } from 'vitest';

import {
  comparablePublicationText,
  containsPublicationTruth,
} from '../../scripts/lib/publication-truth.mjs';

describe('publication truth comparison', () => {
  it('ignores layout-only whitespace without changing character order', () => {
    expect(comparablePublicationText('T E S T\nFIXTURE')).toBe('TESTFIXTURE');
    expect(containsPublicationTruth('Status: T E S T\nFIXTURE', 'TEST FIXTURE')).toBe(true);
  });

  it('normalises Unicode compatibility forms used by extractors', () => {
    expect(containsPublicationTruth('Evidence: ＭＥＡＳＵＲＥＤ', 'MEASURED')).toBe(true);
  });

  it('rejects missing, reordered, or altered truth characters', () => {
    expect(containsPublicationTruth('TEST FI×TURE', 'TEST FIXTURE')).toBe(false);
    expect(containsPublicationTruth('FIXTURE TEST', 'TEST FIXTURE')).toBe(false);
    expect(containsPublicationTruth('TEST FIXTURE', '')).toBe(false);
  });
});
