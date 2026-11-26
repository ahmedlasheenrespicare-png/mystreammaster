import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export default defineConfig({
  root: website,
  publicDir: 'public',
  server: { host: '0.0.0.0', allowedHosts: true, proxy: { '/_assets/reference-home': 'http://127.0.0.1:3000' } },
  plugins: [{
    name: 'nova-preview-home',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url?.startsWith('/?')) {
          res.writeHead(302, { Location: '/server-section-preview/' });
          res.end();
        } else next();
      });
    },
  }],
});
