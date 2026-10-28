import { describe, expect, it } from 'vitest';
import { blocAnnonce, DISTANCE_AMAZON, CLIENT_ADSENSE, pageAvecAnnonces, placerAnnonces, scriptAdsense } from './annonces.ts';

const section = (titre: string, texte = 'Texte.') => `<h2 id="${titre}">${titre}</h2><p>${texte}</p>`;
const page = (sections: string[], apres = '<p>Suite</p>') =>
  `<main><div class="conteneur article__grille"><article class="prose"><p>Intro</p>${sections.join('')}</article></div>\n  <div class="conteneur article__apres">${apres}</div></main>`;
const nombre = (html: string) => html.split('class="annonce"').length - 1;

describe('publicité AdSense', () => {
  it('pas d’annonce dans les outils ni sur les pages de lampes Amazon', () => {
    for (const f of ['index.html', 'carnet-de-suivi.html', 'lampes.html', 'meilleures-lampes.html', 'integrer.html', 'mentions-legales.html', 'a-propos.html', '404.html']) {
      expect(pageAvecAnnonces(f), f).toBe(false);
    }
    for (const f of ['led-bases.html', 'culture-semis.html', 'conseil-x.html', 'legume-tomate.html', 'debuter.html', 'tente.html', 'glossaire.html']) {
      expect(pageAvecAnnonces(f), f).toBe(true);
    }
  });

  it('script chargé hors mode intégré, avec le bon compte', () => {
    expect(scriptAdsense()).toContain(`content="${CLIENT_ADSENSE}"`);
    expect(scriptAdsense()).toContain(`adsbygoogle.js?client=${CLIENT_ADSENSE}`);
    expect(scriptAdsense()).toContain('integre=');
  });

  it('emplacement signalé « Publicité »', () => {
    expect(blocAnnonce('123')).toContain('>Publicité<');
    expect(blocAnnonce('123')).toContain('data-ad-slot="123"');
  });

  it('sans numéro de bloc, aucune annonce', () => {
    const html = page(['a', 'b', 'c', 'd'].map((t) => section(t)));
    expect(placerAnnonces(html, 'led-bases.html', '')).toBe(html);
  });

  it('deux annonces au plus : au milieu de l’article et après', () => {
    const html = placerAnnonces(page(['a', 'b', 'c', 'd', 'e', 'f'].map((t) => section(t))), 'led-bases.html', '123');
    expect(nombre(html)).toBe(2);
    expect(html.indexOf('class="annonce"')).toBeLessThan(html.indexOf('<h2 id="d">'));
    expect(html.indexOf('class="annonce"')).toBeGreaterThan(html.indexOf('<h2 id="c">'));
  });

  it('jamais à côté d’une section avec des liens Amazon', () => {
    const lien = '<a href="https://www.amazon.fr/dp/X">Voir sur Amazon</a>';
    const html = placerAnnonces(page(['a', 'b', 'c', 'd'].map((t) => section(t, t === 'c' ? lien : 'Texte.'))), 'legume-x.html', '123');
    // Page courte : le lien Amazon est à moins de DISTANCE_AMAZON caractères de chaque emplacement, donc aucune annonce.
    for (const m of html.matchAll(/class="annonce"/g)) {
      const autour = html.slice(Math.max(0, m.index - DISTANCE_AMAZON), m.index + DISTANCE_AMAZON);
      expect(autour).not.toMatch(/amazon/);
    }
    const finArticle = placerAnnonces(page(['a'].map((t) => section(t)), lien), 'legume-x.html', '123');
    expect(nombre(finArticle)).toBe(0);
  });

  it('pages courtes : seulement l’annonce après l’article', () => {
    expect(nombre(placerAnnonces(page(['a', 'b'].map((t) => section(t))), 'glossaire.html', '123'))).toBe(1);
  });
});

describe('annonces loin des produits Amazon', () => {
  it(`aucune annonce à moins de ${DISTANCE_AMAZON} caractères d'un lien Amazon, même dans une section voisine`, () => {
    const long = 'Texte. '.repeat(250);
    const lien = '<a href="https://www.amazon.fr/dp/X">Voir sur Amazon</a>';
    const sections = ['a', 'b', 'c', 'd', 'e', 'f'].map((t) => section(t, t === 'b' ? `${lien} ${long.slice(0, 200)}` : long));
    const html = placerAnnonces(page(sections), 'conseil-x.html', '123');
    expect(nombre(html)).toBeGreaterThan(0);
    for (const m of html.matchAll(/class="annonce"/g)) expect(html.slice(Math.max(0, m.index - DISTANCE_AMAZON), m.index + DISTANCE_AMAZON)).not.toMatch(/amazon/);
  });
});
