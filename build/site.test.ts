import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conseilsPublies, dateDuJour, tousLesConseils } from './conseils.ts';
import {
  cartesGuides,
  cartesOrientation,
  dateModification,
  decoderEntites,
  fichiersImagesNonPubliees,
  footer,
  header,
  insecables,
  mesureAudience,
  texteMesureAudience,
  fluxRss,
  head,
  mettreEnPageArticle,
  NAVIGATION,
  PARCOURS,
  referencement,
  rendreConseilsLies,
  rendreDerniersConseils,
  RUBRIQUES,
  sitemap,
  dateDerniereModification,
  tempsLecture,
  transformerPage,
} from './site.ts';

const racine = resolve(import.meta.dirname, '..');

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

  it('« Lampes » a sa propre entrée ; les parcours sont rattachés à la rubrique Culture', () => {
    expect(header('lampes.html')).toContain('<a href="lampes.html" aria-current="page">Lampes</a>');
    expect(header('lampes.html')).not.toContain('<a href="led.html" aria-current');
    expect(header('led-bases.html')).not.toContain('<a href="lampes.html" aria-current');
    for (const p of PARCOURS) expect(header(p.fichier), p.fichier).toContain('<a href="culture.html" aria-current="page">');
  });
});

describe('pied de page', () => {
  it('mène à la page À propos, au contact et aux parcours', () => {
    const pied = footer();
    expect(pied).toContain('href="a-propos.html"');
    expect(pied).toContain('href="a-propos.html#contact"');
    for (const p of PARCOURS) expect(pied).toContain(`href="${p.fichier}"`);
  });
});

describe('date de mise à jour', () => {
  const pagesDatees = [...Object.values(RUBRIQUES).flatMap((r) => r.guides.map((g) => g.fichier)), ...PARCOURS.map((p) => p.fichier)];

  for (const fichier of pagesDatees) {
    it(`${fichier} : date de modification présente, valide et pas dans le futur`, () => {
      const source = readFileSync(resolve(racine, fichier), 'utf8');
      const date = dateModification(source);
      expect(date, 'ajoutez <meta name="date-modification" content="AAAA-MM-JJ" />').toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(date!))).toBe(false);
      expect(date! <= dateDuJour()).toBe(true);
      const html = transformerPage(source, fichier);
      expect(html).toMatch(new RegExp(`<p class="bandeau__etiquettes">[\\s\\S]*<time datetime="${date}">Mis à jour le `));
      expect(html).toContain(`"dateModified":"${date}"`);
    });
  }
});

describe('bouton « Partager »', () => {
  const article = (f: string) => mettreEnPageArticle(readFileSync(resolve(racine, f), 'utf8'), f);
  it('en fin de guide et de parcours, masqué sans JavaScript', () => {
    for (const f of ['led-bases.html', 'culture-climat.html', 'debuter.html', 'tente.html']) {
      expect(article(f), f).toMatch(/<div class="partage" data-partage hidden>[\s\S]*<button type="button"[^>]*>[\s\S]*Partager[\s\S]*<\/article>/);
    }
  });
  it('pas sur les pages de référence', () => {
    for (const f of ['glossaire.html', 'mentions-legales.html', 'a-propos.html']) expect(article(f), f).not.toContain('data-partage');
  });
});

