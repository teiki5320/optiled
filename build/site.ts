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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
  /** Texte alternatif de la photo de couverture (public/images/guides/<page>-1600.webp) */
  photo: string;
}

export type Rubrique = 'led' | 'culture';

export const RUBRIQUES: Record<Rubrique, { nom: string; hub: string; guides: Guide[] }> = {
  led: {
    nom: 'Éclairage LED',
    hub: 'led.html',
    guides: [
      { fichier: 'led-bases.html', titre: 'Les bases : PAR, PPFD, DLI et spectre', resume: 'Pourquoi les lumens ne servent à rien pour les plantes, et quels chiffres regarder à la place.', icone: 'ampoule', photo: "Barre LED horticole allumée au-dessus d'un bac de laitues" },
      { fichier: 'led-choisir.html', titre: 'Choisir ses LED', resume: 'Formats, lecture d’une fiche technique, dimensionnement et pièges du marketing.', icone: 'coche', photo: "Barres LED, panneau LED, tube LED et alimentation posés sur un plan de travail" },
      { fichier: 'led-installation.html', titre: 'Installer, régler et mesurer', resume: 'Hauteur, espacement, photopériode, gradation et mesure au PAR-mètre.', icone: 'jauge', photo: "Réglage de la hauteur d'une barre LED au-dessus de basilic, capteur PAR posé sur le bac" },
    ],
  },
  culture: {
    nom: 'Culture indoor',
    hub: 'culture.html',
    guides: [
      { fichier: 'culture-demarrer.html', titre: 'Démarrer une culture indoor', resume: 'Espace, matériel, premières cultures et premier cycle.', icone: 'depart', photo: "Étagère de culture éclairée par des LED dans une cuisine : salades, aromatiques et micro-pousses" },
      { fichier: 'culture-substrats.html', titre: 'Substrats et hydroponie', resume: 'Terreau, coco, laine de roche, Kratky, DWC, NFT.', icone: 'couches', photo: "Fibre de coco, laine de roche, billes d'argile, perlite et terreau, avec un plant de laitue en panier" },
      { fichier: 'culture-nutriments.html', titre: 'Arrosage, nutriments, pH et EC', resume: 'Nourrir ses plantes et piloter sa solution nutritive.', icone: 'goutte', photo: "Mesure du pH de la solution nutritive d'un système hydroponique de laitues" },
      { fichier: 'culture-climat.html', titre: 'Température, humidité et ventilation', resume: 'Maîtriser le climat : VPD, extraction, brassage.', icone: 'thermometre', photo: "Tente de culture avec extracteur, ventilateur de brassage et jeunes plants de tomates sous LED" },
      { fichier: 'culture-semis.html', titre: 'Semis, repiquage et bouturage', resume: 'Réussir ses départs de culture et ses micro-pousses.', icone: 'pousse', photo: "Plateau de semis sous couvercle et micro-pousses sous éclairage LED" },
      { fichier: 'culture-problemes.html', titre: 'Problèmes, carences et ravageurs', resume: 'Diagnostiquer et corriger sans paniquer.', icone: 'insecte', photo: "Inspection du revers d'une feuille de tomate à la loupe, piège jaune englué à côté" },
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
    <link rel="apple-touch-icon" href="icones/apple-touch-icon.png" />
    <link rel="manifest" href="manifest.webmanifest" />
    <meta name="theme-color" content="#1b1322" />`;
}

const DOSSIER_PARTAGE = resolve(__dirname, '../public/images/partage');

function attribut(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Adresse publique d'une page (l'accueil est servi à la racine). */
export function urlPage(fichier: string, url = SITE_URL): string {
  return fichier === 'index.html' ? url : `${url}${fichier}`;
}

/**
 * Balises de partage (Open Graph, Twitter), adresse canonique et données structurées
 * schema.org, déduites du titre, de la description et du type de page.
 */
export function referencement(html: string, fichier: string, url = SITE_URL): string {
  if (/content="noindex"/.test(html)) return '';
  const titre = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? NOM_SITE;
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  const nom = fichier.replace(/\.html$/, '');
  const image = `${url}images/partage/${existsSync(resolve(DOSSIER_PARTAGE, `${nom}.jpg`)) ? nom : 'accueil'}.jpg`;
  const adresse = urlPage(fichier, url);
  const r = rubriqueDe(fichier);
  const guide = r ? RUBRIQUES[r].guides.find((g) => g.fichier === fichier) : undefined;

  const donnees: object[] = [];
  if (fichier === 'index.html') {
    donnees.push({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Calculateur LED culture indoor — OptiLED',
      url: adresse,
      description,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Tous (navigateur web)',
      inLanguage: 'fr',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    });
  }
  if (r && guide) {
    const titreArticle = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? guide.titre;
    donnees.push(
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: titreArticle,
        description,
        image,
        inLanguage: 'fr',
        mainEntityOfPage: adresse,
        author: { '@type': 'Organization', name: NOM_SITE },
        publisher: { '@type': 'Organization', name: NOM_SITE },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: url },
          { '@type': 'ListItem', position: 2, name: RUBRIQUES[r].nom, item: `${url}${RUBRIQUES[r].hub}` },
          { '@type': 'ListItem', position: 3, name: guide.titre, item: adresse },
        ],
      },
    );
  }
  const json = donnees.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('\n    ');
  return `<link rel="canonical" href="${adresse}" />
    <meta property="og:type" content="${guide ? 'article' : 'website'}" />
    <meta property="og:site_name" content="${NOM_SITE}" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:title" content="${attribut(titre)}" />
    <meta property="og:description" content="${attribut(description)}" />
    <meta property="og:url" content="${adresse}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    ${json}`;
}

/** Mesure d'audience facultative et sans cookie : PLAUSIBLE_DOMAIN=mon-domaine.fr npm run build */
export function mesureAudience(domaine = process.env.PLAUSIBLE_DOMAIN): string {
  return domaine ? `<script defer data-domain="${attribut(domaine)}" src="https://plausible.io/js/script.js"></script>` : '';
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
      <p class="site-pied__note">Photos d'illustration des guides générées par intelligence artificielle ; schémas réalisés pour le site.</p>
      <p class="site-pied__note"><a href="mentions-legales.html">Mentions légales</a></p>
    </div>
    <div><h2>Outils</h2><ul><li><a href="index.html#calculateur">Calculateur LED</a></li><li><a href="legumes.html">Fiches légumes</a></li><li><a href="glossaire.html">Glossaire</a></li></ul></div>
    ${colonne('led')}
    ${colonne('culture')}
  </div>
</footer>`;
}

const DOSSIER_PHOTOS = resolve(__dirname, '../public/images/guides');

/** Photo d'un guide (srcset 800/1600 px), ou chaîne vide si elle n'existe pas encore. */
export function photoGuide(fichier: string, alt: string, sizes: string, chargement: 'lazy' | 'eager' = 'lazy'): string {
  const nom = fichier.replace(/\.html$/, '');
  if (!existsSync(resolve(DOSSIER_PHOTOS, `${nom}-1600.webp`))) return '';
  const prioritaire = chargement === 'eager' ? ' fetchpriority="high"' : '';
  return `<img src="images/guides/${nom}-800.webp" srcset="images/guides/${nom}-800.webp 800w, images/guides/${nom}-1600.webp 1600w" sizes="${sizes}" width="1600" height="900" alt="${alt.replace(/"/g, '&quot;')}" loading="${chargement}" decoding="async"${prioritaire} />`;
}

