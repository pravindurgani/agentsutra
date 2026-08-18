import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  assertSafeArchiveEntries,
  createDeterministicPreviewZip,
  createSourceArchive,
} from '../../scripts/lib/release-archive.mjs';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

async function write(path: string, contents: string): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, contents, 'utf8');
}

function zipEntries(contents: Buffer): string[] {
  const entries: string[] = [];
  let offset = 0;
  while (offset <= contents.length - 46) {
    if (contents.readUInt32LE(offset) !== 0x02014b50) {
      offset += 1;
      continue;
    }
    const nameLength = contents.readUInt16LE(offset + 28);
    const extraLength = contents.readUInt16LE(offset + 30);
    const commentLength = contents.readUInt16LE(offset + 32);
    entries.push(contents.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function zipDosTimestamps(contents: Buffer): Array<{ time: number; date: number }> {
  const timestamps: Array<{ time: number; date: number }> = [];
  let offset = 0;
  while (offset <= contents.length - 46) {
    if (contents.readUInt32LE(offset) !== 0x02014b50) {
      offset += 1;
      continue;
    }
    const nameLength = contents.readUInt16LE(offset + 28);
    const extraLength = contents.readUInt16LE(offset + 30);
    const commentLength = contents.readUInt16LE(offset + 32);
    timestamps.push({
      time: contents.readUInt16LE(offset + 12),
      date: contents.readUInt16LE(offset + 14),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return timestamps;
}

async function fixtureRepository(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), 'agentsutra-release-source-test-'));
  temporaryRoots.push(root);
  git(root, 'init', '--quiet');
  await Promise.all([
    write(resolve(root, 'publication/package.json'), '{"name":"fixture"}\n'),
    write(resolve(root, 'publication/package-lock.json'), '{"lockfileVersion":3}\n'),
    write(resolve(root, 'publication/README.md'), '# Fixture\n'),
    write(resolve(root, 'publication/.agents/README.md'), '# Contributor-only agent map\n'),
    write(resolve(root, 'publication/.agents/skills/local/SKILL.md'), '# Local tool\n'),
    write(resolve(root, 'runtime.txt'), 'outside publication\n'),
  ]);
  git(root, 'add', '--all');
  execFileSync('git', ['commit', '--quiet', '--message', 'fixture'], {
    cwd: root,
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z',
      GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z',
      GIT_AUTHOR_NAME: 'Fixture',
      GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
      GIT_COMMITTER_NAME: 'Fixture',
      GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
    },
  });
  return root;
}

describe('portable release archives', () => {
  it('creates a deterministic tracked-source ZIP without agent tooling or runtime files', async () => {
    const root = await fixtureRepository();
    const output = resolve(root, 'release-output');

    const first = await createSourceArchive({ repositoryRoot: root, outputDirectory: output });
    const firstBytes = await readFile(first.archivePath);
    const second = await createSourceArchive({ repositoryRoot: root, outputDirectory: output });
    const secondBytes = await readFile(second.archivePath);

    expect(first.digest).toBe(second.digest);
    expect(firstBytes).toEqual(secondBytes);
    expect(first.entries).toEqual(['README.md', 'package-lock.json', 'package.json']);
    expect(zipEntries(firstBytes)).toEqual([
      'agentsutra-publication/',
      'agentsutra-publication/README.md',
      'agentsutra-publication/package-lock.json',
      'agentsutra-publication/package.json',
    ]);
    // The fixture commit is 2000-01-01 00:00:00 UTC: DOS time 0, DOS date 0x2821.
    expect(zipDosTimestamps(firstBytes)).toEqual([
      { time: 0, date: 0x2821 },
      { time: 0, date: 0x2821 },
      { time: 0, date: 0x2821 },
      { time: 0, date: 0x2821 },
    ]);
  });

  it('refuses modified or untracked publication input instead of archiving stale HEAD', async () => {
    const root = await fixtureRepository();
    const output = resolve(root, 'release-output');
    await write(resolve(root, 'publication/untracked.md'), 'not committed\n');

    await expect(
      createSourceArchive({ repositoryRoot: root, outputDirectory: output }),
    ).rejects.toThrow(/publication tree differs from HEAD/);

    await rm(resolve(root, 'publication/untracked.md'));
    await write(resolve(root, 'publication/README.md'), '# Modified\n');
    await expect(
      createSourceArchive({ repositoryRoot: root, outputDirectory: output }),
    ).rejects.toThrow(/publication tree differs from HEAD/);
  });

  it('packages preview files in deterministic order and rejects platform metadata', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'agentsutra-release-preview-test-'));
    temporaryRoots.push(root);
    const source = resolve(root, 'dist');
    await Promise.all([
      write(resolve(source, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n'),
      write(resolve(source, 'index.html'), '<!doctype html><title>AgentSutra</title>\n'),
      write(resolve(source, 'robots.txt'), 'User-agent: *\nAllow: /\n'),
      write(resolve(source, '_astro/site.css'), 'body { color: black; }\n'),
    ]);

    const firstPath = resolve(root, 'first.zip');
    const secondPath = resolve(root, 'second.zip');
    const first = await createDeterministicPreviewZip({
      sourceDirectory: source,
      outputPath: firstPath,
    });
    const second = await createDeterministicPreviewZip({
      sourceDirectory: source,
      outputPath: secondPath,
    });
    expect(first.digest).toBe(second.digest);
    expect(await readFile(firstPath)).toEqual(await readFile(secondPath));
    expect(first.entries).toEqual(['_astro/site.css', '_headers', 'index.html', 'robots.txt']);

    await write(resolve(source, '.DS_Store'), 'forbidden\n');
    await expect(
      createDeterministicPreviewZip({ sourceDirectory: source, outputPath: firstPath }),
    ).rejects.toThrow(/Platform metadata is forbidden/);
  });

  it('rejects generated and local-only source entries', () => {
    expect(() => assertSafeArchiveEntries(['node_modules/a.js'], 'source')).toThrow(
      /Generated or local-only/,
    );
    expect(() => assertSafeArchiveEntries(['.agents/skills/local/SKILL.md'], 'source')).toThrow(
      /Generated or local-only/,
    );
  });
});
