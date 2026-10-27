// Static preview of the actual published tree; PHP endpoints require Hostinger.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.webmanifest':'application/manifest+json', '.ico':'image/x-icon', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.avif':'image/avif', '.woff':'font/woff', '.woff2':'font/woff2', '.xml':'application/xml', '.txt':'text/plain', '.m3u8':'application/vnd.apple.mpegurl' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://preview').pathname);
    if (/^\/(\.git|website|node_modules|admin-dashboard|admin)(\/|$)/.test(pathname) || pathname.split('/').some(p => p.startsWith('.'))) {
      res.writeHead(403); res.end('Not available in the static preview'); return;
    }
    if (pathname.endsWith('.php') || pathname.startsWith('/player/')) { res.writeHead(501, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Diagnostic-Code': 'PHP_PREVIEW_UNAVAILABLE' }); res.end(JSON.stringify({ ok: false, code: 'PHP_PREVIEW_UNAVAILABLE', message: 'PHP runs on the production host, not the static preview. /player/* is served by embed.php.' })); return; }
    let file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); res.end(); return; }
    let status = 200;
    try {
      const stat = await fs.stat(file);
      if (stat.isDirectory()) file = path.join(file, 'index.html');
      await fs.access(file);
    } catch { file = path.join(root, '404.html'); status = 404; }
    const data = await fs.readFile(file);
    res.writeHead(status, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(400); res.end('Bad request'); }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Storefront preview: http://0.0.0.0:' + server.address().port));
