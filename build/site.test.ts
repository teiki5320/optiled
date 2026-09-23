import { describe, expect, it } from 'vitest';
import { header, NAVIGATION, sitemap } from './site';

describe('en-tête', () => {
  it('met en évidence la rubrique de la page courante', () => {
    expect(header('led-choisir.html')).toContain('<a href="led.html" aria-current="page">');
    expect(header('culture-semis.html')).toContain('<a href="culture.html" aria-current="page">');
    expect(header('index.html')).toContain('<a href="index.html" aria-current="page">');
  });

  it('une seule rubrique active par page', () => {
    for (const page of ['index.html', 'calculateur.html', 'led-bases.html', 'culture.html', 'legumes.html', 'glossaire.html']) {
      expect(header(page).match(/aria-current/g), page).toHaveLength(1);
    }
    expect(NAVIGATION.length).toBeGreaterThan(4);
  });
});

describe('sitemap', () => {
  it("liste les pages, sans la 404, avec l'accueil à la racine", () => {
    const xml = sitemap(['index.html', 'led.html', '404.html'], 'https://exemple.fr/');
    expect(xml).toContain('<loc>https://exemple.fr/</loc>');
    expect(xml).toContain('<loc>https://exemple.fr/led.html</loc>');
    expect(xml).not.toContain('404');
  });
});
