import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, `.export-dist-${process.pid}`);
const exportRoot = resolve(root, 'exports');
const finalOutputDirectory = resolve(exportRoot, 'social');
const outputDirectory = resolve(exportRoot, `.social-stage-${process.pid}`);
const exportPlanPath = resolve(dist, 'exports/manifest.json');
const host = '127.0.0.1';
const requestedPort = Number(process.env.SOCIAL_EXPORT_PORT ?? '0');

if (process.env.INCLUDE_FIXTURES !== '1' || process.env.EXPORT_MODE !== '1') {
  console.error('Social export requires INCLUDE_FIXTURES=1 and EXPORT_MODE=1.');
  process.exit(1);
}

if (finalOutputDirectory !== resolve(root, 'exports', 'social')) {
  throw new Error('Refusing to replace an unexpected export directory.');
}
if (!outputDirectory.startsWith(`${exportRoot}/.social-stage-`)) {
  throw new Error('Refusing to use an unexpected export staging directory.');
}

/** @param {Buffer|string} value */
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import('node:child_process').SpawnOptions} [options]
 */
function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise(undefined);
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

/** @param {string} id */
function slug(id) {
  const value = id
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, '-')
    .replace(/^-|-$/gu, '');
  if (!value) throw new Error(`Unable to derive export slug from ${id}`);
  return value;
}

/** @param {Buffer} input */
function normalisePdf(input) {
  const source = input.toString('latin1');
  const normalised = source
    .replace(
      /\/(CreationDate|ModDate) \(([^)]*)\)/gu,
      (_match, key, value) => `/${key} (${String(value).replace(/\d/gu, '0')})`,
    )
    .replace(/\/ID\s*\[\s*<([^>]+)>\s*<([^>]+)>\s*\]/giu, (match, first, second) =>
      String(match)
        .replace(String(first), '0'.repeat(String(first).length))
        .replace(String(second), '0'.repeat(String(second).length)),
    );
  const output = Buffer.from(normalised, 'latin1');
  if (output.byteLength !== input.byteLength) {
    throw new Error('PDF normalisation changed the document length.');
  }
  return output;
}

/** @param {unknown} plan */
function assertPlan(plan) {
  if (!plan || typeof plan !== 'object' || !('schemaVersion' in plan)) {
    throw new Error('Export plan is missing its schema version.');
  }
  if (!('adaptations' in plan) || !Array.isArray(plan.adaptations)) {
    throw new Error('Export plan is missing its adaptations.');
  }
  for (const adaptation of plan.adaptations) {
    if (
      !adaptation ||
      typeof adaptation !== 'object' ||
      !('evidence' in adaptation) ||
      !adaptation.evidence ||
      typeof adaptation.evidence !== 'object'
    ) {
      throw new Error('Every export adaptation requires derived public evidence metadata.');
    }
    for (const key of ['statusLabel', 'boundary', 'correctionLabel']) {
      if (!(key in adaptation.evidence) || typeof adaptation.evidence[key] !== 'string') {
        throw new Error(`Export evidence metadata is missing ${key}.`);
      }
    }
  }
}

/** @param {Record<string, unknown>} frame */
function completeAltText(frame) {
  const diagram = frame.diagramTextEquivalent;
  return diagram
    ? `${String(frame.altText)} Diagram text equivalent: ${String(diagram)}`
    : String(frame.altText);
}

/** @param {Record<string, unknown>} adaptation */
function redditMarkdown(adaptation) {
  const frames = /** @type {Array<Record<string, unknown>>} */ (adaptation.frames);
  const evidence = /** @type {Record<string, unknown>} */ (adaptation.evidence);
  const title = String(frames[0]?.heading ?? adaptation.id);
  const lines = [
    `# ${title}`,
    '',
    '## Central claim',
    '',
    String(adaptation.centralClaim),
    '',
    `**Evidence status:** ${String(evidence.statusLabel)}`,
    '',
    `**Correction status:** ${String(evidence.correctionLabel)}`,
    '',
  ];
  for (const frame of frames) {
    lines.push(`## ${String(frame.heading)}`, '', String(frame.body), '');
  }
  lines.push(
    '## Boundary',
    '',
    String(evidence.boundary),
    '',
    '---',
    '',
    String(adaptation.caption),
    '',
    `[Canonical Field Note](https://agentsutra.dev${String(adaptation.canonicalPath)})`,
    '',
  );
  return lines.join('\n');
}

