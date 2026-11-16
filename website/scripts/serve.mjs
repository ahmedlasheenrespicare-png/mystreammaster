// Static preview of the actual published tree; PHP endpoints require Hostinger.
import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.webmanifest':'application/manifest+json', '.ico':'image/x-icon', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.avif':'image/avif', '.woff':'font/woff', '.woff2':'font/woff2', '.xml':'application/xml', '.txt':'text/plain', '.m3u8':'application/vnd.apple.mpegurl', '.mp4':'video/mp4' };
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
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
    // Browsers seek in MP4s using byte ranges; serve them without reading the
    // whole video into memory for every request.
    if (status === 200 && path.extname(file) === '.mp4') {
      const { size } = await fs.stat(file);
      const range = req.headers.range;
      const match = range && /^bytes=(\d*)-(\d*)$/.exec(range);
      let start = 0, end = size - 1;
      if (range) {
        if (!match || (!match[1] && !match[2])) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
        if (!match[1]) { const suffix = Number(match[2]); start = Math.max(0, size - suffix); }
        else { start = Number(match[1]); if (match[2]) end = Math.min(Number(match[2]), end); }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
      }
      const videoHeaders = { ...headers, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 };
      if (range) videoHeaders['Content-Range'] = `bytes ${start}-${end}/${size}`;
      res.writeHead(range ? 206 : 200, videoHeaders);
      if (req.method === 'HEAD') { res.end(); return; }
      createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
      return;
    }
    const data = await fs.readFile(file);
    res.writeHead(status, headers);
    res.end(data);
  } catch { res.writeHead(400); res.end('Bad request'); }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Storefront preview: http://0.0.0.0:' + server.address().port));
