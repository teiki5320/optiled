/**
 * Plugin Vite « maison » : insère les parties communes dans chaque page HTML au moment
 * du build et met en page les articles. Le site reste 100 % statique : les pages sont
 * complètes même sans JavaScript.
 *
 * Marqueurs disponibles dans les pages :
 *   <!--#head-->            favicon, couleur du thème
 *   <!--#header-->          bandeau + navigation (la rubrique courante est mise en évidence)
 *   <!--#footer-->          pied de page
 *   <!--#fiches-->          fiches légumes générées depuis src/data/legumes.json
 *   <!--#cartes:led-->      cartes des guides LED (idem avec culture)
 *   <!--#icone:nom-->       une icône de build/icones.ts
 *
 * Les pages led-*.html, culture-*.html et glossaire.html écrites avec le modèle d'article
 * (fil d'Ariane, <article class="prose"> avec h1, chapo et sommaire) reçoivent
 * automatiquement un bandeau de titre, un sommaire latéral et un temps de lecture.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { rendreFiches } from './fiches';
import { icone, LOGO, type NomIcone } from './icones';

export const NOM_SITE = 'OptiLED';

/** Adresse publique du site (sitemap). Surchargeable : SITE_URL=https://mon-domaine.fr/ npm run build */
export const SITE_URL = (process.env.SITE_URL ?? 'https://teiki5320.github.io/optiled/').replace(/\/?$/, '/');

/** Rubriques de la navigation principale ; `pages` = fichiers rattachés à la rubrique. */
export const NAVIGATION: { href: string; libelle: string; pages: RegExp }[] = [
  { href: 'index.html', libelle: 'Calculateur', pages: /^(index|calculateur)\.html$/ },
  { href: 'led.html', libelle: 'LED', pages: /^led(-.*)?\.html$/ },
  { href: 'culture.html', libelle: 'Culture', pages: /^culture(-.*)?\.html$/ },
  { href: 'legumes.html', libelle: 'Légumes', pages: /^legumes\.html$/ },
  { href: 'glossaire.html', libelle: 'Glossaire', pages: /^glossaire\.html$/ },
];

export interface Guide {
  fichier: string;
  titre: string;
  resume: string;
  icone: NomIcone;
}

export type Rubrique = 'led' | 'culture';

export const RUBRIQUES: Record<Rubrique, { nom: string; hub: string; guides: Guide[] }> = {
  led: {
    nom: 'Éclairage LED',
    hub: 'led.html',
    guides: [
      { fichier: 'led-bases.html', titre: 'Les bases : PAR, PPFD, DLI et spectre', resume: 'Pourquoi les lumens ne servent à rien pour les plantes, et quels chiffres regarder à la place.', icone: 'ampoule' },
      { fichier: 'led-choisir.html', titre: 'Choisir ses LED', resume: 'Formats, lecture d’une fiche technique, dimensionnement et pièges du marketing.', icone: 'coche' },
      { fichier: 'led-installation.html', titre: 'Installer, régler et mesurer', resume: 'Hauteur, espacement, photopériode, gradation et mesure au PAR-mètre.', icone: 'jauge' },
    ],
  },
  culture: {
    nom: 'Culture indoor',
    hub: 'culture.html',
    guides: [
      { fichier: 'culture-demarrer.html', titre: 'Démarrer une culture indoor', resume: 'Espace, matériel, premières cultures et premier cycle.', icone: 'depart' },
      { fichier: 'culture-substrats.html', titre: 'Substrats et hydroponie', resume: 'Terreau, coco, laine de roche, Kratky, DWC, NFT.', icone: 'couches' },
      { fichier: 'culture-nutriments.html', titre: 'Arrosage, nutriments, pH et EC', resume: 'Nourrir ses plantes et piloter sa solution nutritive.', icone: 'goutte' },
      { fichier: 'culture-climat.html', titre: 'Température, humidité et ventilation', resume: 'Maîtriser le climat : VPD, extraction, brassage.', icone: 'thermometre' },
      { fichier: 'culture-semis.html', titre: 'Semis, repiquage et bouturage', resume: 'Réussir ses départs de culture et ses micro-pousses.', icone: 'pousse' },
      { fichier: 'culture-problemes.html', titre: 'Problèmes, carences et ravageurs', resume: 'Diagnostiquer et corriger sans paniquer.', icone: 'insecte' },
    ],
  },
};

