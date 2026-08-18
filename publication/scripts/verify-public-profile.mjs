import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { relative, resolve } from 'node:path';

import { buildPublicationProfile } from './build-profile.mjs';
import { walkFiles } from './lib/files.mjs';

/** @param {string} directory */
async function manifest(directory) {
  const files = await walkFiles(directory);
  const entries = await Promise.all(
    files.map(async (path) => {
      const contents = await readFile(path);
      return [
        relative(directory, path).replaceAll('\\', '/'),
        createHash('sha256').update(contents).digest('hex'),
      ];
    }),
  );
  return Object.fromEntries(entries);
}

/** @param {Record<string, string>} entries */
function containsRealFieldNote(entries) {
  return Object.keys(entries).some((path) =>
    /^field-notes\/[a-z0-9]+(?:-[a-z0-9]+)*\/index\.html$/u.test(path),
  );
}

const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'agentsutra-public-profile-'));
const destination = resolve(temporaryRoot, 'dist');

try {
  await buildPublicationProfile('prelaunch', { destination });
  const sealedPrelaunch = await manifest(destination);
  const hasRealFieldNote = containsRealFieldNote(sealedPrelaunch);

  try {
    await buildPublicationProfile('public', { destination });
    if (!hasRealFieldNote) {
      throw new Error('Public profile succeeded without a validated, published Field Note route.');
    }
    console.log('PUBLIC PROFILE RELEASE PASS (validated public Field Note present)');
  } catch (error) {
    if (hasRealFieldNote) throw error;
    const failure = /** @type {Error & { stdout?: string; stderr?: string }} */ (error);
    const output = `${failure.stdout ?? ''}\n${failure.stderr ?? ''}`;
    if (!output.includes('public release requires at least one validated, published Field Note')) {
      throw new Error(`Public profile failed for an unexpected reason.\n${failure.message}`, {
        cause: error,
      });
    }
    const reportedFailures = output.split(/\r?\n/u).filter((line) => line.startsWith('- '));
    const expectedEmptyPublicationFailures = [
      '- public release requires at least one validated, published Field Note route',
      '- field-notes/index.html: public HTML contains a reserved pre-launch or synthetic marker',
    ];
    const unexpectedFailures = reportedFailures.filter(
      (line) => !expectedEmptyPublicationFailures.includes(line),
    );
    if (unexpectedFailures.length > 0) {
      throw new Error(
        `The empty public profile exposed additional release defects:\n${unexpectedFailures.join('\n')}`,
      );
    }
    const afterFailure = await manifest(destination);
    if (JSON.stringify(afterFailure) !== JSON.stringify(sealedPrelaunch)) {
      throw new Error('Failed public release attempt changed the sealed pre-launch artifact.');
    }
    console.log(
      'PUBLIC PROFILE FAIL-CLOSED PASS (no real Field Note; pre-launch artifact unchanged)',
    );
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
