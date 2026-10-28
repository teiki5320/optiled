import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ArticleVeille } from '../src/article.ts';
import type { Actu } from '../src/veille.ts';
import { pageAvecAnnonces } from './annonces.ts';
import {
  blocAutresActus,
  chargerVeilleAuBuild,
  definirVeille,
  FICHIER_RENVOI_ACTUS,
  FICHIER_SECOURS,
  pagesActus,
  prefixeRelatif,
  reecrireLiensRelatifs,
  slugsConstruits,
} from './articles.ts';
import { sitemap, sourcePage, toutesLesPages, transformerPage, urlPage } from './site.ts';

const racine = resolve(import.meta.dirname, '..');

const id = (c: string) => c.repeat(40);
const image = (n: string) => ({
  url: `https://teiki5320.github.io/veille/images/kultiled/${id(n)}.webp`,
  source: 'wikimedia' as const,
  credit: 'Jane Doe',
  licence: 'CC BY-SA 4.0',
  page: 'https://commons.wikimedia.org/wiki/File:X.jpg',
  alt: 'Des radis sous LED',
  largeur: 1600,
  hauteur: 900,
});
const actu = (c: string, x: Partial<Actu> = {}): Actu => ({
  id: id(c),
  titre: `Actu ${c}`,
  resume: 'Un résumé réécrit, en deux phrases. Avec sa source.',
  source_nom: 'Phys.org',
  source_url: `https://phys.org/news/${c}.html`,
  publie_le: '2026-10-27T08:00:00Z',
  image: image(c),
  ...x,
});
const article = (c: string, x: Partial<ArticleVeille> = {}): ArticleVeille => ({
  version: 1,
  site: 'kultiled',
  id: id(c),
  slug: `article-${c}`,
  titre: `Un radis qui se cueille sur la tige ${c}`,
  chapo: 'Le radis serpent se récolte sur la tige : une curiosité facile à faire pousser chez soi, même sous LED.',
  blocs: [
    { intertitre: null, paragraphes: ['Premier paragraphe de l’article, réécrit par la veille.'] },
    { intertitre: 'Comment le cultiver', paragraphes: ['Deuxième paragraphe, avec <b>des balises</b> qui doivent rester du texte.'] },
  ],
  mots: 320,
  lecture_min: 2,
  tags: ['legume:radis', 'legume:inconnu', 'auteur:x'],
  source_nom: 'Futura',
  source_url: 'https://www.futura-sciences.com/x',
  autres_sources: ['https://www.example.org/etude', 'https://www.amazon.fr/dp/B0'],
  publie_le: '2026-10-25T10:00:00Z',
  redige_le: '2026-10-28T00:30:00Z',
  image: image(c),
  ...x,
});

afterEach(() => definirVeille([], []));

