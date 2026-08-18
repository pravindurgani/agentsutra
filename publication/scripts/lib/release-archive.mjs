import { createHash } from 'node:crypto';
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';

import { walkFiles } from './files.mjs';

const SOURCE_PREFIX = 'agentsutra-publication/';
const PREVIEW_PREFIX = 'agentsutra-publication-preview/';
const RELEASE_DATE = '2000-01-01T00:00:00Z';

const forbiddenSourceRoots = [
  '.agents/',
  '.astro/',
  '.codex/',
  '.export-dist',
  '.fixture-dist/',
  '.release/',
  '.wrangler/',
  'coverage/',
  'dist/',
  'exports/',
  'node_modules/',
  'playwright-report/',
  'test-results/',
];

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd: string; env?: NodeJS.ProcessEnv }} options
 * @returns {Promise<{ stdout: string; stderr: string }>}
 */
async function run(command, args, options) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(' ')} exited with ${
            signal ? `signal ${signal}` : `code ${String(code)}`
          }.${stderr ? `\n${stderr.trim()}` : ''}`,
        ),
      );
    });
  });
}

/** @param {string} path */
function portable(path) {
  return path.replaceAll('\\', '/');
}

/**
 * @param {string[]} entries
 * @param {'source' | 'preview'} kind
 */
export function assertSafeArchiveEntries(entries, kind) {
  for (const entry of entries) {
    const path = portable(entry);
    const segments = path.split('/');
    if (!path || path.startsWith('/') || segments.includes('..')) {
      throw new Error(`Unsafe ${kind} archive path: ${entry}`);
    }
    if (segments.includes('.DS_Store') || segments.includes('__MACOSX')) {
      throw new Error(`Platform metadata is forbidden in ${kind} archives: ${entry}`);
    }
    if (kind === 'source') {
      if (forbiddenSourceRoots.some((prefix) => path.startsWith(prefix))) {
        throw new Error(`Generated or local-only source archive entry: ${entry}`);
      }
    }
  }
}

/**
 * @param {string} repositoryRoot
 * @param {string} publicationPath
 */
export async function assertPublicationTreeClean(repositoryRoot, publicationPath = 'publication') {
  const result = await run(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all', '--', publicationPath],
    { cwd: repositoryRoot },
  );
  if (result.stdout.trim()) {
    throw new Error(
      [
        'Release archive refused: the publication tree differs from HEAD.',
        'Commit or intentionally discard every tracked and untracked publication change first.',
        result.stdout.trim(),
      ].join('\n'),
    );
  }
}

/** @param {string} path */
export async function sha256File(path) {
  const contents = await readFile(path);
  return createHash('sha256').update(contents).digest('hex');
}

/**
 * @param {string} archivePath
 * @param {string} digest
 */
async function writeChecksum(archivePath, digest) {
  const checksumPath = `${archivePath}.sha256`;
  const temporaryPath = `${checksumPath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${digest}  ${basename(archivePath)}\n`, 'utf8');
  await rename(temporaryPath, checksumPath);
  return checksumPath;
}

/**
 * @param {{ repositoryRoot: string; outputDirectory: string; publicationPath?: string }} options
 */
export async function createSourceArchive(options) {
  const publicationPath = options.publicationPath ?? 'publication';
  await assertPublicationTreeClean(options.repositoryRoot, publicationPath);

  const [
    { stdout: fullCommit },
    { stdout: shortCommit },
    { stdout: commitEpoch },
    { stdout: tree },
  ] = await Promise.all([
    run('git', ['rev-parse', 'HEAD'], { cwd: options.repositoryRoot }),
    run('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: options.repositoryRoot }),
    run('git', ['show', '--no-patch', '--format=%ct', 'HEAD'], { cwd: options.repositoryRoot }),
    run('git', ['ls-tree', '-r', '--name-only', `HEAD:${publicationPath}`], {
      cwd: options.repositoryRoot,
    }),
  ]);
  // `HEAD:<path>` resolves to a tree, so Git otherwise assigns every ZIP entry the current time.
  const archiveMtime = commitEpoch.trim();
  if (!/^\d+$/u.test(archiveMtime)) {
    throw new Error(`Source archive commit time is invalid: ${archiveMtime}`);
  }
  const entries = tree
    .split(/\r?\n/u)
    .filter(Boolean)
    .filter((path) => !path.startsWith('.agents/') && !path.startsWith('.codex/'));
  assertSafeArchiveEntries(entries, 'source');
  if (!entries.includes('package.json') || !entries.includes('package-lock.json')) {
    throw new Error('Source archive tree is missing the publication package manifest or lockfile.');
  }

  await mkdir(options.outputDirectory, { recursive: true });
  const archiveName = `agentsutra-publication-source-${shortCommit.trim()}.zip`;
  const archivePath = resolve(options.outputDirectory, archiveName);
  const temporaryPath = `${archivePath}.tmp-${process.pid}`;
  try {
    await run(
      'git',
      [
        'archive',
        '--format=zip',
        `--mtime=@${archiveMtime}`,
        `--prefix=${SOURCE_PREFIX}`,
        `--output=${temporaryPath}`,
        `HEAD:${publicationPath}`,
        '--',
        '.',
        ':(exclude).agents',
        ':(exclude).codex',
      ],
      { cwd: options.repositoryRoot, env: { ...process.env, TZ: 'UTC' } },
    );
    await rename(temporaryPath, archivePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
  const digest = await sha256File(archivePath);
  const checksumPath = await writeChecksum(archivePath, digest);
  return {
    archivePath,
    checksumPath,
    digest,
    entries,
    commit: fullCommit.trim(),
  };
}

/**
 * Create a byte-stable ZIP by committing normalised files in a disposable Git repository with a
 * fixed identity and timestamp, then asking Git to archive that immutable tree.
 *
 * @param {{ sourceDirectory: string; outputPath: string }} options
 */
export async function createDeterministicPreviewZip(options) {
  const sourceFiles = await walkFiles(options.sourceDirectory);
  const entries = sourceFiles.map((path) => portable(relative(options.sourceDirectory, path)));
  assertSafeArchiveEntries(entries, 'preview');
  if (
    !entries.includes('index.html') ||
    !entries.includes('robots.txt') ||
    !entries.includes('_headers')
  ) {
    throw new Error('Validated preview output is missing index.html, robots.txt, or _headers.');
  }

  const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'agentsutra-preview-archive-'));
  const repository = resolve(temporaryRoot, 'repository');
  const temporaryArchive = `${options.outputPath}.tmp-${process.pid}`;
  try {
    await mkdir(repository, { recursive: true });
    for (const sourcePath of sourceFiles) {
      const relativePath = portable(relative(options.sourceDirectory, sourcePath));
      const destination = resolve(repository, relativePath);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(sourcePath, destination);
      await chmod(destination, 0o644);
    }

    await run('git', ['init', '--quiet'], { cwd: repository });
    await run('git', ['config', 'core.filemode', 'false'], { cwd: repository });
    await run('git', ['add', '--all'], { cwd: repository });
    const fixedEnvironment = {
      ...process.env,
      GIT_AUTHOR_DATE: RELEASE_DATE,
      GIT_COMMITTER_DATE: RELEASE_DATE,
      GIT_AUTHOR_NAME: 'AgentSutra release pipeline',
      GIT_AUTHOR_EMAIL: 'release@agentsutra.dev',
      GIT_COMMITTER_NAME: 'AgentSutra release pipeline',
      GIT_COMMITTER_EMAIL: 'release@agentsutra.dev',
      TZ: 'UTC',
    };
    await run('git', ['commit', '--quiet', '--message', 'validated static preview'], {
      cwd: repository,
      env: fixedEnvironment,
    });
    await mkdir(dirname(options.outputPath), { recursive: true });
    await run(
      'git',
      [
        'archive',
        '--format=zip',
        `--prefix=${PREVIEW_PREFIX}`,
        `--output=${temporaryArchive}`,
        'HEAD',
      ],
      { cwd: repository },
    );
    await rename(temporaryArchive, options.outputPath);
  } catch (error) {
    await rm(temporaryArchive, { force: true });
    throw error;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  return { entries, digest: await sha256File(options.outputPath) };
}

/**
 * @param {{ repositoryRoot: string; publicationRoot: string; outputDirectory: string }} options
 */
export async function createPreviewArchive(options) {
  await assertPublicationTreeClean(
    options.repositoryRoot,
    relative(options.repositoryRoot, options.publicationRoot),
  );
  const { stdout: shortCommit } = await run('git', ['rev-parse', '--short=12', 'HEAD'], {
    cwd: options.repositoryRoot,
  });
  const dist = resolve(options.publicationRoot, 'dist');
  const { buildPublicationProfile } = await import('../build-profile.mjs');
  await buildPublicationProfile('prelaunch', { destination: dist });

  await mkdir(options.outputDirectory, { recursive: true });
  const archivePath = resolve(
    options.outputDirectory,
    `agentsutra-publication-preview-${shortCommit.trim()}.zip`,
  );
  const result = await createDeterministicPreviewZip({
    sourceDirectory: dist,
    outputPath: archivePath,
  });
  const checksumPath = await writeChecksum(archivePath, result.digest);
  return { ...result, archivePath, checksumPath };
}

/** @param {string} path */
export async function assertRegularFile(path) {
  const details = await stat(path);
  if (!details.isFile()) throw new Error(`Expected a regular file: ${path}`);
}