await run('npx', ['--no-install', 'astro', 'build', '--outDir', dist, '--force'], {
  env: { ...process.env, INCLUDE_FIXTURES: '1', EXPORT_MODE: '1' },
});

const plan = JSON.parse(await readFile(exportPlanPath, 'utf8'));
assertPlan(plan);
if (plan.adaptations.length === 0) {
  throw new Error('The export plan contains no adaptations.');
}

await mkdir(exportRoot, { recursive: true });
await mkdir(outputDirectory);

/** @type {Record<string, string>} */
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://local.invalid');
    let relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';
    else if (!extname(relativePath)) relativePath += '/index.html';
    const path = resolve(dist, relativePath);
    if (!path.startsWith(`${dist}/`)) throw new Error('Path escaped the export root.');
    const data = await readFile(path);
    response.writeHead(200, {
      'content-type': contentTypes[extname(path)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(data);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});
server.listen(requestedPort, host);
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Export server did not bind TCP.');
const origin = `http://${host}:${address.port}`;

/** @type {Array<Record<string, unknown>>} */
const manifestEntries = [];

/** @param {Record<string, unknown>} adaptation */
function publicationMetadata(adaptation) {
  const evidence = /** @type {Record<string, unknown>} */ (adaptation.evidence);
  return {
    fieldNoteId: adaptation.fieldNoteId,
    evidencePackId: adaptation.evidencePackId,
    centralClaim: adaptation.centralClaim,
    evidenceStatus: evidence.statusLabel,
    evidenceBoundary: evidence.boundary,
    correctionStatus: evidence.correctionLabel,
    lifecycle: adaptation.lifecycle,
    attribution: adaptation.attribution ?? null,
  };
}
/** @type {import('@playwright/test').Browser | undefined} */
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    locale: 'en-GB',
    timezoneId: 'UTC',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });

  /**
   * @param {string} route
   * @param {number} width
   * @param {number} height
   */
  async function openExportPage(route, width, height) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height });
    /** @type {string[]} */
    const externalRequests = [];
    await page.route('**/*', async (requestRoute) => {
      const requestUrl = new URL(requestRoute.request().url());
      if (requestUrl.origin !== origin) {
        externalRequests.push(requestUrl.href);
        await requestRoute.abort('blockedbyclient');
      } else {
        await requestRoute.continue();
      }
    });
    const response = await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      throw new Error(`${route} returned ${response?.status() ?? 'no response'}`);
    }
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content:
        '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });
    if (externalRequests.length > 0) {
      throw new Error(`${route} requested external runtime assets: ${externalRequests.join(', ')}`);
    }
    return page;
  }

  /**
   * @param {import('@playwright/test').Locator} card
   * @param {string} route
   */
  async function assertCardFits(card, route) {
    const report = await card.evaluate((rootElement) => {
      const rootBox = rootElement.getBoundingClientRect();
      const clipped = [];
      for (const element of [rootElement, ...rootElement.querySelectorAll('*')]) {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          box.width === 0 ||
          box.height === 0
        ) {
          continue;
        }
        if (
          box.left < rootBox.left - 2 ||
          box.right > rootBox.right + 2 ||
          box.top < rootBox.top - 2 ||
          box.bottom > rootBox.bottom + 2
        ) {
          clipped.push({
            tag: element.tagName.toLowerCase(),
            className: String(element.className).slice(0, 100),
          });
        }
      }
      return {
        clipped: clipped.slice(0, 8),
        scrollWidth: rootElement.scrollWidth,
        clientWidth: rootElement.clientWidth,
        scrollHeight: rootElement.scrollHeight,
        clientHeight: rootElement.clientHeight,
      };
    });
    if (report.clipped.length > 0) {
      throw new Error(
        `${route} contains clipped or overflowing content: ${JSON.stringify(report)}`,
      );
    }
  }

  const adaptations = /** @type {Array<Record<string, unknown>>} */ (plan.adaptations);
  for (const adaptation of adaptations.sort((left, right) =>
    String(left.id).localeCompare(String(right.id)),
  )) {
    const exportContract = /** @type {Record<string, unknown>} */ (adaptation.export);
    const frames = /** @type {Array<Record<string, unknown>>} */ (adaptation.frames);
    const exportSlug = slug(String(adaptation.id));

    if (exportContract.format === 'markdown') {
      const markdown = redditMarkdown(adaptation);
      const filename = `${exportSlug}.md`;
      await writeFile(resolve(outputDirectory, filename), markdown);
      manifestEntries.push({
        id: adaptation.id,
        platform: adaptation.platform,
        adaptationFormat: adaptation.format,
        fileType: 'markdown',
        file: filename,
        width: null,
        height: null,
        frameRole: 'text-post',
        caption: adaptation.caption,
        altText: frames.map(completeAltText).join(' '),
        frameIndex: null,
        frameTotal: frames.length,
        diagramId: null,
        canonicalPath: adaptation.canonicalPath,
        ...publicationMetadata(adaptation),
        bytes: Buffer.byteLength(markdown),
        sha256: sha256(markdown),
      });

      const companion = /** @type {Record<string, unknown> | undefined} */ (
        exportContract.companionImage
      );
      if (!companion) continue;
      const frame = frames[0];
      if (!frame) throw new Error(`${adaptation.id} has no companion-image frame.`);
      const width = Number(companion.width);
      const height = Number(companion.height);
      const route = `/exports/${exportSlug}-${String(frame.index).padStart(2, '0')}/`;
      const page = await openExportPage(route, width, height);
      const card = page.locator('[data-social-card]');
      await assertCardFits(card, route);
      const raw = await card.screenshot({ type: 'png', animations: 'disabled' });
      const png = await sharp(raw)
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
        .toBuffer();
      const repeatRaw = await card.screenshot({ type: 'png', animations: 'disabled' });
      const repeatPng = await sharp(repeatRaw)
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
        .toBuffer();
      if (sha256(png) !== sha256(repeatPng)) {
        throw new Error(`${adaptation.id} companion export is not deterministic.`);
      }
      const filenameImage = `${exportSlug}-companion.png`;
      await writeFile(resolve(outputDirectory, filenameImage), png);
      manifestEntries.push({
        id: `${adaptation.id}-COMPANION`,
        platform: adaptation.platform,
        adaptationFormat: adaptation.format,
        fileType: 'png',
        file: filenameImage,
        width,
        height,
        frameRole: frame.role,
        caption: adaptation.caption,
        altText: completeAltText(frame),
        frameIndex: frame.index,
        frameTotal: frames.length,
        diagramId: frame.diagramId ?? null,
        canonicalPath: adaptation.canonicalPath,
        ...publicationMetadata(adaptation),
        bytes: png.byteLength,
        sha256: sha256(png),
      });
      await page.close();
      continue;
    }

    if (exportContract.format === 'pdf') {
      const width = Number(exportContract.width);
      const height = Number(exportContract.height);
      const route = `/exports/documents/${exportSlug}/`;
      const page = await openExportPage(route, width, height);
      const documentRoot = page.locator('[data-document-export]');
      if ((await documentRoot.count()) !== 1) {
        throw new Error(`${route} must contain exactly one document export root.`);
      }
      const options = {
        width: `${width}px`,
        height: `${height}px`,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        printBackground: true,
        preferCSSPageSize: true,
        tagged: true,
        outline: true,
      };
      const pdf = normalisePdf(await page.pdf(options));
      const repeatPdf = normalisePdf(await page.pdf(options));
      if (sha256(pdf) !== sha256(repeatPdf)) {
        throw new Error(`${adaptation.id} PDF export is not deterministic.`);
      }
      const filename = `${exportSlug}.pdf`;
      await writeFile(resolve(outputDirectory, filename), pdf);
      manifestEntries.push({
        id: adaptation.id,
        platform: adaptation.platform,
        adaptationFormat: adaptation.format,
        fileType: 'pdf',
        file: filename,
        width,
        height,
        frameRole: 'document',
        pageCount: frames.length,
        caption: adaptation.caption,
        altText: frames.map(completeAltText).join(' '),
        frameIndex: null,
        frameTotal: frames.length,
        diagramId: null,
        canonicalPath: adaptation.canonicalPath,
        ...publicationMetadata(adaptation),
        bytes: pdf.byteLength,
        sha256: sha256(pdf),
      });
      await page.close();
      continue;
    }

    if (exportContract.format !== 'png') {
      throw new Error(`${adaptation.id} has unsupported export format ${exportContract.format}.`);
    }
    const width = Number(exportContract.width);
    const height = Number(exportContract.height);
    for (const frame of frames) {
      const frameIndex = String(frame.index).padStart(2, '0');
      const route = `/exports/${exportSlug}-${frameIndex}/`;
      const page = await openExportPage(route, width, height);
      const card = page.locator('[data-social-card]');
      if ((await card.count()) !== 1) {
        throw new Error(`${route} must contain exactly one social card.`);
      }
      const box = await card.boundingBox();
      if (!box || Math.round(box.width) !== width || Math.round(box.height) !== height) {
        throw new Error(
          `${route} card is ${box?.width ?? 0}x${box?.height ?? 0}; expected ${width}x${height}.`,
        );
      }
      await assertCardFits(card, route);
      const raw = await card.screenshot({ type: 'png', animations: 'disabled' });
      const png = await sharp(raw)
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
        .toBuffer();
      const repeatRaw = await card.screenshot({ type: 'png', animations: 'disabled' });
      const repeatPng = await sharp(repeatRaw)
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
        .toBuffer();
      if (sha256(png) !== sha256(repeatPng)) {
        throw new Error(`${adaptation.id} frame ${frame.index} is not deterministic.`);
      }
      const metadata = await sharp(png).metadata();
      if (metadata.width !== width || metadata.height !== height) {
        throw new Error(`${route} exported ${metadata.width}x${metadata.height}.`);
      }
      const filename = `${exportSlug}-${frameIndex}.png`;
      await writeFile(resolve(outputDirectory, filename), png);
      manifestEntries.push({
        id: `${adaptation.id}-${frameIndex}`,
        platform: adaptation.platform,
        adaptationFormat: adaptation.format,
        fileType: 'png',
        file: filename,
        width,
        height,
        frameRole: frame.role,
        caption: adaptation.caption,
        altText: completeAltText(frame),
        frameIndex: frame.index,
        frameTotal: frames.length,
        diagramId: frame.diagramId ?? null,
        canonicalPath: adaptation.canonicalPath,
        ...publicationMetadata(adaptation),
        bytes: png.byteLength,
        sha256: sha256(png),
      });
      await page.close();
    }
  }
  await context.close();
} finally {
  if (browser) await browser.close();
  server.close();
  await once(server, 'close');
  if (!dist.startsWith(`${root}/.export-dist-`)) {
    throw new Error('Refusing to clean an unexpected export build directory.');
  }
  await rm(dist, { recursive: true, force: true });
}

