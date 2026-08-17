import { access, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

import {
  assertPublicationProfile,
  headersForProfile,
  publicationProfiles,
} from './lib/publication-profiles.mjs';

const root = resolve(import.meta.dirname, '..');

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import('node:child_process').SpawnOptions} [options]
 * @returns {Promise<void>}
 */
function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise();
      else
        reject(
          new Error(`${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}.`),
        );
    });
  });
}

/** @param {string} path */
async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** @param {{ staged: string; destination: string }} paths */
export async function publishStagedDirectory({ staged, destination }) {
  const parent = dirname(destination);
  const backup = resolve(parent, `.dist-previous-${process.pid}-${Date.now()}`);
  const hadDestination = await exists(destination);

  if (hadDestination) await rename(destination, backup);
  try {
    await rename(staged, destination);
  } catch (error) {
    if (hadDestination) await rename(backup, destination);
    throw error;
  }
  if (hadDestination) await rm(backup, { recursive: true, force: true });
}

/**
 * @param {unknown} profile
 * @param {{ destination?: string }} [options]
 */
export async function buildPublicationProfile(profile, options = {}) {
  const safeProfile = assertPublicationProfile(profile);
  const destination = resolve(options.destination ?? resolve(root, 'dist'));
  const stage = await mkdtemp(resolve(dirname(destination), `.dist-${safeProfile}-stage-`));
  const profileConfig = publicationProfiles[safeProfile];

  try {
    await run(
      process.execPath,
      [resolve(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', stage, '--force'],
      {
        cwd: root,
        env: { ...process.env, ...profileConfig.environment },
      },
    );

    await Promise.all([
      writeFile(resolve(stage, 'robots.txt'), profileConfig.robots, 'utf8'),
      writeFile(resolve(stage, '_headers'), headersForProfile(safeProfile), 'utf8'),
    ]);

    await run(
      process.execPath,
      [resolve(root, 'scripts/validate-dist.mjs'), '--dir', stage, '--profile', safeProfile],
      { cwd: root, env: { ...process.env, ...profileConfig.environment } },
    );

    await publishStagedDirectory({ staged: stage, destination });
    const profileMarker = await readFile(resolve(destination, 'robots.txt'), 'utf8');
    if (profileMarker !== profileConfig.robots) {
      throw new Error(
        `Published ${safeProfile} artifact does not contain its generated profile marker.`,
      );
    }
    console.log(`ATOMIC ${safeProfile.toUpperCase()} BUILD PASS (${destination})`);
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const profile = process.argv[2];
  buildPublicationProfile(profile).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
