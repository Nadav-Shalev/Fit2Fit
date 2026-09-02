/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Resolves the public base path:
 *  - local dev and local builds: '/'
 *  - GitHub Actions: '/<repo-name>/', taken from GITHUB_REPOSITORY
 *  - override with VITE_BASE (for example VITE_BASE=/ on a custom domain)
 *
 * Deriving it means the repository can be renamed without editing this file.
 */
function resolveBase(): string {
  if (process.env.VITE_BASE) return process.env.VITE_BASE;

  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return '/';

  const name = repository.split('/')[1];
  // A user/organisation site is served from the domain root, not a subpath.
  if (!name || name.endsWith('.github.io')) return '/';
  return `/${name}/`;
}

export default defineConfig({
  base: resolveBase(),
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Fit2Fit - Workout Tracker',
        short_name: 'Fit2Fit',
        description: 'Personal strength and running tracker',
        lang: 'en',
        dir: 'ltr',
        theme_color: '#0a0e17',
        background_color: '#0a0e17',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
