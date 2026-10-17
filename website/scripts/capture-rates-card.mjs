/* Before/after screenshots of the attack & defence rates card (mobile + desktop).
   Usage: node scripts/capture-rates-card.mjs <outDir>
   Serves the published tree on a free local port and screenshots
   [data-standings-rates="eng.1"] on the English league landing page. */
import { inflate, default as sparticuz } from '@sparticuz/chromium';
import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(website);
const outDir = process.argv[2] || path.join(website, 'playwright-report', 'rates-screenshots');
await fs.mkdir(outDir, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.m3u8': 'application/vnd.apple.mpegurl' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://preview').pathname);
    if (/^\/(\.git|website|node_modules|admin-dashboard|admin)(\/|$)/.test(pathname) || pathname.split('/').some((p) => p.startsWith('.'))) {
      res.writeHead(403); res.end('Not available in the static preview'); return;
    }
    if (pathname.endsWith('.php') || pathname.startsWith('/player/')) {
      res.writeHead(501, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, code: 'PHP_PREVIEW_UNAVAILABLE' })); return;
    }
    let file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); res.end(); return; }
    let status = 200;
    try {
      const stat = await fs.stat(file);
      if (stat.isDirectory()) file = path.join(file, 'index.html');
      await fs.access(file);
    } catch { file = path.join(root, '404.html'); status = 404; }
    res.writeHead(status, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(await fs.readFile(file));
  } catch { res.writeHead(400); res.end('Bad request'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const libraries = await inflate(path.resolve(website, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
const browser = await chromium.launch({
  executablePath: await sparticuz.executablePath(),
  args: sparticuz.args.filter((a) => !['--single-process', '--disable-web-security'].includes(a)),
  env: { LD_LIBRARY_PATH: `${libraries}/lib` },
});
const url = base + '/matches/' + encodeURIComponent('الدوري-الإنجليزي') + '/';
for (const [name, width] of [['mobile', 390], ['desktop', 1440]]) {
  const page = await browser.newPage({ viewport: { width, height: name === 'mobile' ? 2400 : 1400 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  const card = page.locator('[data-standings-rates="eng.1"]');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  if (name === 'desktop') {
    await card.locator('details[data-rates-details] summary').click();
    await page.waitForTimeout(300);
  }
  await card.screenshot({ path: path.join(outDir, `rates-card-${name}.png`) });
  await page.close();
}
await browser.close();
server.close();
console.log(`Screenshots written to ${outDir}`);
