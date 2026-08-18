import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { displayPath, isTextFile, readUtf8, walkFiles } from './lib/files.mjs';
import { scanPrivateMaterial } from './lib/privacy-rules.mjs';

const executeFile = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const extensionlessTextFiles = new Set(['.npmrc', '.nvmrc', '.node-version', 'LICENSE']);

async function trackedRepositoryFiles() {
  const { stdout } = await executeFile(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {
      cwd: root,
      encoding: 'buffer',
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  return stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((path) => resolve(root, path));
}

async function builtArtifactFiles() {
  try {
    await access(dist);
    return walkFiles(dist);
  } catch {
    return [];
  }
}

const candidates = [...(await trackedRepositoryFiles()), ...(await builtArtifactFiles())].filter(
  (path, index, files) => files.indexOf(path) === index,
);

/** @type {string[]} */
const violations = [];
let scannedFiles = 0;

for (const path of candidates) {
  const relativePath = displayPath(root, path).replaceAll('\\', '/');
  if (relativePath.startsWith('dist/.prerender/')) continue;
  if (!isTextFile(path) && !extensionlessTextFiles.has(basename(path))) continue;
  scannedFiles += 1;
  const text = await readUtf8(path);
  for (const finding of scanPrivateMaterial(text)) {
    const isLocalTestEndpoint =
      finding.name === 'local service URL' &&
      (relativePath.startsWith('tests/') ||
        relativePath === 'playwright.config.ts' ||
        relativePath === 'design-explorations/verify.mjs');
    const isSyntheticDesignSafetyLabel =
      finding.name === 'private content marker' && relativePath.startsWith('design-explorations/');
    if (isLocalTestEndpoint || isSyntheticDesignSafetyLabel) continue;
    violations.push(`${relativePath}:${finding.line}:${finding.column} ${finding.name}`);
  }
}

if (violations.length > 0) {
  console.error('PRIVACY SCAN FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`PRIVACY SCAN PASS (${scannedFiles} repository or built text files)`);
}
