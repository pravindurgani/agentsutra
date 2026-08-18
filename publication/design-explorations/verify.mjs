import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const root = fileURLToPath(new URL('.', import.meta.url));
const shots = join(root, 'screenshots');
const concepts = ['threaded-field-lab', 'kinetic-manuscript', 'signal-workshop'];
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

await mkdir(shots, { recursive: true });
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let target = normalize(join(root, relative));
    if (!target.startsWith(root)) throw new Error('outside root');
    const info = await stat(target).catch(() => null);
    if (info?.isDirectory() || url.pathname.endsWith('/')) target = join(target, 'index.html');
    const body = await readFile(target);
    response.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = { origin, concepts: {}, browsers: {} };

try {
  for (const [browserName, browserType] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await browserType.launch({ headless: true });
    report.browsers[browserName] = [];
    try {
      for (const concept of concepts) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const errors = [];
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('pageerror', error => errors.push(String(error)));
        const response = await page.goto(`${origin}/${concept}/`, { waitUntil: 'load' });
        if (!response?.ok()) throw new Error(`${browserName}/${concept}: ${response?.status()}`);
        const basics = await page.evaluate(() => ({
          h1: document.querySelectorAll('h1').length,
          main: Boolean(document.querySelector('main')),
          thread: Boolean(document.querySelector('#thread')),
          evidence: Boolean(document.querySelector('#evidence')),
          boundary: Boolean(document.querySelector('#boundary')),
          sutra: Boolean(document.querySelector('#sutra')),
          platforms: Boolean(document.querySelector('.platform-grid')),
          textEquivalent: Boolean(document.querySelector('[data-diagram-text-equivalent]')),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        if (basics.h1 !== 1 || !basics.main || !basics.thread || !basics.evidence || !basics.boundary || !basics.sutra || !basics.platforms || !basics.textEquivalent || basics.overflow > 1 || errors.length) {
          throw new Error(`${browserName}/${concept}: ${JSON.stringify({ basics, errors })}`);
        }
        report.browsers[browserName].push({ concept, overflow: basics.overflow, errors: 0 });
        await page.close();
      }
    } finally { await browser.close(); }
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const concept of concepts) {
      const requests = [];
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      page.on('request', request => requests.push(request.url()));
      await page.goto(`${origin}/${concept}/`, { waitUntil: 'load' });
      const external = requests.filter(url => !url.startsWith(origin));
      if (external.length) throw new Error(`${concept}: external requests ${external.join(', ')}`);
      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter(item => ['serious', 'critical'].includes(item.impact));
      if (serious.length) throw new Error(`${concept}: axe ${JSON.stringify(serious.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })))}`);
      await page.screenshot({ path: join(shots, `${concept}-desktop.png`), fullPage: true });

      const matrix = [];
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
        await page.reload({ waitUntil: 'load' });
        const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
        if (overflow > 1) throw new Error(`${concept}: ${width}px overflow ${overflow}`);
        matrix.push({ width, overflow });
        if (width === 390) await page.screenshot({ path: join(shots, `${concept}-mobile.png`), fullPage: true });
      }

      const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      await reduced.goto(`${origin}/${concept}/`, { waitUntil: 'load' });
      const motion = await reduced.evaluate(() => {
        const seconds = value => value.split(',').some(part => Number.parseFloat(part) > 0.01 && !part.trim().endsWith('ms'));
        return [...document.querySelectorAll('*')].filter(element => { const style = getComputedStyle(element); return seconds(style.animationDuration) || seconds(style.transitionDuration); }).length;
      });
      if (motion) throw new Error(`${concept}: ${motion} moving elements under reduced motion`);
      await reduced.close();

      const forced = await browser.newPage({ viewport: { width: 390, height: 844 }, forcedColors: 'active' });
      await forced.goto(`${origin}/${concept}/`, { waitUntil: 'load' });
      await forced.screenshot({ path: join(shots, `${concept}-forced-colours.png`), fullPage: true });
      await forced.close();

      await page.setViewportSize({ width: 1200, height: 900 });
      await page.emulateMedia({ media: 'print' });
      await page.pdf({ path: join(shots, `${concept}-print.pdf`), format: 'A4', printBackground: true });
      report.concepts[concept] = { viewports: matrix, seriousAxeViolations: 0, externalRequests: 0, reducedMotionElements: 0 };
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await new Promise(resolve => server.close(resolve));
}