export function rubriqueDe(fichier: string): Rubrique | null {
  if (/^led-/.test(fichier)) return 'led';
  if (/^culture-/.test(fichier)) return 'culture';
  return null;
}

const FAVICON = `data:image/svg+xml,${encodeURIComponent(LOGO.replace('class="logo-marque" ', 'xmlns="http://www.w3.org/2000/svg" '))}`;

export function head(): string {
  return `<link rel="icon" href="${FAVICON}" />
    <meta name="theme-color" content="#0c1510" />`;
}

function liensNavigation(fichier: string): string {
  return NAVIGATION.map(({ href, libelle, pages }) => {
    const actif = pages.test(fichier);
    return `<li><a href="${href}"${actif ? ' aria-current="page"' : ''}>${libelle}</a></li>`;
  }).join('');
}

export function header(fichier: string): string {
  const liens = liensNavigation(fichier);
  return `<a class="evitement" href="#contenu">Aller au contenu</a>
<div class="progression" aria-hidden="true"></div>
<header class="site-entete">
  <div class="conteneur site-entete__barre">
    <a class="logo" href="index.html">${LOGO}<span><strong>${NOM_SITE}</strong><small>LED &amp; culture indoor</small></span></a>
    <nav class="site-nav" aria-label="Navigation principale"><ul>${liens}</ul></nav>
    ${/^(index|calculateur)\.html$/.test(fichier) ? '' : `<a class="bouton bouton--plein bouton--entete" href="index.html#calculateur">${icone('calcul')}<span>Calculer</span></a>`}
    <details class="menu-mobile">
      <summary aria-label="Ouvrir le menu">${icone('menu')}<span>Menu</span></summary>
      <nav aria-label="Navigation principale (mobile)"><ul>${liens}</ul></nav>
    </details>
  </div>
</header>`;
}

export function footer(): string {
  const colonne = (r: Rubrique) =>
    `<div><h2>${RUBRIQUES[r].nom}</h2><ul>${RUBRIQUES[r].guides.map((g) => `<li><a href="${g.fichier}">${g.titre}</a></li>`).join('')}</ul></div>`;
  return `<footer class="site-pied">
  <div class="conteneur site-pied__grille">
    <div class="site-pied__marque">
      <a class="logo" href="index.html">${LOGO}<span><strong>${NOM_SITE}</strong><small>LED &amp; culture indoor</small></span></a>
      <p>Guides et outils gratuits pour cultiver des légumes sous LED, en intérieur.</p>
      <p class="site-pied__note">Les valeurs données sont des ordres de grandeur issus de la littérature horticole : adaptez-les à vos variétés et vérifiez avec un PAR-mètre.</p>
    </div>
    <div><h2>Outils</h2><ul><li><a href="index.html#calculateur">Calculateur LED</a></li><li><a href="legumes.html">Fiches légumes</a></li><li><a href="glossaire.html">Glossaire</a></li></ul></div>
    ${colonne('led')}
    ${colonne('culture')}
  </div>
</footer>`;
}

/** Cartes des guides d'une rubrique (accueil et pages de rubrique). */
export function cartesGuides(r: Rubrique): string {
  return `<div class="cartes-guides cartes-guides--${r}">${RUBRIQUES[r].guides
    .map(
      (g, i) => `<a class="carte-guide" href="${g.fichier}">
      <span class="carte-guide__icone">${icone(g.icone)}</span>
      <span class="carte-guide__num">${String(i + 1).padStart(2, '0')}</span>
      <strong>${g.titre}</strong>
      <span>${g.resume}</span>
      <span class="carte-guide__lire">Lire le guide ${icone('fleche', 'icone icone--petite')}</span>
    </a>`,
    )
    .join('')}</div>`;
}

export function tempsLecture(html: string): number {
  const mots = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(mots / 200));
}

/**
 * Met en page un article écrit avec le modèle : bandeau de titre (fil d'Ariane, rubrique,
 * temps de lecture, h1, chapo), sommaire en colonne latérale et contenu.
 * Renvoie le HTML inchangé si la page ne suit pas le modèle.
 */
