/**
 * Pages des articles complets des actus (veille, depuis le 28 octobre 2026).
 *
 * Au build (hook `config` du plugin, build/site.ts) : lecture du fichier des actus de la veille,
 * puis de l'article de chaque actu qui a un `slug`. Chaque article devient une page statique
 * actus/<slug>/ (index.html), que Google peut trouver (sitemap, canonical, NewsArticle).
 * Si la veille ne répond pas, le build continue : 0 page d'article, rien d'autre ne change.
 *
 * Toujours produites, même sans veille :
 *   - actus/article/ : page de secours (noindex, hors sitemap), qui affiche dans le navigateur un
 *     article publié après la dernière construction (src/article-secours.ts) ;
 *   - actus/ : renvoi vers la page Actus (actus.html), au cas où l'adresse /actus serait tapée.
 *
 * Variables d'environnement (essais) : VEILLE_HORS_LIGNE=1 (aucune lecture), VEILLE_BASE=<adresse
 * ou dossier local> (autre source que https://teiki5320.github.io/veille/).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { articleValide, autresSources, BASE_VEILLE, cheminArticle, dateArticle, fichesLiees, minutesLecture, nomDomaine, SITE_VEILLE, type ArticleVeille, type FicheLiee } from '../src/article.ts';
import { imageCarree, lienCarte, MOTIF_ID, MOTIF_SLUG, nettoyerFichier, SLUG_RESERVE, texteCredit, type Actu, type ImageActu } from '../src/veille.ts';
import { chargerLegumes, echapper } from './fiches.ts';
import { icone } from './icones.ts';
import { fichierLegume } from './pages-legumes.ts';
import { CULTURES_EXCLUES, FICHIER_ACTUS } from './veille.ts';

export const NOM_SITE_ARTICLES = 'Kultiled';
export const DOSSIER_ACTUS = 'actus/';
export const FICHIER_SECOURS = 'actus/article/index.html';
export const FICHIER_RENVOI_ACTUS = 'actus/index.html';

export interface ArticleConstruit {
  actu: Actu;
  article: ArticleVeille;
  /** actus/<slug>/index.html */
  fichier: string;
}

interface EtatVeille {
  actus: Actu[];
  articles: ArticleConstruit[];
}

let etat: EtatVeille = { actus: [], articles: [] };

export const fichierArticle = (slug: string) => `${DOSSIER_ACTUS}${slug}/index.html`;

/** Remplace les données lues au build (tests, ou après lecture de la veille). Renvoie les articles retenus. */
export function definirVeille(actus: Actu[], articles: ArticleVeille[]): ArticleConstruit[] {
  const parId = new Map(actus.map((a) => [a.id, a]));
  const slugs = new Set<string>();
  const retenus: ArticleConstruit[] = [];
  for (const article of articles) {
    if (!articleValide(article)) continue;
    if (article.slug === SLUG_RESERVE || slugs.has(article.slug)) continue;
    slugs.add(article.slug);
    // Toutes les pages de l'index de la veille sont construites, même quand l'actu est sortie du
    // fichier des actus récentes : une page indexée ne disparaît jamais. L'actu porte le slug de la
    // page réellement construite (celui de l'article fait foi).
    const actu = parId.get(article.id) ?? actuDepuisArticle(article);
    retenus.push({ actu: { ...actu, slug: article.slug }, article, fichier: fichierArticle(article.slug) });
  }
  // Ordre stable : du plus récent au plus ancien.
  retenus.sort((x, y) => Date.parse(y.article.publie_le) - Date.parse(x.article.publie_le));
  const parSlug = new Map(retenus.map((r) => [r.actu.id, r.actu]));
  etat = { actus: actus.map((a) => parSlug.get(a.id) ?? a), articles: retenus };
  return retenus;
}

/** Actu reconstituée à partir de son article (actu sortie du fichier des actus récentes). */
function actuDepuisArticle(a: ArticleVeille): Actu {
  return {
    id: a.id, titre: a.titre, resume: a.chapo, theme: a.theme, pays: a.pays, tags: a.tags, source_nom: a.source_nom,
    source_url: a.source_url, autres_sources: a.autres_sources, publie_le: a.publie_le, image: a.image, slug: a.slug, lecture_min: a.lecture_min,
  };
}