manifestEntries.sort((left, right) => String(left.id).localeCompare(String(right.id)));
const manifest = {
  schemaVersion: 2,
  generator: 'AgentSutra native platform exporter',
  replayVerification: 'in-process',
  files: manifestEntries,
};
await writeFile(
  resolve(outputDirectory, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

for (const entry of manifestEntries) {
  const data = await readFile(resolve(outputDirectory, String(entry.file)));
  const digest = sha256(data);
  if (digest !== entry.sha256) throw new Error(`Post-write hash mismatch for ${entry.file}.`);
}

const backupDirectory = resolve(exportRoot, `.social-backup-${process.pid}`);
let movedPreviousOutput = false;
try {
  await rename(finalOutputDirectory, backupDirectory);
  movedPreviousOutput = true;
} catch (error) {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
}
try {
  await rename(outputDirectory, finalOutputDirectory);
} catch (error) {
  if (movedPreviousOutput) await rename(backupDirectory, finalOutputDirectory);
  throw error;
}
if (movedPreviousOutput) await rm(backupDirectory, { recursive: true, force: true });

const byType = Object.groupBy(manifestEntries, (entry) => String(entry.fileType));
console.log(
  `SOCIAL EXPORT PASS (${manifestEntries.length} files: ${Object.entries(byType)
    .map(([type, files]) => `${files?.length ?? 0} ${type}`)
    .join(', ')})`,
);
