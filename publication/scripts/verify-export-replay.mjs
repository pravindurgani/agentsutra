import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const outputDirectory = resolve(root, 'exports/social');
const manifestPath = resolve(outputDirectory, 'manifest.json');

/** @param {Buffer|string} value */
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function runExport() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('npm', ['run', 'export:social'], {
      cwd: root,
      env: { ...process.env, INCLUDE_FIXTURES: '1', EXPORT_MODE: '1' },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise(undefined);
      else reject(new Error(`export:social exited with ${code ?? signal}`));
    });
  });
}

function validateArtifacts() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('node', ['scripts/validate-export-artifacts.mjs'], {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise(undefined);
      else reject(new Error(`export artifact validation exited with ${code ?? signal}`));
    });
  });
}

async function snapshot() {
  /** @type {Record<string, {bytes:number,sha256:string}>} */
  const files = {};
  for (const entry of (await readdir(outputDirectory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (!entry.isFile()) continue;
    const data = await readFile(resolve(outputDirectory, entry.name));
    files[entry.name] = { bytes: data.byteLength, sha256: sha256(data) };
  }
  return files;
}

await runExport();
const first = await snapshot();
await runExport();
const second = await snapshot();

if (JSON.stringify(first) !== JSON.stringify(second)) {
  const names = [...new Set([...Object.keys(first), ...Object.keys(second)])].sort();
  const mismatches = names.filter(
    (name) =>
      first[name]?.bytes !== second[name]?.bytes || first[name]?.sha256 !== second[name]?.sha256,
  );
  throw new Error(`Cross-build export replay mismatch: ${mismatches.join(', ')}`);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.replayVerification = 'cross-build';
manifest.replayFiles = Object.keys(second).length - 1;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await validateArtifacts();

console.log(
  `EXPORT REPLAY PASS (${manifest.replayFiles} artifacts matched across two clean builds)`,
);