export function articlesConstruits(): ArticleConstruit[] {
  return etat.articles;
}

export function actusDuBuild(): Actu[] {
  return etat.actus;
}

/** Slugs des pages construites, écrits dans le code du site (constante __ARTICLES_CONSTRUITS__). */
export function slugsConstruits(): string[] {
  return etat.articles.map((a) => a.article.slug);
}

async function lireJson(base: string, chemin: string): Promise<unknown> {
  if (!/^https?:\/\//.test(base)) return JSON.parse(readFileSync(resolve(base, chemin), 'utf8'));
  const rep = await fetch(new URL(chemin, base), { signal: AbortSignal.timeout(10_000) });
  if (!rep.ok) throw new Error(`HTTP ${rep.status} pour ${chemin}`);
  return rep.json();
}

/**
 * Lit la veille au moment du build. Ne lève jamais d'erreur : en cas de problème, 0 article.
 */
export async function chargerVeilleAuBuild(base = process.env.VEILLE_BASE || BASE_VEILLE): Promise<ArticleConstruit[]> {
  if (process.env.VEILLE_HORS_LIGNE === '1') {
    definirVeille([], []);
    return [];
  }
  const dossier = /^https?:\/\//.test(base) ? base.replace(/\/?$/, '/') : base;
  // Actus récentes (cartes, « Autres actus ») et index de tous les articles (jamais supprimés) :
  // l'un peut manquer sans empêcher l'autre.
  const [fichier, index] = await Promise.all([
    lireJson(dossier, `actus/${SITE_VEILLE}.json`).then(nettoyerFichier, (e: Error) => (console.warn(`Actus : fichier des actus illisible (${e.message}).`), null)),
    lireJson(dossier, `articles/${SITE_VEILLE}/index.json`).catch((e: Error) => (console.warn(`Actus : index des articles illisible (${e.message}).`), null)),
  ]);
  const actus = fichier?.actus ?? [];
  const ids = new Set<string>();
  const entrees = (index as { articles?: unknown } | null)?.articles;
  if (Array.isArray(entrees)) for (const e of entrees) if (e && typeof e.id === 'string' && MOTIF_ID.test(e.id)) ids.add(e.id);
  for (const a of actus) if (MOTIF_ID.test(a.id) && typeof a.slug === 'string' && MOTIF_SLUG.test(a.slug)) ids.add(a.id);
  // Lecture par paquets de 16 : l'index grandit avec le temps.
  const liste = [...ids];
  const articles: unknown[] = [];
  for (let i = 0; i < liste.length; i += 16) {
    articles.push(...(await Promise.all(liste.slice(i, i + 16).map((id) => lireJson(dossier, cheminArticle(id)).then((x) => (articleValide(x, id) ? x : null), () => null)))));
  }
  const retenus = definirVeille(actus, articles.filter((x): x is ArticleVeille => articleValide(x)));
  if (liste.length > retenus.length) console.warn(`Actus : ${liste.length - retenus.length} article(s) illisible(s) ou écarté(s).`);
  console.log(`Actus : ${actus.length} actus récentes, ${liste.length} article(s) dans la veille, ${retenus.length} page(s) d'article construite(s).`);
  return retenus;
}

/** Fiches existantes du site, par tag de la veille (jamais le chanvre). */
export function fichesDuSite(): Record<string, FicheLiee> {
  const fiches: Record<string, FicheLiee> = {};
  for (const l of chargerLegumes()) {
    if (CULTURES_EXCLUES.has(l.id)) continue;
    fiches[`legume:${l.id}`] = { href: fichierLegume(l.id), nom: l.nom };
  }
  return fiches;
}

/** Préfixe des liens relatifs d'une page rangée dans un sous-dossier (« actus/x/index.html » → « ../../ »). */
export function prefixeRelatif(fichier: string): string {
  return '../'.repeat(fichier.split('/').length - 1);
}

/**
 * Ajoute le préfixe aux liens relatifs (href, src) d'une page rangée dans un sous-dossier :
 * les parties communes (menu, pied de page) sont écrites pour les pages de la racine.
 * Laisse intacts les ancres (#…), les adresses absolues (/…, https:, mailto:…) et data:.
 */
export function reecrireLiensRelatifs(html: string, prefixe: string): string {
  if (!prefixe) return html;
  return html.replace(/(\s(?:href|src)=")(?![a-z][a-z0-9+.-]*:|\/|#|\.\.\/|\?)([^"]*)"/gi, (_m, debut: string, valeur: string) => `${debut}${prefixe}${valeur}"`);
}

const attr = (s: string) => echapper(s);
const externe = (href: string, texte: string) => `<a href="${attr(href)}" target="_blank" rel="noopener nofollow">${echapper(texte)}\u00a0↗</a>`;

/** Crédit de l'image, même rendu que les cartes d'actus (src/veille.ts, credit) : « Photo : auteur · licence » ou « Illustration : Kultiled ». */
export function creditImageHtml(image: ImageActu, balise: 'p' | 'figcaption' = 'p'): string {
  const contenu = image.source !== 'carte' && image.page
    ? `<a href="${attr(image.page)}" target="_blank" rel="noopener nofollow">${echapper(texteCredit(image))}</a>`
    : echapper(texteCredit(image));
  return `<${balise} class="actu__credit">${contenu}</${balise}>`;
}

/** Vignette d'actu (même rendu que src/veille.ts, carteActu) : toute la carte ouvre l'article. */
export function vignetteActuHtml(a: Actu, construits: ReadonlySet<string>): string {
  const lien = lienCarte(a, construits, '');
  const img = `<img class="actu__image" src="${attr(imageCarree(a.image))}" alt="${attr(a.image.alt)}" width="600" height="600" loading="lazy" decoding="async" />`;
  const titre = lien.interne ? `<a class="actu__lien" href="${attr(lien.href)}">${echapper(a.titre)}</a>` : echapper(a.titre);
  const source = lien.interne ? `Source : ${echapper(a.source_nom)}` : externe(a.source_url, `Source : ${a.source_nom}`);
  return `<article class="actu actu--vignette${lien.interne ? ' actu--lien' : ''}">
          <div class="actu__cadre">${img}</div>
          <div class="actu__corps"><h3 class="actu__titre">${titre}</h3><p class="actu__resume">${echapper(a.resume)}</p><p class="actu__source">${source}</p>${creditImageHtml(a.image)}</div>
        </article>`;
}

/** Bloc « Autres actus » : 3 vignettes, les plus récentes hors l'actu de la page. */
export function blocAutresActus(actus: Actu[], idCourant: string, construits: ReadonlySet<string>, nombre = 3): string {
  const autres = actus.filter((a) => a.id !== idCourant).slice(0, nombre);
  if (autres.length === 0) return '';
  return `<section class="actus actus--autres" aria-labelledby="titre-autres-actus">
      <div class="section__tete"><div><h2 id="titre-autres-actus">Autres actus</h2></div><a class="actus__toutes" href="${FICHIER_ACTUS}">Toutes les actus →</a></div>
      <ul class="actus__vignettes">${autres.map((a) => `<li>${vignetteActuHtml(a, construits)}</li>`).join('')}</ul>
    </section>`;
}

/** Encadré « Sources » : article rédigé par le site à partir de la source (et des autres sources). */
export function encadreSources(a: ArticleVeille, nomSite = NOM_SITE_ARTICLES): string {
  const autres = autresSources(a);
  const liens = [externe(a.source_url, a.source_nom), ...autres.map((u) => externe(u, nomDomaine(u)))];
  const liste = liens.length > 1 ? `${liens.slice(0, -1).join(', ')} et ${liens.at(-1)}` : liens[0];
  return `<aside class="actu-article__sources" aria-label="Sources">
          <p class="actu-article__sources-titre">Sources</p>
          <p>Article rédigé par ${echapper(nomSite)} à partir de : ${liste}.</p>
        </aside>`;
}

/** Liens vers les fiches du site citées par l'article. */
export function liensFiches(a: ArticleVeille, fiches = fichesDuSite()): string {
  const liees = fichesLiees(a.tags, fiches);
  if (liees.length === 0) return '';
  return `<ul class="actu-article__fiches">${liees.map((f) => `<li><a href="${attr(f.href)}">Lire la fiche culture : ${echapper(f.nom)} →</a></li>`).join('')}</ul>`;
}

/** Corps de l'article : image 16:9 et son crédit, blocs (h2 + paragraphes), sources, fiches. */
export function corpsArticle(a: ArticleVeille, fiches = fichesDuSite()): string {
  const figure = `<figure class="actu-article__figure">
          <div class="actu-article__image"><img src="${attr(a.image.url)}" alt="${attr(a.image.alt)}" width="${a.image.largeur || 1600}" height="${a.image.hauteur || 900}" fetchpriority="high" decoding="async" /></div>
          ${creditImageHtml(a.image, 'figcaption')}
        </figure>`;
  const blocs = a.blocs
    .map((b) => `${b.intertitre ? `<h2>${echapper(b.intertitre)}</h2>\n        ` : ''}${b.paragraphes.map((p) => `<p>${echapper(p)}</p>`).join('\n        ')}`)
    .join('\n        ');
  return `${figure}
        ${blocs}
        ${encadreSources(a)}
        ${liensFiches(a, fiches)}`;
}

/** Étiquettes du bandeau : rubrique, date de l'actu et durée de lecture. */
export function etiquettesArticle(a: Pick<ArticleVeille, 'publie_le' | 'lecture_min' | 'mots'>): string {
  const date = dateArticle(a.publie_le);
  return [
    `<span>${icone('ampoule')} Actus</span>`,
    date ? `<span><time datetime="${attr(a.publie_le)}">${date}</time></span>` : '',
    `<span>${icone('horloge')} ${minutesLecture(a)} min de lecture</span>`,
  ].join('');
}

/** Gabarit commun des deux pages (construite et de secours), dans le style des articles du site. */
function gabarit(o: { tete: string; fil: string; etiquettes: string; h1: string; chapo: string; corps: string; apres: string; scripts: string; attributs?: string }): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${o.tete}
    <!--#head-->
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="article article--culture article--actu"${o.attributs ?? ''}>
      <header class="bandeau bandeau--culture">
        <div class="conteneur">
          <p class="fil">${o.fil}</p>
          <p class="bandeau__etiquettes">${o.etiquettes}</p>
          ${o.h1}
          ${o.chapo}
        </div>
      </header>
      <div class="conteneur article__grille article__grille--seule">
        <article class="prose">${o.corps}</article>
      </div>
      <div class="conteneur article__apres">${o.apres}</div>
    </main>
    <!--#footer-->
    ${o.scripts}
  </body>
</html>
`;
}

const filArticle = (titre: string) => `<a href="index.html">Accueil</a> › <a href="${FICHIER_ACTUS}">Actus</a> › <span>${titre}</span>`;

/** Page statique d'un article (actus/<slug>/index.html). */
export function sourcePageArticle(c: ArticleConstruit, actus = etat.actus, construits: ReadonlySet<string> = new Set(slugsConstruits())): string {
  const a = c.article;
  return gabarit({
    tete: `<meta name="description" content="${attr(a.chapo)}" />
    <title>${echapper(a.titre)}</title>`,
    fil: filArticle(echapper(a.titre)),
    etiquettes: etiquettesArticle(a),
    h1: `<h1>${echapper(a.titre)}</h1>`,
    chapo: `<p class="chapo bandeau__chapo">${echapper(a.chapo)}</p>`,
    corps: corpsArticle(a),
    apres: blocAutresActus(actus, a.id, construits),
    scripts: '<script type="module" src="/src/site.ts"></script>',
  });
}

/** Page de secours (actus/article/?id=<id>) : remplie dans le navigateur, jamais indexée. */
export function sourcePageSecours(fiches = fichesDuSite()): string {
  const json = JSON.stringify(fiches).replace(/</g, '\\u003c');
  return gabarit({
    tete: `<meta name="robots" content="noindex" />
    <meta name="description" content="Article complet d'une actu de la culture en intérieur et de l'éclairage LED des plantes, avec sa source." />
    <title>Article — Actus Kultiled</title>`,
    fil: filArticle('<span data-a-fil>Article</span>'),
    etiquettes: `<span>${icone('ampoule')} Actus</span><span data-a-date hidden><time></time></span><span data-a-lecture hidden>${icone('horloge')} <span></span> min de lecture</span>`,
    h1: '<h1 data-a-titre>Chargement de l’article…</h1>',
    chapo: '<p class="chapo bandeau__chapo" data-a-chapo hidden></p>',
    corps: `<div data-article-secours><noscript><p>Cette page a besoin de JavaScript pour afficher l’article. <a href="${FICHIER_ACTUS}">Voir toutes les actus</a>.</p></noscript></div>`,
    apres: '<div data-a-autres></div>',
    attributs: ' data-page-secours',
    scripts: `<script type="application/json" id="fiches-du-site">${json}</script>
    <script type="module" src="/src/site.ts"></script>
    <script type="module" src="/src/article-secours.ts"></script>`,
  });
}

/** Renvoi de /actus/ vers la page Actus (actus.html). */
export function sourcePageRenvoiActus(): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=../${FICHIER_ACTUS}" />
    <title>Actus — Kultiled</title>
  </head>
  <body>
    <p><a href="../${FICHIER_ACTUS}">Voir les actus de la culture en intérieur</a></p>
  </body>
</html>
`;
}

/** Pages générées des actus : articles construits, page de secours, renvoi. */
export function pagesActus(): Map<string, string> {
  const construits = new Set(slugsConstruits());
  const pages = new Map<string, string>();
  for (const c of etat.articles) pages.set(c.fichier, sourcePageArticle(c, etat.actus, construits));
  pages.set(FICHIER_SECOURS, sourcePageSecours());
  pages.set(FICHIER_RENVOI_ACTUS, sourcePageRenvoiActus());
  return pages;
}

export function articleDuFichier(fichier: string): ArticleConstruit | undefined {
  return etat.articles.find((c) => c.fichier === fichier);
}

/** Adresse publique d'une page d'article (sans « index.html »). */
export const adresseArticle = (slug: string, url: string) => `${url}${DOSSIER_ACTUS}${slug}/`;

/** Balises de référencement d'une page d'article : canonical, Open Graph, NewsArticle et fil d'Ariane. */
export function referencementArticle(c: ArticleConstruit, url: string, logo: string): string {
  const a = c.article;
  const adresse = adresseArticle(a.slug, url);
  const autres = autresSources(a);
  const donnees = [
    {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: a.titre,
      description: a.chapo,
      image: [a.image.url],
      datePublished: a.publie_le,
      dateModified: a.redige_le || a.publie_le,
      inLanguage: 'fr',
      mainEntityOfPage: adresse,
      wordCount: a.mots,
      author: { '@type': 'Organization', name: NOM_SITE_ARTICLES, url },
      publisher: { '@type': 'Organization', name: NOM_SITE_ARTICLES, url, logo: { '@type': 'ImageObject', url: logo } },
      isBasedOn: autres.length ? [a.source_url, ...autres] : a.source_url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: url },
        { '@type': 'ListItem', position: 2, name: 'Actus', item: `${url}${FICHIER_ACTUS}` },
        { '@type': 'ListItem', position: 3, name: a.titre, item: adresse },
      ],
    },
  ];
  const json = donnees.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('\n    ');
  return `<link rel="canonical" href="${adresse}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${NOM_SITE_ARTICLES}" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:title" content="${attr(a.titre)}" />
    <meta property="og:description" content="${attr(a.chapo)}" />
    <meta property="og:url" content="${adresse}" />
    <meta property="og:image" content="${attr(a.image.url)}" />
    <meta property="og:image:width" content="${a.image.largeur || 1600}" />
    <meta property="og:image:height" content="${a.image.hauteur || 900}" />
    <meta property="og:image:alt" content="${attr(a.image.alt)}" />
    <meta property="article:published_time" content="${attr(a.publie_le)}" />
    <meta property="article:modified_time" content="${attr(a.redige_le || a.publie_le)}" />
    <meta name="twitter:card" content="summary_large_image" />
    ${json}`;
}

/** Date (AAAA-MM-JJ) de rédaction d'un article, pour le sitemap. */
export function dateArticleSitemap(fichier: string): string | undefined {
  const c = articleDuFichier(fichier);
  const d = c?.article.redige_le || c?.article.publie_le;
  return d && !Number.isNaN(Date.parse(d)) ? new Date(d).toISOString().slice(0, 10) : undefined;
}
