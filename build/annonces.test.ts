import { describe, expect, it } from 'vitest';
import { blocAnnonce, CLIENT_ADSENSE, pageAvecAnnonces, placerAnnonces, scriptAdsense } from './annonces.ts';

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
    const debut = html.indexOf('class="annonce"');
    const autour = html.slice(html.lastIndexOf('<h2', debut), html.indexOf('</h2>', debut));
    expect(autour).not.toMatch(/amazon/);
    expect(html.slice(0, debut)).not.toMatch(/<h2 id="c">[\s\S]*amazon[\s\S]*$/);
    const finArticle = placerAnnonces(page(['a'].map((t) => section(t)), lien), 'legume-x.html', '123');
    expect(nombre(finArticle)).toBe(0);
  });

  it('pages courtes : seulement l’annonce après l’article', () => {
    expect(nombre(placerAnnonces(page(['a', 'b'].map((t) => section(t))), 'glossaire.html', '123'))).toBe(1);
  });
});
