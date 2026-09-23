import { defineConfig } from 'vitest/config';
import { pagesHtml, pluginSite } from './build/site';

export default defineConfig({
  // Chemins relatifs : le site fonctionne aussi bien à la racine
  // d'un domaine (IONOS) que dans un sous-dossier (GitHub Pages).
  base: './',
  plugins: [pluginSite()],
  build: {
    rollupOptions: { input: pagesHtml(__dirname) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'build/**/*.test.ts'],
  },
});
