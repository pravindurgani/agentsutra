import { describe, expect, it } from 'vitest';

import { selectVisibleRelatedNotes } from '../../src/lib/related-notes';
import type { FieldNote } from '../../src/schemas';

const note = (id: string, lifecycle: FieldNote['lifecycle']): FieldNote =>
  ({ id, lifecycle }) as FieldNote;

describe('related Field Note visibility', () => {
  it('never exposes a related draft that is absent from the visible publication set', () => {
    const published = note('FN-101', 'published');
    const draft = note('FN-102', 'draft');

    expect(
      selectVisibleRelatedNotes([published, draft], [published], ['FN-101', 'FN-102']).map(
        (entry) => entry.id,
      ),
    ).toEqual(['FN-101']);
  });
});
