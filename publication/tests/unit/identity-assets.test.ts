import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { loadPublicationGraphFromDisk } from '../../src/lib/publication-graph-files';
import { defaultShareImage, defaultShareImageProvenance } from '../../src/lib/share-images';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

describe('AgentSutra identity and share assets', () => {
  it('ships the default share image at its declared dimensions', async () => {
    const filePath = resolve(projectRoot, `public${defaultShareImage.src}`);
    await access(filePath);
    const metadata = await sharp(filePath).metadata();

    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(defaultShareImage.width);
    expect(metadata.height).toBe(defaultShareImage.height);
  });

  it('keeps a local, inspectable source for the default share artwork', async () => {
    const source = await readFile(
      resolve(projectRoot, `public${defaultShareImageProvenance.source}`),
      'utf8',
    );

    expect(source).toContain(`<desc id="description">${defaultShareImage.alt}</desc>`);
    expect(source).toContain("url('/fonts/recursive-v1.085-latin-basic.woff2')");
    expect(source).not.toMatch(/<image\b/iu);
  });

  it('binds the committed SVG source and PNG raster to reviewed hashes', async () => {
    const [source, raster] = await Promise.all([
      readFile(resolve(projectRoot, `public${defaultShareImageProvenance.source}`)),
      readFile(resolve(projectRoot, `public${defaultShareImage.src}`)),
    ]);
    const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex');

    expect(digest(source)).toBe(defaultShareImageProvenance.sourceSha256);
    expect(digest(raster)).toBe(defaultShareImageProvenance.rasterSha256);
    expect(defaultShareImageProvenance.scope).toContain(
      'does not claim pixel-level render equivalence',
    );
  });

  it('keeps internal identity-production notes out of public SVG source', async () => {
    const sources = await Promise.all([
      readFile(resolve(projectRoot, 'public/favicon.svg'), 'utf8'),
      readFile(resolve(projectRoot, `public${defaultShareImageProvenance.source}`), 'utf8'),
    ]);

    for (const source of sources) {
      expect(source).not.toMatch(
        /<!--[\s\S]*?(?:interim|unreleased|replace|source of truth)[\s\S]*?-->/iu,
      );
    }
  });

  it('resolves every declared Field Note share image to a 1200 × 630 PNG', async () => {
    const graph = await loadPublicationGraphFromDisk({
      root: projectRoot,
      includeFixtures: true,
    });

    for (const note of graph.fieldNotes) {
      if (!note.shareImage) continue;
      const filePath = resolve(projectRoot, `public${note.shareImage.src}`);
      await access(filePath);
      const metadata = await sharp(filePath).metadata();
      expect(metadata.format, note.id).toBe('png');
      expect(metadata.width, note.id).toBe(note.shareImage.width);
      expect(metadata.height, note.id).toBe(note.shareImage.height);
    }
  });
});