describe('pages des articles d’actus (build)', () => {
  it('construit une page par article valide, jamais deux fois le même slug ni le slug réservé', () => {
    const retenus = definirVeille(
      [actu('a', { slug: 'article-a' }), actu('b'), actu('c'), actu('d')],
      [article('a'), article('b', { slug: 'article-a' }), article('c', { slug: 'article' }), article('d', { source_url: 'javascript:alert(1)' })],
    );
    expect(retenus.map((r) => r.fichier)).toEqual(['actus/article-a/index.html']);
    expect(slugsConstruits()).toEqual(['article-a']);
  });

  it('lit l’index de tous les articles : une page reste construite quand son actu sort des actus récentes', async () => {
    const dossier = mkdtempSync(resolve(tmpdir(), 'veille-'));
    mkdirSync(resolve(dossier, 'actus'));
    mkdirSync(resolve(dossier, 'articles/kultiled'), { recursive: true });
    writeFileSync(resolve(dossier, 'actus/kultiled.json'), JSON.stringify({ version: 3, site: 'kultiled', genere_le: '2026-10-28T00:00:00Z', actus: [actu('a', { slug: 'article-a', article_url: 'x' })] }));
    writeFileSync(resolve(dossier, 'articles/kultiled/index.json'), JSON.stringify({ version: 1, site: 'kultiled', articles: [{ id: id('a'), slug: 'article-a' }, { id: id('b'), slug: 'article-b' }, { id: id('c'), slug: 'article-c' }] }));
    for (const c of ['a', 'b']) writeFileSync(resolve(dossier, `articles/kultiled/${id(c)}.json`), JSON.stringify(article(c, { publie_le: `2026-10-2${c === 'a' ? 6 : 1}T08:00:00Z` })));
    try {
      const retenus = await chargerVeilleAuBuild(dossier);
      expect(retenus.map((r) => r.article.slug)).toEqual(['article-a', 'article-b']);
      // L'ancienne actu (hors des actus récentes) garde sa page, avec son chapô comme résumé.
      expect(retenus[1].actu.resume).toBe(article('b').chapo);
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  });

  it('la page affiche titre, chapô, image et crédit, intertitres, sources, fiches et autres actus', () => {
    definirVeille([actu('a', { slug: 'article-a' }), actu('b', { slug: 'article-b', article_url: 'x' }), actu('e')], [article('a')]);
    const f = 'actus/article-a/index.html';
    const html = transformerPage(sourcePage(racine, f), f);
    expect(html).toContain('<title>Un radis qui se cueille sur la tige a</title>');
    expect(html).toMatch(/<h1>Un radis qui se cueille sur la tige a<\/h1>/);
    expect(html).toContain('class="chapo bandeau__chapo">Le radis serpent');
    expect(html).toContain('2 min de lecture');
    expect(html).toMatch(/<img src="https:\/\/teiki5320\.github\.io\/veille\/images\/kultiled\/a{40}\.webp"[^>]*fetchpriority="high"/);
    expect(html).toMatch(/Photo\s:\sJane Doe · CC BY-SA 4\.0/);
    expect(html).toContain('<h2>Comment le cultiver</h2>');
    expect(html).toContain('&#60;b&#62;des balises&#60;/b&#62;');
    expect(html).toMatch(/Article rédigé par Kultiled à partir de\s: <a href="https:\/\/www\.futura-sciences\.com\/x" target="_blank" rel="noopener nofollow">Futura\s↗<\/a> et <a href="https:\/\/www\.example\.org\/etude"/);
    expect(html).not.toMatch(/amazon\./i);
    // Fiche existante en lien, tags inconnus ignorés.
    expect(html).toMatch(/<a href="\.\.\/\.\.\/legume-radis\.html">Lire la fiche culture\s: Radis →<\/a>/);
    expect(html).not.toContain('inconnu');
    // Autres actus : page construite, page de secours, ou source.
    expect(html).toContain('Autres actus');
    expect(html).toContain(`href="../../actus/article/?id=${id('b')}"`);
    expect(html).toMatch(/Source\s: Phys\.org\s↗/);
    // Liens communs ramenés à la racine, ancres intactes.
    expect(html).toContain('href="../../index.html"');
    expect(html).toContain('href="#contenu"');
    // Publicité : même modèle que les articles, après l'article.
    expect(html.match(/class="adsbygoogle"/g)?.length).toBe(1);
  });

  it('référencement : canonical, Open Graph avec l’image, NewsArticle valide', () => {
    definirVeille([actu('a', { slug: 'article-a' })], [article('a')]);
    const f = 'actus/article-a/index.html';
    const html = transformerPage(sourcePage(racine, f), f);
    expect(html).toContain('<link rel="canonical" href="https://www.kultiled.com/actus/article-a/" />');
    expect(html).toContain(`<meta property="og:image" content="https://teiki5320.github.io/veille/images/kultiled/${id('a')}.webp" />`);
    expect(html).toContain('<meta name="description" content="Le radis serpent');
    const json = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const news = json.find((j) => j['@type'] === 'NewsArticle');
    expect(news).toMatchObject({
      headline: 'Un radis qui se cueille sur la tige a',
      datePublished: '2026-10-25T10:00:00Z',
      dateModified: '2026-10-28T00:30:00Z',
      image: [`https://teiki5320.github.io/veille/images/kultiled/${id('a')}.webp`],
      publisher: { '@type': 'Organization', name: 'Kultiled' },
      isBasedOn: ['https://www.futura-sciences.com/x', 'https://www.example.org/etude'],
      mainEntityOfPage: 'https://www.kultiled.com/actus/article-a/',
    });
    expect(json.find((j) => j['@type'] === 'BreadcrumbList')?.itemListElement).toHaveLength(3);
  });

  it('sitemap : les pages d’articles y sont (adresse en /), jamais la page de secours ni le renvoi', () => {
    definirVeille([actu('a', { slug: 'article-a' })], [article('a')]);
    const pages = Object.keys(toutesLesPages(racine)).map((n) => `${n}.html`);
    expect(pages).toContain('actus/article-a/index.html');
    const indexables = pages.filter((f) => !sourcePage(racine, f).includes('content="noindex"'));
    expect(indexables).not.toContain(FICHIER_SECOURS);
    expect(indexables).not.toContain(FICHIER_RENVOI_ACTUS);
    expect(sitemap(indexables)).toContain('<loc>https://www.kultiled.com/actus/article-a/</loc>');
    expect(urlPage('actus/article-a/index.html')).toBe('https://www.kultiled.com/actus/article-a/');
  }, 60_000);

  it('veille injoignable : le build continue avec 0 page d’article (page de secours toujours là)', async () => {
    const retenus = await chargerVeilleAuBuild(resolve(racine, 'dossier-qui-n-existe-pas'));
    expect(retenus).toEqual([]);
    expect([...pagesActus().keys()]).toEqual([FICHIER_SECOURS, FICHIER_RENVOI_ACTUS]);
  });

  it('page de secours : noindex, sans publicité, script dédié et fiches du site', () => {
    const html = transformerPage(sourcePage(racine, FICHIER_SECOURS), FICHIER_SECOURS);
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('adsbygoogle');
    expect(html).toContain('src="/src/article-secours.ts"');
    const fiches = JSON.parse(html.match(/<script type="application\/json" id="fiches-du-site">([\s\S]*?)<\/script>/)![1]);
    expect(fiches['legume:radis']).toEqual({ href: 'legume-radis.html', nom: 'Radis' });
    expect(fiches['legume:chanvre-cbd']).toBeUndefined();
    expect(pageAvecAnnonces(FICHIER_SECOURS)).toBe(false);
    expect(pageAvecAnnonces('actus/article-a/index.html')).toBe(true);
  });

  it('liens relatifs des sous-dossiers', () => {
    expect(prefixeRelatif('actus/x/index.html')).toBe('../../');
    expect(prefixeRelatif('index.html')).toBe('');
    const html = '<a href="led.html">x</a><a href="#c">y</a><a href="https://a.fr/">z</a><script src="/src/site.ts"></script><a href="../actus.html">w</a><img src="marque/l.webp">';
    expect(reecrireLiensRelatifs(html, '../../')).toBe(
      '<a href="../../led.html">x</a><a href="#c">y</a><a href="https://a.fr/">z</a><script src="/src/site.ts"></script><a href="../actus.html">w</a><img src="../../marque/l.webp">',
    );
  });

  it('autres actus : 3 au plus, jamais l’actu de la page', () => {
    const actus = ['a', 'b', 'c', 'd', 'e'].map((c) => actu(c));
    const html = blocAutresActus(actus, id('b'), new Set());
    expect(html.match(/<li>/g)).toHaveLength(3);
    expect(html).not.toContain('Actu b');
    expect(html).toContain('loading="lazy"');
  });
});