export function mettreEnPageArticle(html: string, fichier: string): string {
  const main = html.match(/<main id="contenu" class="page">([\s\S]*?)<\/main>/);
  if (!main) return html;
  const interieur = main[1];
  const article = interieur.match(/<article class="prose">([\s\S]*?)<\/article>/);
  if (!article) return html;

  const fil = interieur.match(/<p class="fil">[\s\S]*?<\/p>/)?.[0] ?? '';
  let corps = article[1];
  const prendre = (re: RegExp) => {
    const m = corps.match(re);
    if (m) corps = corps.replace(m[0], '');
    return m?.[0] ?? '';
  };
  const h1 = prendre(/<h1[\s\S]*?<\/h1>/);
  const chapo = prendre(/<p class="chapo">[\s\S]*?<\/p>/);
  const sommaire = prendre(/<nav class="sommaire"[\s\S]*?<\/nav>/);
  const apres = interieur.slice(interieur.indexOf('</article>') + '</article>'.length);

  const r = rubriqueDe(fichier);
  const guides = r ? RUBRIQUES[r].guides : [];
  const rang = guides.findIndex((g) => g.fichier === fichier);
  const etiquette = [
    r ? `${icone(guides[rang]?.icone ?? 'livre')} ${RUBRIQUES[r].nom}` : `${icone('livre')} Référence`,
    rang >= 0 ? `Guide ${rang + 1} sur ${guides.length}` : '',
    `${icone('horloge')} ${tempsLecture(corps)} min de lecture`,
  ]
    .filter(Boolean)
    .map((e) => `<span>${e}</span>`)
    .join('');

  const nouveau = `<main id="contenu" class="article article--${r ?? 'reference'}">
  <header class="bandeau bandeau--${r ?? 'reference'}">
    <div class="conteneur">
      ${fil}
      <p class="bandeau__etiquettes">${etiquette}</p>
      ${h1}
      ${chapo.replace('class="chapo"', 'class="chapo bandeau__chapo"')}
    </div>
  </header>
  <div class="conteneur article__grille${sommaire ? '' : ' article__grille--seule'}">
    ${sommaire ? `<aside class="article__cote">${sommaire}</aside>` : ''}
    <article class="prose">${corps}</article>
  </div>
  <div class="conteneur article__apres">${apres}</div>
</main>`;
  return html.replace(main[0], nouveau);
}

/** Toutes les pages HTML à la racine du projet (entrées du build multi-pages). */
export function pagesHtml(racine: string): Record<string, string> {
  const entrees: Record<string, string> = {};
  for (const f of readdirSync(racine)) {
    if (f.endsWith('.html')) entrees[f.replace(/\.html$/, '')] = resolve(racine, f);
  }
  return entrees;
}

export function sitemap(pages: string[], url = SITE_URL): string {
  const urls = pages
    .filter((p) => p !== '404.html')
    .sort()
    .map((p) => `  <url><loc>${url}${p === 'index.html' ? '' : p}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Applique toutes les transformations à une page. */
export function transformerPage(html: string, fichier: string): string {
  return mettreEnPageArticle(html, fichier)
    .replace('<!--#head-->', head())
    .replace('<!--#header-->', header(fichier))
    .replace('<!--#footer-->', footer())
    .replace('<!--#fiches-->', () => rendreFiches())
    .replace(/<!--#cartes:(led|culture)-->/g, (_m, r: Rubrique) => cartesGuides(r))
    .replace(/<!--#icone:([a-z]+)-->/g, (_m, nom: NomIcone) => icone(nom));
}

export function pluginSite(): Plugin {
  let racine = process.cwd();
  return {
    name: 'optiled-site',
    configResolved(config) {
      racine = config.root;
    },
    transformIndexHtml(html, ctx) {
      return transformerPage(html, basename(ctx.filename));
    },
    generateBundle() {
      // Les pages marquées noindex (404, redirections) ne vont pas dans le sitemap.
      const pages = Object.entries(pagesHtml(racine))
        .filter(([, chemin]) => !readFileSync(chemin, 'utf8').includes('content="noindex"'))
        .map(([nom]) => `${nom}.html`);
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(pages) });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n` });
    },
  };
}
