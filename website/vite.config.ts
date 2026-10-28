import motionPreferenceCss from './scripts/motion-css.mjs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const isSsr = process.argv.includes('--ssr');
export default defineConfig({
  base: '/',
  css: { postcss: { plugins: [motionPreferenceCss()] } },
  publicDir: isSsr ? false : 'public',
  plugins: [react(), tailwindcss()],
  server: { host: '0.0.0.0', allowedHosts: true },
  build: {
    assetsDir: '_assets/redesign',
    rollupOptions: isSsr ? {} : {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react-dom/')) return 'vendor-react-dom';
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/scheduler/')) return 'vendor-react';
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
