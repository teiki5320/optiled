import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Chemins relatifs : le site fonctionne aussi bien à la racine
  // d'un domaine IONOS que dans un sous-dossier.
  base: './',
  test: {
    environment: 'node',
  },
});
