import { defineConfig } from '@playwright/test';
import chromium, { inflate } from '@sparticuz/chromium';
import path from 'node:path';

// Self-contained Chromium from npm for environments without a system browser.
const libraries = await inflate(path.resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  workers: 1,
  // A single CI retry distinguishes transient runner/layout timing from persistent failures.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: process.env.PREVIEW_URL || 'http://127.0.0.1:3000',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    launchOptions: {
      executablePath: await chromium.executablePath(),
      args: chromium.args.filter(a => !['--single-process', '--disable-web-security'].includes(a)),
      env: { ...process.env, LD_LIBRARY_PATH: `${libraries}/lib:${process.env.LD_LIBRARY_PATH || ''}` },
    },
  },
  webServer: { command: 'node scripts/serve.mjs', port: 3000, reuseExistingServer: true },
});
