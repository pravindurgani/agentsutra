import { resolve } from 'node:path';
import process from 'node:process';

import { createPreviewArchive, createSourceArchive } from './lib/release-archive.mjs';

const publicationRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(publicationRoot, '..');
const outputDirectory = resolve(publicationRoot, '.release');

async function main() {
  const mode = process.argv[2];
  if (!['source', 'preview', 'all'].includes(mode ?? '')) {
    throw new Error('Usage: node scripts/create-release-archive.mjs <source|preview|all>');
  }

  if (mode === 'source' || mode === 'all') {
    const source = await createSourceArchive({ repositoryRoot, outputDirectory });
    console.log(`SOURCE ARCHIVE PASS (${source.archivePath})`);
    console.log(`SHA256 ${source.digest}`);
  }
  if (mode === 'preview' || mode === 'all') {
    const preview = await createPreviewArchive({
      repositoryRoot,
      publicationRoot,
      outputDirectory,
    });
    console.log(`PREVIEW ARCHIVE PASS (${preview.archivePath})`);
    console.log(`SHA256 ${preview.digest}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