/** Cartes des guides d'une rubrique (accueil et pages de rubrique). */
export function cartesGuides(r: Rubrique): string {
  return `<div class="cartes-guides cartes-guides--${r}">${RUBRIQUES[r].guides
    .map(
      (g, i) => `<a class="carte-guide" href="${g.fichier}">
      <span class="carte-guide__photo">${photoGuide(g.fichier, '', '(min-width: 1100px) 360px, (min-width: 700px) 45vw, 92vw')}</span>
      <span class="carte-guide__icone">${icone(g.icone)}</span>
      <span class="carte-guide__num">${String(i + 1).padStart(2, '0')}</span>
      <strong>${g.titre}</strong>
      <span>${g.resume}</span>
      <span class="carte-guide__lire">Lire le guide ${icone('fleche', 'icone icone--petite')}</span>
    </a>`,
    )
    .join('')}</div>`;
}

/** Photo de couverture d'un guide, qui chevauche le bas du bandeau. */
function couverture(g: Guide): string {
  const img = photoGuide(g.fichier, g.photo, '(min-width: 1100px) 1040px, 94vw', 'eager');
  return img ? `<div class="conteneur"><figure class="article__couverture">${img}</figure></div>` : '';
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
  ${guides[rang] ? couverture(guides[rang]) : ''}
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
  const base = fichier === '404.html' ? `<base href="${SITE_URL}" />\n    ` : '';
  return mettreEnPageArticle(html, fichier)
    // Tableaux qui défilent horizontalement : atteignables et nommés au clavier.
    .replace(/<div class="tableau-defile">/g, '<div class="tableau-defile" tabindex="0" role="region" aria-label="Tableau (faire défiler horizontalement)">')
    // La 404 peut être servie sous n'importe quel chemin : liens résolus depuis la racine du site.
    .replace('<!--#head-->', `${base}<!--#head-->\n    ${referencement(html, fichier)}\n    ${mesureAudience()}`)
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
