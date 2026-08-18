import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { publishStagedDirectory } from '../../scripts/build-profile.mjs';
import {
  assertPublicationProfile,
  headersForProfile,
  publicationProfiles,
} from '../../scripts/lib/publication-profiles.mjs';

const temporaryRoots: string[] = [];

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe('publication build profiles', () => {
  it('generates mutually exclusive crawl and header policy', () => {
    expect(publicationProfiles.prelaunch.robots).toContain('Allow: /');
    expect(publicationProfiles.prelaunch.robots).not.toContain('Disallow: /');
    expect(publicationProfiles.prelaunch.robots).toContain(
      'Sitemap: https://agentsutra.dev/sitemap-index.xml',
    );
    expect(publicationProfiles.public.robots).toContain('Allow: /');
    expect(publicationProfiles.public.robots).toContain(
      'Sitemap: https://agentsutra.dev/sitemap-index.xml',
    );
    expect(headersForProfile('prelaunch')).toContain('X-Robots-Tag: noindex');
    expect(headersForProfile('public')).not.toContain('X-Robots-Tag:');
    expect(headersForProfile('public')).not.toContain('Strict-Transport-Security:');
    expect(() => assertPublicationProfile('preview')).toThrow(/Unknown publication profile/);
  });

  it('atomically replaces a validated stage without mixing old and new files', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'agentsutra-profile-test-'));
    temporaryRoots.push(root);
    const destination = resolve(root, 'dist');
    const staged = resolve(root, 'stage');
    const { mkdir } = await import('node:fs/promises');
    await Promise.all([mkdir(destination), mkdir(staged)]);
    await writeFile(resolve(destination, 'old.txt'), 'old', 'utf8');
    await writeFile(resolve(staged, 'new.txt'), 'new', 'utf8');

    await publishStagedDirectory({ staged, destination });

    await expect(readFile(resolve(destination, 'new.txt'), 'utf8')).resolves.toBe('new');
    await expect(readFile(resolve(destination, 'old.txt'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('restores the previous artifact if the final directory swap fails', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'agentsutra-profile-rollback-test-'));
    temporaryRoots.push(root);
    const destination = resolve(root, 'dist');
    const missingStage = resolve(root, 'missing-stage');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(destination);
    await writeFile(resolve(destination, 'known-good.txt'), 'known-good', 'utf8');

    await expect(
      publishStagedDirectory({ staged: missingStage, destination }),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(resolve(destination, 'known-good.txt'), 'utf8')).resolves.toBe(
      'known-good',
    );
  });
});
