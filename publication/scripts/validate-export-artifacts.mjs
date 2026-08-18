import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { promisify } from 'node:util';

import sharp from 'sharp';

import { scanPrivateMaterial } from './lib/privacy-rules.mjs';
import { containsPublicationTruth } from './lib/publication-truth.mjs';

const executeFile = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const outputDirectory = resolve(root, 'exports/social');
const manifestPath = resolve(outputDirectory, 'manifest.json');

/** @param {Buffer|string} value */
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** @param {string} label @param {string} text */
function assertPrivacy(label, text) {
  const findings = scanPrivateMaterial(text);
  if (findings.length > 0) {
    throw new Error(
      `${label} contains private-material signatures: ${findings.map((item) => item.name).join(', ')}`,
    );
  }
}

/** @param {Record<string, unknown>} entry @param {string} text */
function assertPublicationTruth(entry, text) {
  for (const key of ['centralClaim', 'evidenceStatus', 'evidenceBoundary', 'correctionStatus']) {
    if (!containsPublicationTruth(text, entry[key])) {
      throw new Error(`${entry.file} does not preserve ${key} in selectable text.`);
    }
  }
}

const manifestSource = await readFile(manifestPath, 'utf8');
assertPrivacy('export manifest', manifestSource);
const manifest = JSON.parse(manifestSource);
if (manifest.schemaVersion !== 2 || manifest.replayVerification !== 'cross-build') {
  throw new Error('Export manifest must be schema v2 with cross-build replay verification.');
}
if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
  throw new Error('Export manifest contains no artifacts.');
}

const ids = new Set();
const files = new Set();
for (const entry of manifest.files) {
  for (const key of [
    'id',
    'fieldNoteId',
    'evidencePackId',
    'platform',
    'adaptationFormat',
    'fileType',
    'file',
    'frameRole',
    'caption',
    'altText',
    'canonicalPath',
    'centralClaim',
    'evidenceStatus',
    'evidenceBoundary',
    'correctionStatus',
    'lifecycle',
    'bytes',
    'sha256',
  ]) {
    if (!(key in entry) || entry[key] === '')
      throw new Error(`${entry.id ?? 'artifact'} lacks ${key}.`);
  }
  if (ids.has(entry.id) || files.has(entry.file)) {
    throw new Error(`Duplicate export identity or filename: ${entry.id} / ${entry.file}.`);
  }
  ids.add(entry.id);
  files.add(entry.file);

  const path = resolve(outputDirectory, String(entry.file));
  if (!path.startsWith(`${outputDirectory}/`))
    throw new Error(`${entry.file} escapes export root.`);
  const data = await readFile(path);
  if (data.byteLength !== entry.bytes || sha256(data) !== entry.sha256) {
    throw new Error(`${entry.file} does not match its recorded bytes and SHA-256.`);
  }

  const extension = extname(path);
  if (entry.fileType === 'png') {
    if (extension !== '.png') throw new Error(`${entry.file} has the wrong extension.`);
    const metadata = await sharp(data).metadata();
    if (metadata.width !== entry.width || metadata.height !== entry.height) {
      throw new Error(`${entry.file} dimensions do not match the manifest.`);
    }
    if (metadata.exif || metadata.icc || metadata.iptc || metadata.xmp) {
      throw new Error(`${entry.file} contains unreviewed embedded metadata.`);
    }
    if (entry.frameIndex === null || entry.frameTotal < entry.frameIndex) {
      throw new Error(`${entry.file} has invalid frame position metadata.`);
    }
    continue;
  }

  if (entry.fileType === 'markdown') {
    if (extension !== '.md') throw new Error(`${entry.file} has the wrong extension.`);
    const text = data.toString('utf8');
    assertPrivacy(entry.file, text);
    assertPublicationTruth(entry, text);
    if (!text.includes(`https://agentsutra.dev${entry.canonicalPath}`)) {
      throw new Error(`${entry.file} lacks an absolute canonical link.`);
    }
    continue;
  }

  if (entry.fileType !== 'pdf' || extension !== '.pdf') {
    throw new Error(`${entry.file} uses an unsupported artifact type.`);
  }
  const [{ stdout: info }, { stdout: extractedText }] = await Promise.all([
    executeFile('pdfinfo', [path], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }),
    executeFile('pdftotext', ['-layout', path, '-'], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }),
  ]);
  const pageCount = Number(info.match(/^Pages:\s+(\d+)/mu)?.[1]);
  const pageSize = info.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/mu);
  if (pageCount !== entry.pageCount || pageCount !== entry.frameTotal) {
    throw new Error(`${entry.file} page count differs from its source and manifest.`);
  }
  if (!/^Tagged:\s+yes$/imu.test(info)) throw new Error(`${entry.file} is not a tagged PDF.`);
  if (!pageSize) throw new Error(`${entry.file} has no readable page-size metadata.`);
  const expectedWidth = Number(entry.width) * 0.75;
  const expectedHeight = Number(entry.height) * 0.75;
  if (
    Math.abs(Number(pageSize[1]) - expectedWidth) > 1 ||
    Math.abs(Number(pageSize[2]) - expectedHeight) > 1
  ) {
    throw new Error(`${entry.file} page box does not match its declared pixel contract.`);
  }
  assertPrivacy(`${entry.file} metadata`, info);
  assertPrivacy(`${entry.file} extracted text`, extractedText);
  assertPublicationTruth(entry, extractedText);
}

console.log(`EXPORT ARTIFACT VALIDATION PASS (${manifest.files.length} files)`);
