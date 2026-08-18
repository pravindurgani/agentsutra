// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://agentsutra.dev',
  output: 'static',
  outDir: process.env.ASTRO_OUT_DIR ?? './dist',
  trailingSlash: 'always',
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/__exports/') &&
        !page.includes('/exports/') &&
        !page.includes('/fixtures/') &&
        !page.includes('/interview/'),
    }),
  ],
  build: {
    format: 'directory',
    inlineStylesheets: 'never',
  },
});
