import { describe, expect, it } from 'vitest';
import { header, mesureAudience, mettreEnPageArticle, NAVIGATION, referencement, sitemap, tempsLecture } from './site';

describe('en-tête', () => {
  it('met en évidence la rubrique de la page courante', () => {
    expect(header('led-choisir.html')).toContain('<a href="led.html" aria-current="page">');
    expect(header('culture-semis.html')).toContain('<a href="culture.html" aria-current="page">');
    expect(header('index.html')).toContain('<a href="index.html" aria-current="page">Calculateur</a>');
  });

  it('une seule rubrique active par page (menu ordinateur + menu mobile)', () => {
    for (const page of ['index.html', 'led-bases.html', 'culture.html', 'legumes.html', 'glossaire.html']) {
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

describe('référencement', () => {
  const page = (titre: string, extra = '') =>
    `<html><head><title>${titre}</title><meta name="description" content="Une description assez longue." />${extra}</head><body><h1>Titre de l'article</h1></body></html>`;

  it('balises de partage et adresse canonique', () => {
    const h = referencement(page('Les bases — OptiLED'), 'led-bases.html', 'https://exemple.fr/');
    expect(h).toContain('<link rel="canonical" href="https://exemple.fr/led-bases.html" />');
    expect(h).toContain('<meta property="og:title" content="Les bases — OptiLED" />');
    expect(h).toContain('<meta property="og:image" content="https://exemple.fr/images/partage/led-bases.jpg" />');
    expect(h).toContain('"@type":"Article"');
    expect(h).toContain('"@type":"BreadcrumbList"');
  });

  it("l'accueil est une application web servie à la racine", () => {
    const h = referencement(page('OptiLED'), 'index.html', 'https://exemple.fr/');
    expect(h).toContain('href="https://exemple.fr/"');
    expect(h).toContain('"@type":"WebApplication"');
  });

  it('rien pour les pages non indexées ; échappement des guillemets', () => {
    expect(referencement(page('X', '<meta name="robots" content="noindex" />'), '404.html')).toBe('');
    expect(referencement(page('Le "calcul"'), 'legumes.html')).toContain('content="Le &quot;calcul&quot;"');
  });

  it("mesure d'audience seulement si un domaine est configuré", () => {
    expect(mesureAudience('')).toBe('');
    expect(mesureAudience('optiled.fr')).toContain('data-domain="optiled.fr"');
  });
});
