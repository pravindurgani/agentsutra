import { access } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import process from 'node:process';
import { readUtf8, walkFiles } from './lib/files.mjs';
import { assertPublicationProfile, publicationProfiles } from './lib/publication-profiles.mjs';

const root = resolve(import.meta.dirname, '..');
/** @param {string} name */
const readArgument = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};
const profile = assertPublicationProfile(readArgument('--profile') ?? 'prelaunch');
const dist = resolve(readArgument('--dir') ?? resolve(root, 'dist'));
/** @type {string[]} */
const failures = [];

/** @param {string} message */
function fail(message) {
  failures.push(message);
}

try {
  await access(resolve(dist, 'index.html'));
} catch {
  fail('dist/index.html is missing; run the production build first');
}

/** @type {string[]} */
let files = [];
try {
  files = await walkFiles(dist);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const forbiddenRoute = /^(?:__exports?|exports?|fixtures?|drafts?|interviews?)(?:\/|\.|$)/iu;
for (const path of files) {
  const relativePath = relative(dist, path).replaceAll('\\', '/');
  if (forbiddenRoute.test(relativePath)) fail(`forbidden production route/file: ${relativePath}`);
  if (/^field-notes\/fn-000(?:-|\/)/iu.test(relativePath)) {
    fail(`synthetic FN-000 route leaked into production: ${relativePath}`);
  }
}

const htmlFiles = files.filter((path) => extname(path) === '.html');
if (htmlFiles.length === 0) fail('production output contains no HTML pages');
const publicFieldNoteFiles = htmlFiles.filter((path) =>
  /^field-notes\/[a-z0-9]+(?:-[a-z0-9]+)*\/index\.html$/u.test(
    relative(dist, path).replaceAll('\\', '/'),
  ),
);
if (profile === 'public' && publicFieldNoteFiles.length === 0) {
  fail('public release requires at least one validated, published Field Note route');
}

for (const path of htmlFiles) {
  const relativePath = relative(dist, path).replaceAll('\\', '/');
  const html = await readUtf8(path);

  if (!/<html\b[^>]*\blang=["'][^"']+["']/iu.test(html)) fail(`${relativePath}: missing html lang`);
  if ((html.match(/<h1\b/giu) ?? []).length !== 1) fail(`${relativePath}: expected exactly one h1`);
  if (!/<main\b/iu.test(html)) fail(`${relativePath}: missing main landmark`);
  const declaresNoIndex =
    /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/iu.test(html);
  if (profile === 'prelaunch' && !declaresNoIndex) {
    fail(`${relativePath}: prelaunch pages must declare noindex`);
  }
  if (profile === 'public' && relativePath !== '404.html' && declaresNoIndex) {
    fail(`${relativePath}: public pages must not declare noindex`);
  }
  if (profile === 'public' && relativePath === '404.html' && !declaresNoIndex) {
    fail('404.html must remain noindex in the public profile');
  }
  if (/<style\b|\sstyle=["']/iu.test(html)) {
    fail(`${relativePath}: inline CSS violates the static Content Security Policy`);
  }
  if (/\b(?:data-fixture|data-status=["']draft|privateEvidenceId)["'=\s]/iu.test(html)) {
    fail(`${relativePath}: draft, fixture, or private evidence marker leaked`);
  }

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)) {
    const attributes = match[1] ?? '';
    if (!/\btype=["']application\/ld\+json["']/iu.test(attributes)) {
      fail(`${relativePath}: ordinary production pages must not ship client JavaScript`);
      continue;
    }
    try {
      JSON.parse(match[2] ?? '');
    } catch {
      fail(`${relativePath}: invalid JSON-LD`);
    }
  }

  const runtimePatterns = [
    /<(?:script|img|iframe|audio|video|source)\b[^>]*(?:src|poster)=["'](?:https?:)?\/\//giu,
    /\bsrcset=["'][^"']*(?:https?:)?\/\//giu,
    /<link\b[^>]*\brel=["'](?:stylesheet|preload|modulepreload)["'][^>]*\bhref=["'](?:https?:)?\/\//giu,
    /<meta\b[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*(?:https?:)?\/\//giu,
  ];
  if (runtimePatterns.some((pattern) => pattern.test(html))) {
    fail(`${relativePath}: external runtime request detected`);
  }
}

for (const path of files.filter((file) => extname(file) === '.css')) {
  const css = await readUtf8(path);
  if (/(?:@import\s+|url\()["']?https?:\/\//iu.test(css)) {
    fail(`${relative(dist, path)}: external CSS runtime request detected`);
  }
}

const requiredFiles = ['robots.txt', '_headers'];
for (const requiredFile of requiredFiles) {
  try {
    await access(resolve(dist, requiredFile));
  } catch {
    fail(`dist/${requiredFile} is missing`);
  }
}

try {
  const robots = await readUtf8(resolve(dist, 'robots.txt'));
  if (robots !== publicationProfiles[profile].robots) {
    fail(`${profile} robots.txt does not match the generated publication profile`);
  }
} catch {
  // Missing-file failure is reported above.
}

try {
  const headers = await readUtf8(resolve(dist, '_headers'));
  for (const header of ['Content-Security-Policy:', 'X-Content-Type-Options:']) {
    if (!headers.includes(header)) fail(`_headers is missing ${header}`);
  }
  const hasRobotsHeader = headers.includes('X-Robots-Tag:');
  if (profile === 'prelaunch' && !hasRobotsHeader) {
    fail('prelaunch _headers must include X-Robots-Tag');
  }
  if (profile === 'public' && hasRobotsHeader) {
    fail('public _headers must not include a site-wide X-Robots-Tag');
  }
  if (/Strict-Transport-Security:/iu.test(headers)) {
    fail('HSTS must remain disabled until agentsutra.dev is verified end to end');
  }
} catch {
  // Missing-file failure is reported above.
}

const sitemapFiles = files.filter((path) => /sitemap.*\.xml$/iu.test(path));
if (sitemapFiles.length === 0) fail('sitemap output is missing');
for (const path of sitemapFiles) {
  const sitemap = await readUtf8(path);
  const forbiddenSitemapLocation =
    /<loc>https:\/\/agentsutra\.dev\/(?:__exports?|exports?|fixtures?|drafts?|interviews?)(?:\/|<)/iu;
  if (forbiddenSitemapLocation.test(sitemap)) {
    fail(`${relative(dist, path)} contains a forbidden route`);
  }
  if (/\/field-notes\/fn-000(?:-|\/)/iu.test(sitemap)) {
    fail(`${relative(dist, path)} contains the synthetic FN-000 route`);
  }
}

if (failures.length > 0) {
  console.error('DIST VALIDATION FAILED');
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `DIST VALIDATION PASS (${profile}; ${htmlFiles.length} HTML pages; ${files.length} files)`,
  );
}
