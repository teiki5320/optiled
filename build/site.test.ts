import { describe, expect, it } from 'vitest';
import { header, mettreEnPageArticle, NAVIGATION, sitemap, tempsLecture } from './site';

describe('en-tête', () => {
  it('met en évidence la rubrique de la page courante', () => {
    expect(header('led-choisir.html')).toContain('<a href="led.html" aria-current="page">');
    expect(header('culture-semis.html')).toContain('<a href="culture.html" aria-current="page">');
    expect(header('index.html')).toContain('<a href="index.html" aria-current="page">');
  });

  it('une seule rubrique active par page (menu ordinateur + menu mobile)', () => {
    for (const page of ['index.html', 'calculateur.html', 'led-bases.html', 'culture.html', 'legumes.html', 'glossaire.html']) {
      const actifs = [...header(page).matchAll(/<a href="([^"]+)" aria-current/g)].map((m) => m[1]);
      expect(actifs, page).toHaveLength(2);
      expect(new Set(actifs).size, page).toBe(1);
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

describe('mise en page des articles', () => {
  const modele = `<main id="contenu" class="page">
      <p class="fil"><a href="index.html">Accueil</a></p>
      <article class="prose">
        <h1>Titre</h1>
        <p class="chapo">Chapô.</p>
        <nav class="sommaire" aria-label="Sommaire"><ol><li><a href="#a">A</a></li></ol></nav>
        <h2 id="a">A</h2><p>Texte.</p>
      </article>
      <nav class="suite"><a href="x.html">X</a></nav>
    </main>`;

  it('place titre et chapô dans le bandeau et le sommaire dans la colonne latérale', () => {
    const html = mettreEnPageArticle(modele, 'led-choisir.html');
    expect(html).toMatch(/<header class="bandeau bandeau--led">[\s\S]*<h1>Titre<\/h1>[\s\S]*Chapô[\s\S]*<\/header>/);
    expect(html).toMatch(/<aside class="article__cote"><nav class="sommaire"/);
    expect(html).toContain('Guide 2 sur 3');
    expect(html).toContain('<nav class="suite">');
    expect(html.match(/<h1>/g)).toHaveLength(1);
  });

  it('laisse intactes les pages qui ne suivent pas le modèle', () => {
    const autre = '<main id="contenu" class="calculateur"><h1>Calc</h1></main>';
    expect(mettreEnPageArticle(autre, 'calculateur.html')).toBe(autre);
  });

  it('temps de lecture : 200 mots par minute, 1 minute minimum', () => {
    expect(tempsLecture('<p>un deux</p>')).toBe(1);
    expect(tempsLecture(`<p>${'mot '.repeat(1000)}</p>`)).toBe(5);
  });
});