describe('conseils cités par les pages', () => {
  const tous = tousLesConseils();
  const passe = tous.at(-1)!;
  const futur = tous[0];

  it("ne lie jamais un article qui n'est pas encore publié", () => {
    const date = passe.publieLe;
    const html = rendreConseilsLies([passe.slug, futur.slug, 'inconnu'], date);
    expect(html).toContain(`href="${passe.fichier}"`);
    if (futur.publieLe > date) expect(html).not.toContain(futur.fichier);
    expect(rendreConseilsLies([futur.slug], '2000-01-01')).not.toContain('conseil-');
  });

  it('accueil : les 3 derniers articles publiés, du plus récent au plus ancien', () => {
    const date = '2026-09-29';
    const liens = [...rendreDerniersConseils(3, date).matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const attendus = tous.filter((c) => c.publieLe <= date).slice(0, 3).map((c) => c.fichier);
    expect(liens).toEqual(attendus);
    expect(cartesOrientation(date)).toContain('href="debuter.html"');
    expect(cartesOrientation(date)).toContain('href="tente.html"');
  });
});

describe('sitemap', () => {
  it("liste les pages, sans la 404, avec l'accueil à la racine", () => {
    const xml = sitemap(['index.html', 'led.html', '404.html'], 'https://exemple.fr/');
    expect(xml).toContain('<loc>https://exemple.fr/</loc>');
    expect(xml).toContain('<loc>https://exemple.fr/led.html</loc>');
    expect(xml).not.toContain('404');
  });

  it('date de dernière modification réelle, jamais dans le futur', () => {
    const xml = sitemap(['led.html', 'glossaire.html'], 'https://exemple.fr/', (p) => (p === 'led.html' ? '2026-09-29' : undefined));
    expect(xml).toContain('<loc>https://exemple.fr/led.html</loc><lastmod>2026-09-29</lastmod>');
    expect(xml).toContain('<loc>https://exemple.fr/glossaire.html</loc></url>');
    const c = conseilsPublies('2026-10-03').at(-1)!;
    const d = dateDerniereModification(c.fichier, '', '2026-10-03');
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d! >= c.publieLe).toBe(true);
    expect(d! <= '2026-10-03').toBe(true);
    // Une page qui liste les articles change le jour de la dernière publication.
    expect(dateDerniereModification('conseils.html', '<!--#conseils-->', '2026-10-03')! >= conseilsPublies('2026-10-03')[0].publieLe).toBe(true);
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
    expect(html).toContain(`Guide 2 sur ${RUBRIQUES.led.guides.length}`);
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

  it("mesure d'audience seulement si un jeton valide est configuré", () => {
    expect(mesureAudience('')).toBe('');
    expect(mesureAudience('pas-un-jeton"><script>')).toBe('');
    const jeton = '0123456789abcdef0123456789abcdef';
    expect(mesureAudience(jeton)).toContain(`"token": "${jeton}"`);
    expect(mesureAudience(jeton)).toContain('static.cloudflareinsights.com/beacon.min.js');
    expect(texteMesureAudience('')).toContain("Aucune mesure d'audience");
    expect(texteMesureAudience(jeton)).toContain('sans cookie');
  });

  it('flux RSS des conseils publiés, échappé', () => {
    const flux = fluxRss('2026-09-30', 'https://exemple.fr/');
    expect(flux).toContain('<rss version="2.0"');
    expect(flux).toContain('<link>https://exemple.fr/conseils.html</link>');
    const items = flux.match(/<item>/g) ?? [];
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(20);
    // Aucun article programmé (date future) dans le flux.
    expect(flux).not.toContain('partir-en-vacances');
    expect(flux).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/);
  });

  it('head : flux RSS et grandes images autorisées', () => {
    expect(head()).toContain('type="application/rss+xml"');
    expect(head()).toContain('max-image-preview:large');
  });
});

describe('espaces insécables', () => {
  it('ponctuation double, guillemets, unités et milliers', () => {
    expect(insecables('<p>Attention : « oui » ? 24 °C, 3 600 s !</p>')).toBe('<p>Attention : « oui » ? 24 °C, 3 600 s !</p>');
  });
  it('ne touche ni aux balises ni aux scripts', () => {
    const html = '<a title="a : b" href="x?y=1">z</a><script>if (a ? b : c) {}</script><code>x ; y</code>';
    expect(insecables(html)).toBe(html);
  });
  it("pas d'unité collée à un mot", () => {
    expect(insecables('<p>2 mois, 3 heures</p>')).toBe('<p>2 mois, 3 heures</p>');
  });
});

describe('entités HTML', () => {
  it('décode les entités numériques et nommées', () => {
    expect(decoderEntites('d&#39;heures &amp; &quot;x&quot; &#60;b&#62; &lt;&gt; &#x27;')).toBe(`d'heures & "x" <b> <> '`);
    expect(decoderEntites('&inconnue;')).toBe('&inconnue;');
  });

  it('pas de double échappement dans les balises de partage', () => {
    const h = referencement(`<html><head><title>L&#39;éclairage &amp; les LED</title><meta name="description" content="Durée d&#39;éclairage conseillée pour une culture." /></head></html>`, 'legumes.html', 'https://exemple.fr/');
    expect(h).toContain(`<meta property="og:title" content="L'éclairage &amp; les LED" />`);
    expect(h).toContain(`<meta property="og:description" content="Durée d'éclairage conseillée pour une culture." />`);
    expect(h).not.toContain('&amp;#');
  });
});

describe('cartes des guides', () => {
  it('première rangée chargée d’emblée, priorité réseau pour la première photo seulement', () => {
    const images = [...cartesGuides('culture').matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    expect(images.length).toBeGreaterThanOrEqual(4);
    images.forEach((img, i) => {
      expect(img, `carte ${i + 1}`).toContain(i < 3 ? 'loading="eager"' : 'loading="lazy"');
      expect(img.includes('fetchpriority="high"'), `carte ${i + 1}`).toBe(i === 0);
    });
  });
});

describe('images des articles programmés', () => {
  it('ne publie pas les images des articles futurs', () => {
    expect(fichiersImagesNonPubliees('2999-01-01')).toEqual([]);
    const avant = fichiersImagesNonPubliees('2000-01-01');
    expect(avant.length).toBeGreaterThan(0);
    expect(avant.every((f) => /^images\/(guides|partage)\/conseil-/.test(f))).toBe(true);
  });
});
