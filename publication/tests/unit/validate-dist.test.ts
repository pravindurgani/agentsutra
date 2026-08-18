import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { headersForProfile, publicationProfiles } from '../../scripts/lib/publication-profiles.mjs';

const publicationRoot = resolve(import.meta.dirname, '../..');
const validator = resolve(publicationRoot, 'scripts/validate-dist.mjs');
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

function html(body: string, noindex = false): string {
  return `<!doctype html><html lang="en"><head><meta name="robots" content="${
    noindex ? 'noindex,nofollow' : 'index,follow'
  }"></head><body><main><h1>AgentSutra</h1>${body}</main></body></html>`;
}

async function write(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, 'utf8');
}

async function publicDist(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), 'agentsutra-public-dist-test-'));
  temporaryRoots.push(root);
  await Promise.all([
    write(
      resolve(root, 'index.html'),
      html('<a href="/field-notes/verified-lesson/">Read the verified lesson</a>'),
    ),
    write(resolve(root, 'field-notes/verified-lesson/index.html'), html('<p>Evidence.</p>')),
    write(resolve(root, 'robots.txt'), publicationProfiles.public.robots),
    write(resolve(root, '_headers'), headersForProfile('public')),
    write(resolve(root, 'sitemap-index.xml'), '<urlset></urlset>'),
  ]);
  return root;
}

async function prelaunchDist(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), 'agentsutra-prelaunch-dist-test-'));
  temporaryRoots.push(root);
  await Promise.all([
    write(resolve(root, 'index.html'), html('<p>Preview.</p>', true)),
    write(resolve(root, 'robots.txt'), publicationProfiles.prelaunch.robots),
    write(resolve(root, '_headers'), headersForProfile('prelaunch')),
    write(resolve(root, 'sitemap-index.xml'), '<urlset></urlset>'),
  ]);
  return root;
}

function validate(root: string, profile: 'prelaunch' | 'public') {
  return spawnSync(process.execPath, [validator, '--dir', root, '--profile', profile], {
    cwd: publicationRoot,
    encoding: 'utf8',
  });
}

describe('built publication release validation', () => {
  it('accepts a valid public homepage linked to a built Field Note', async () => {
    const root = await publicDist();
    const result = validate(root, 'public');
    expect(result.status, result.stderr).toBe(0);
  });

  it('rejects FN-000 on the public homepage', async () => {
    const root = await publicDist();
    await write(
      resolve(root, 'index.html'),
      html('<a href="/field-notes/verified-lesson/">Read FN-000</a>'),
    );
    const result = validate(root, 'public');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('reserved pre-launch or synthetic marker');
  });

  it('rejects a public homepage without a link to its built Field Note', async () => {
    const root = await publicDist();
    await write(resolve(root, 'index.html'), html('<a href="/method/">Method</a>'));
    const result = validate(root, 'public');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('must link to at least one built, reviewed Field Note route');
  });

  it('rejects a reserved marker on a non-home public page', async () => {
    const root = await publicDist();
    await write(
      resolve(root, 'field-notes/verified-lesson/index.html'),
      html('<p>Synthetic specimen</p>'),
    );
    const result = validate(root, 'public');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('reserved pre-launch or synthetic marker');
  });

  it('accepts crawlable pre-launch output with page and header noindex', async () => {
    const root = await prelaunchDist();
    const result = validate(root, 'prelaunch');
    expect(result.status, result.stderr).toBe(0);
  });

  it('rejects a pre-launch X-Robots-Tag that does not contain noindex', async () => {
    const root = await prelaunchDist();
    const headers = (await readFile(resolve(root, '_headers'), 'utf8')).replace(
      /^\s*X-Robots-Tag:[^\r\n]*/imu,
      '  X-Robots-Tag: index,follow',
    );
    await write(resolve(root, '_headers'), headers);
    const result = validate(root, 'prelaunch');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('X-Robots-Tag value containing noindex');
  });
});
