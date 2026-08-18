import { describe, expect, it } from 'vitest';

import {
  containsPublicOnlyMarker,
  linksBuiltFieldNote,
} from '../../scripts/lib/release-artifact.mjs';

describe('public release artifact invariants', () => {
  it('rejects the synthetic specimen on the homepage or any other public route', () => {
    expect(containsPublicOnlyMarker('<main>Inspect FN-000</main>')).toBe(true);
    expect(containsPublicOnlyMarker('<article>Synthetic specimen</article>')).toBe(true);
    expect(containsPublicOnlyMarker('<p>A legitimate private pilot study.</p>')).toBe(false);
  });

  it('rejects a public homepage that does not link to a built Field Note', () => {
    const routes = ['/field-notes/verified-lesson/'];
    expect(linksBuiltFieldNote('<a href="/method/">Method</a>', routes)).toBe(false);
  });

  it('accepts a marker-free homepage linked to a built Field Note', () => {
    const routes = ['/field-notes/verified-lesson/'];
    const html = '<main><a href="/field-notes/verified-lesson/">Read FN-101</a></main>';
    expect(containsPublicOnlyMarker(html)).toBe(false);
    expect(linksBuiltFieldNote(html, routes)).toBe(true);
  });
});
