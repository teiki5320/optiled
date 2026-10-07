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
 *   <!--#tuiles-->          tuiles des légumes du calculateur (src/tuiles.ts)
 *   <!--#nb-cultures-->     nombre de cultures de legumes.json (texte ou attribut)
 *   <!--#lampes-->          sélection de lampes Amazon.fr (src/data/lampes.json)
 *   <!--#sources-->         liste des références (glossaire), même source
 *   <!--#climat-->          tableau des températures jour / nuit (même source)
 *   <!--#cartes:led-->      cartes des guides LED (idem avec culture)
 *   <!--#icone:nom-->       une icône de build/icones.ts
 *   <!--#conseils-->        liste des articles de conseil publiés (build/conseils.ts)
 *   <!--#derniers-conseils--> les 3 derniers articles publiés (liste courte, accueil)
 *   <!--#conseils-lies:a,b--> liens vers les articles cités, seulement s'ils sont déjà publiés
 *   <!--#orientation-->     cartes d'orientation de l'accueil (parcours + derniers conseils)
 *   <!--#parcours-->        cartes des pages de parcours (debuter.html, tente.html)
 *   <!--#puissances-surfaces--> etc.  tableaux calculés des guides d'achat (build/guides-achat.ts)
 *   <!--#budget:etagere-->  budget de départ type (idem budget:tente), depuis src/data/budget.json (build/budget.ts)
 *   <!--#meilleures-lampes--> choix du mois par besoin (build/meilleures-lampes.ts)
 *   <!--#mois-lampes-->     « septembre 2026 », d'après verifie_le de lampes.json (utilisable dans <title>)
 *   <!--#lampes-verifiees-le--> verifie_le au format AAAA-MM-JJ (utilisable dans date-modification)
 *   <!--#mention-affiliation--> mention obligatoire du Programme Partenaires Amazon
 *   <!--#mesure-audience--> phrase des mentions légales sur la mesure d'audience (active ou non)
 *
 * Les pages led-*.html, culture-*.html, glossaire.html et mentions-legales.html écrites avec le modèle d'article
 * (fil d'Ariane, <article class="prose"> avec h1, chapo et sommaire) reçoivent
 * automatiquement un bandeau de titre, un sommaire latéral et un temps de lecture.
 * Une page qui porte <meta name="date-modification" content="AAAA-MM-JJ" /> affiche
 * « Mis à jour le … » dans son bandeau (et dateModified dans ses données structurées).
 * Les guides, les pages de parcours, les conseils et les fiches reçoivent un bouton « Partager ».
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { chargerLegumes, pageDetaillee, rendreFiches, rendreSources, rendreTableauClimat } from './fiches.ts';
import { htmlTuiles } from '../src/tuiles.ts';
import { rendreLampes } from './lampes.ts';
import { rendreBudget } from './budget.ts';
import { FICHIER_MEILLEURES_LAMPES, moisLampes, rendreMeilleuresLampes } from './meilleures-lampes.ts';
import { LAMPES_VERIFIEES_LE, MENTION_AFFILIATION } from '../src/lampes.ts';
import { pagesLegumes, PREFIXE_PAGE_LEGUME } from './pages-legumes.ts';
import { conseilsDeLaCulture, conseilsPublies, dateCourte, dateDuJour, dateLongue, pagesConseils, PREFIXE_PAGE_CONSEIL, rendreListeConseils, THEMES, tousLesConseils } from './conseils.ts';
import { echapper } from './fiches.ts';
import { rendreComparaisonLampes, rendreDliSemis, rendreEffetEfficacite, rendreEtageresSemis, rendrePuissancesCultures, rendrePuissancesSurfaces } from './guides-achat.ts';
import { insecables } from '../src/typo.ts';

export { insecables };
import { icone, logo, type NomIcone } from './icones.ts';
import { CARTES_PREMIERE_RANGEE, photoGuide } from './photos.ts';
export { photoGuide };

export const NOM_SITE = 'OptiLED';

/** Adresse publique du site (sitemap). Surchargeable : SITE_URL=https://mon-domaine.fr/ npm run build */
export const SITE_URL = (process.env.SITE_URL ?? 'https://www.optiled.fr/').replace(/\/?$/, '/');

/** Rubriques de la navigation principale ; `pages` = fichiers rattachés à la rubrique. */
export const NAVIGATION: { href: string; libelle: string; pages: RegExp }[] = [
  { href: 'index.html', libelle: 'Calculateur', pages: /^(index|calculateur)\.html$/ },
  { href: 'led.html', libelle: 'LED', pages: /^led(-.*)?\.html$/ },
  { href: 'lampes.html', libelle: 'Lampes', pages: /^(meilleures-)?lampes\.html$/ },
  // Les pages de parcours (débuter, tente) sont rattachées à la rubrique Culture.
  { href: 'culture.html', libelle: 'Culture', pages: /^(culture(-.*)?|debuter|tente)\.html$/ },
  { href: 'legumes.html', libelle: 'Légumes', pages: /^legumes?(-.*)?\.html$/ },
  { href: 'conseils.html', libelle: 'Conseils', pages: /^conseils?(-.*)?\.html$/ },
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
      { fichier: 'led-puissance.html', titre: 'Quelle puissance pour ma surface ?', resume: 'Les watts réels à prévoir selon la taille de l’étagère ou de la tente, et selon la culture.', icone: 'calcul', photo: '' },
      { fichier: 'led-comparer.html', titre: 'Comparer des lampes LED', resume: 'Départager deux modèles avec leurs chiffres, et comparatif de notre sélection.', icone: 'coche', photo: '' },
      { fichier: 'led-semis.html', titre: 'LED pour semis et boutures', resume: 'Peu de puissance, au bon endroit : réglettes, hauteur et durée pour les jeunes plants.', icone: 'pousse', photo: '' },
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

/**
 * Pages de parcours : courtes, orientées action, elles renvoient vers les guides, les fiches
 * et le calculateur. Elles ne sont pas numérotées dans une rubrique.
 */
export interface Parcours {
  fichier: string;
  titre: string;
  resume: string;
  icone: NomIcone;
}

export const PARCOURS: Parcours[] = [
  { fichier: 'debuter.html', titre: 'Je débute : salades et aromatiques', resume: 'Quoi cultiver, le matériel minimal et les premières semaines, sur une étagère.', icone: 'pousse' },
  { fichier: 'tente.html', titre: "J'ai une tente de culture", resume: 'Tomates, poivrons, piments : puissance, ventilation, lampe et pollinisation.', icone: 'fruit' },
];

export function estParcours(fichier: string): boolean {
  return PARCOURS.some((p) => p.fichier === fichier);
}

/** Date de dernière modification déclarée dans la page (<meta name="date-modification">), ou undefined. */
export function dateModification(html: string): string | undefined {
  return html.match(/<meta name="date-modification" content="(\d{4}-\d{2}-\d{2})"/)?.[1];
}

/** Étiquette « Mis à jour le … » du bandeau (réutilisable par les pages générées). */
export function etiquetteMiseAJour(iso: string): string {
  // Texte entier dans <time> : l'étiquette est en flex, une espace avant la balise serait doublée.
  return `${icone('coche')} <time datetime="${iso}">Mis à jour le ${dateLongue(iso)}</time>`;
}

/** Pages qui reçoivent le bouton « Partager » en fin d'article. */
export function estPartageable(fichier: string): boolean {
  return rubriqueDe(fichier) !== null || estParcours(fichier) || fichier.startsWith(PREFIXE_PAGE_CONSEIL) || fichier.startsWith(PREFIXE_PAGE_LEGUME);
}

/**
 * Bouton « Partager » : masqué sans JavaScript (src/site.ts l'active). Partage natif si le
 * navigateur le propose, sinon copie du lien ; aucun script tiers.
 */
export function boutonPartage(): string {
  return `<div class="partage" data-partage hidden>
          <button type="button" class="bouton partage__bouton">${icone('partage')} Partager cette page</button>
          <span class="partage__message" role="status"></span>
        </div>`;
}

export function rubriqueDe(fichier: string): Rubrique | null {
  if (/^led-/.test(fichier)) return 'led';
  if (/^culture-/.test(fichier)) return 'culture';
  return null;
}

/** Icônes publiées dans public/ (générées par scripts/favicon.mjs) : adresses réelles, utilisables par les moteurs de recherche. */
export function head(): string {
  return `<link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="icones/favicon-96.png" sizes="96x96" type="image/png" />
    <link rel="apple-touch-icon" href="icones/apple-touch-icon.png" />
    <link rel="manifest" href="manifest.webmanifest" />
    <link rel="alternate" type="application/rss+xml" title="Conseils OptiLED" href="${FICHIER_FLUX}" />
    <meta name="robots" content="max-image-preview:large" />
    <meta name="theme-color" content="#1b1322" />`;
}

const DOSSIER_PARTAGE = resolve(import.meta.dirname, '../public/images/partage');

function attribut(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Décode les entités HTML d'un texte lu dans une page (titre, description, h1…) : echapper()
 * y met par exemple &#39; pour l'apostrophe. Sans ce décodage, attribut() et le JSON-LD
 * les échapperaient une seconde fois (« d&amp;#39;heures »).
 */
export function decoderEntites(s: string): string {
  const nommees: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' };
  return s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, dec?: string, hex?: string, nom?: string) => {
    if (dec) return String.fromCodePoint(Number(dec));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return nommees[nom!.toLowerCase()] ?? m;
  });
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
  const titre = decoderEntites(html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? NOM_SITE);
  const description = decoderEntites(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  const nom = fichier.replace(/\.html$/, '');
  const image = `${url}images/partage/${existsSync(resolve(DOSSIER_PARTAGE, `${nom}.jpg`)) ? nom : 'accueil'}.jpg`;
  const adresse = urlPage(fichier, url);
  const r = rubriqueDe(fichier);
  const guide = r ? RUBRIQUES[r].guides.find((g) => g.fichier === fichier) : undefined;
  const pageLegume = fichier.startsWith(PREFIXE_PAGE_LEGUME);
  const pageConseil = fichier.startsWith(PREFIXE_PAGE_CONSEIL);
  const parcours = PARCOURS.find((p) => p.fichier === fichier);
  const pageMeilleuresLampes = fichier === FICHIER_MEILLEURES_LAMPES;
  const modifiee = dateModification(html);
  const miseAJour = modifiee ? { dateModified: modifiee } : {};

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
    const titreArticle = decoderEntites(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? guide.titre);
    donnees.push(
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: titreArticle,
        description,
        image,
        inLanguage: 'fr',
        mainEntityOfPage: adresse,
        ...miseAJour,
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
  if (pageLegume || pageConseil) {
    const titreArticle = decoderEntites(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? titre);
    const filLegume = html.match(/<p class="fil">[\s\S]*›\s*([^<›]+?)\s*<\/p>/)?.[1];
    const nom = pageLegume && filLegume ? decoderEntites(filLegume) : titreArticle;
    const datePublication = html.match(/<meta name="date-publication" content="([^"]+)"/)?.[1];
    donnees.push(
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: titreArticle,
        description,
        image,
        inLanguage: 'fr',
        mainEntityOfPage: adresse,
        ...(datePublication ? { datePublished: datePublication } : {}),
        ...miseAJour,
        author: { '@type': 'Organization', name: NOM_SITE },
        publisher: { '@type': 'Organization', name: NOM_SITE },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: url },
          pageLegume
            ? { '@type': 'ListItem', position: 2, name: 'Fiches légumes', item: `${url}legumes.html` }
            : { '@type': 'ListItem', position: 2, name: 'Conseils', item: `${url}conseils.html` },
          { '@type': 'ListItem', position: 3, name: nom, item: adresse },
        ],
      },
    );
  }
  if (parcours) {
    donnees.push(
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: decoderEntites(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? parcours.titre),
        description,
        image,
        inLanguage: 'fr',
        mainEntityOfPage: adresse,
        ...miseAJour,
        author: { '@type': 'Organization', name: NOM_SITE },
        publisher: { '@type': 'Organization', name: NOM_SITE },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: url },
          { '@type': 'ListItem', position: 2, name: RUBRIQUES.culture.nom, item: `${url}${RUBRIQUES.culture.hub}` },
          { '@type': 'ListItem', position: 3, name: parcours.titre, item: adresse },
        ],
      },
    );
  }
  if (pageMeilleuresLampes) {
    const titreArticle = decoderEntites(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? titre);
    donnees.push(
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: titreArticle,
        description,
        image,
        inLanguage: 'fr',
        mainEntityOfPage: adresse,
        ...miseAJour,
        author: { '@type': 'Organization', name: NOM_SITE },
        publisher: { '@type': 'Organization', name: NOM_SITE },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: url },
          { '@type': 'ListItem', position: 2, name: 'Lampes', item: `${url}lampes.html` },
          { '@type': 'ListItem', position: 3, name: titreArticle, item: adresse },
        ],
      },
    );
  }
  if (donnees.length === 0 && fichier !== 'index.html') donnees.push(...donneesPageSimple(html, fichier, url, adresse, description));
  const json = donnees.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('\n    ');
  return `<link rel="canonical" href="${adresse}" />
    <meta property="og:type" content="${guide || parcours || pageLegume || pageConseil || pageMeilleuresLampes ? 'article' : 'website'}" />
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

/** Pages de liste : CollectionPage avec la liste des pages qu'elles présentent. */
function elementsCollection(fichier: string, url: string): { nom: string; adresse: string }[] | null {
  switch (fichier) {
    case 'led.html':
    case 'culture.html':
      return RUBRIQUES[fichier === 'led.html' ? 'led' : 'culture'].guides.map((g) => ({ nom: g.titre, adresse: `${url}${g.fichier}` }));
    case 'conseils.html':
      return conseilsPublies().map((c) => ({ nom: decoderEntites(c.titre), adresse: `${url}${c.fichier}` }));
    case 'legumes.html':
      return chargerLegumes().map((l) => ({ nom: l.nom, adresse: `${url}${pageDetaillee(l.id)}` }));
    case 'lampes.html':
      return [];
    default:
      return null;
  }
}

/**
 * Données structurées des pages qui n'ont pas de modèle propre (rubriques, listes, glossaire,
 * pages d'information) : type de page adapté au contenu réel et fil d'Ariane.
 */
function donneesPageSimple(html: string, fichier: string, url: string, adresse: string, description: string): object[] {
  const nom = decoderEntites(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? NOM_SITE);
  const base = { '@context': 'https://schema.org', name: nom, description, url: adresse, inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: NOM_SITE, url } };
  let page: object;
  const elements = elementsCollection(fichier, url);
  if (fichier === 'glossaire.html') {
    const termes = [...html.matchAll(/<dt id="([^"]+)">([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)].map(([, id, terme, definition]) => ({
      '@type': 'DefinedTerm',
      name: decoderEntites(terme.replace(/<[^>]+>/g, '').trim()),
      description: decoderEntites(definition.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()),
      url: `${adresse}#${id}`,
    }));
    page = { ...base, '@type': 'DefinedTermSet', hasDefinedTerm: termes };
  } else if (elements) {
    page = {
      ...base,
      '@type': 'CollectionPage',
      ...(elements.length
        ? { mainEntity: { '@type': 'ItemList', itemListElement: elements.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.nom, url: e.adresse })) } }
        : {}),
    };
  } else {
    page = { ...base, '@type': fichier === 'a-propos.html' ? 'AboutPage' : 'WebPage' };
  }
  // Fil d'Ariane : la page Lampes est rangée sous « Éclairage LED ».
  const parents = fichier === 'lampes.html' ? [{ nom: RUBRIQUES.led.nom, adresse: `${url}${RUBRIQUES.led.hub}` }] : [];
  const fil = [{ nom: 'Accueil', adresse: url }, ...parents, { nom, adresse }];
  return [
    page,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: fil.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.nom, item: e.adresse })),
    },
  ];
}

/**
 * Mesure d'audience gratuite et sans cookie (Cloudflare Web Analytics) : le jeton public du site
 * est lu dans CF_BEACON_TOKEN au build (variable du dépôt GitHub, voir le workflow).
 * Sans jeton, aucun script de mesure n'est ajouté.
 */
export function mesureAudience(jeton = process.env.CF_BEACON_TOKEN ?? ''): string {
  if (!/^[0-9a-f]{32}$/i.test(jeton)) return '';
  return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${jeton}"}'></script>`;
}

/** Phrase des mentions légales sur la mesure d'audience (marqueur <!--#mesure-audience-->). */
export function texteMesureAudience(jeton = process.env.CF_BEACON_TOKEN ?? ''): string {
  return mesureAudience(jeton)
    ? "La <strong>mesure d'audience</strong> utilise Cloudflare Web Analytics : sans cookie ni stockage sur votre appareil, elle compte les pages vues de façon agrégée (page, pays, type d'appareil) et ne conserve pas votre adresse IP."
    : "Aucune mesure d'audience n'est active.";
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
    <a class="logo" href="index.html">${logo()}<span><strong>${NOM_SITE}</strong><small>LED &amp; culture indoor</small></span></a>
    <nav class="site-nav" aria-label="Navigation principale"><ul>${liens}</ul></nav>
    ${/^(index|calculateur)\.html$/.test(fichier) ? '' : `<a class="bouton bouton--plein bouton--entete" href="index.html#calculateur">${icone('calcul')}<span>Calculer</span></a>`}
    <details class="menu-mobile">
      <summary aria-label="Menu">${icone('menu')}<span>Menu</span></summary>
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
      <a class="logo" href="index.html">${logo('-pied')}<span><strong>${NOM_SITE}</strong><small>LED &amp; culture indoor</small></span></a>
      <p>Guides et outils gratuits pour cultiver des légumes sous LED, en intérieur.</p>
      <p class="site-pied__note">Les valeurs données sont des ordres de grandeur issus de la <a href="glossaire.html#sources">littérature horticole</a> : adaptez-les à vos variétés et vérifiez avec un PAR-mètre.</p>
      <p class="site-pied__note">Photos (guides, conseils, cultures) et certains schémas des guides Culture générés par intelligence artificielle ; les autres schémas sont réalisés pour le site.</p>
      <p class="site-pied__note">Certains liens vers Amazon sont sponsorisés : en tant que Partenaire Amazon, l'éditeur réalise un bénéfice sur les achats remplissant les conditions requises.</p>
      <p class="site-pied__note"><a href="a-propos.html">À propos et méthode</a> · <a href="a-propos.html#contact">Contact</a> · <a href="mentions-legales.html">Mentions légales</a></p>
    </div>
    <div><h2>Outils</h2><ul><li><a href="index.html#calculateur">Calculateur LED</a></li><li><a href="lampes.html">Lampes conseillées</a></li><li><a href="${FICHIER_MEILLEURES_LAMPES}">Meilleures lampes du mois</a></li><li><a href="legumes.html">Fiches légumes</a></li><li><a href="conseils.html">Conseils</a></li><li><a href="carnet-de-suivi.html">Carnet de suivi à imprimer</a></li><li><a href="glossaire.html">Glossaire</a></li><li><a href="integrer.html">Intégrer le calculateur</a></li></ul>
      <h2 class="site-pied__sous-titre">Parcours</h2><ul>${PARCOURS.map((p) => `<li><a href="${p.fichier}">${p.titre}</a></li>`).join('')}</ul></div>
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
      <span class="carte-guide__photo">${photoGuide(g.fichier, '', '(min-width: 1100px) 360px, (min-width: 700px) 45vw, 92vw', i < CARTES_PREMIERE_RANGEE ? 'eager' : 'lazy', i === 0)}</span>
      <span class="carte-guide__icone">${icone(g.icone)}</span>
      <span class="carte-guide__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <strong>${g.titre}</strong>
      <span>${g.resume}</span>
      <span class="carte-guide__lire">Lire le guide ${icone('fleche', 'icone icone--petite')}</span>
    </a>`,
    )
    .join('')}</div>`;
}

/** Liste courte des derniers articles publiés (carte « Derniers conseils » de l'accueil). */
export function rendreDerniersConseils(nombre = 3, date = dateDuJour()): string {
  const derniers = conseilsPublies(date).slice(0, nombre);
  if (derniers.length === 0) return '<p>Les premiers articles arrivent bientôt.</p>';
  return `<ul class="liste-conseils">${derniers
    .map((c) => `<li><a href="${c.fichier}"><time datetime="${c.publieLe}">${dateCourte(c.publieLe)}</time>${echapper(c.titre)}</a></li>`)
    .join('')}</ul>`;
}

/**
 * Liens vers des articles de conseil choisis (marqueur <!--#conseils-lies:slug1,slug2-->),
 * limités à ceux déjà publiés : un article programmé apparaît seul le jour de sa publication.
 */
export function rendreConseilsLies(slugs: string[], date = dateDuJour()): string {
  const publies = new Map(conseilsPublies(date).map((c) => [c.slug, c]));
  const liste = slugs.map((s) => publies.get(s.trim())).filter((c) => c !== undefined);
  if (liste.length === 0) return '<p>Les articles de conseil sur ce sujet arrivent bientôt : voir la page <a href="conseils.html">Conseils</a>.</p>';
  return `<ul class="liste-conseils">${liste.map((c) => `<li><a href="${c.fichier}">${echapper(c.titre)}</a></li>`).join('')}</ul>`;
}

/** Photos (déjà publiées) reprises sur les cartes des parcours : celles des guides les plus proches. */
const PHOTOS_PARCOURS: Record<string, string> = { 'debuter.html': 'culture-demarrer.html', 'tente.html': 'culture-climat.html' };

/** Cartes des pages de parcours (marqueur <!--#parcours-->, et accueil). */
function cartesParcours(): string {
  return PARCOURS.map(
    (p) => `<a class="carte-guide" href="${p.fichier}">
      <span class="carte-guide__photo">${photoGuide(PHOTOS_PARCOURS[p.fichier] ?? p.fichier, '', '(min-width: 1100px) 360px, (min-width: 700px) 45vw, 92vw')}</span>
      <span class="carte-guide__icone">${icone(p.icone)}</span>
      <strong>${p.titre}</strong>
      <span>${p.resume}</span>
      <span class="carte-guide__lire">Suivre le parcours ${icone('fleche', 'icone icone--petite')}</span>
    </a>`,
  ).join('');
}

/** Cartes d'orientation de l'accueil : les deux parcours et les derniers conseils. */
export function cartesOrientation(date = dateDuJour()): string {
  return `<div class="cartes-guides cartes-orientation">${cartesParcours()}
    <div class="carte-guide carte-orientation--conseils">
      <span class="carte-guide__icone">${icone('ampoule')}</span>
      <strong>Derniers conseils</strong>
      ${rendreDerniersConseils(3, date)}
      <a class="carte-guide__lire" href="conseils.html">Tous les conseils ${icone('fleche', 'icone icone--petite')}</a>
    </div>
  </div>`;
}

/** Photo de couverture d'un guide, qui chevauche le bas du bandeau. */
function couverture(g: Guide): string {
  const img = photoGuide(g.fichier, g.photo, '(min-width: 1100px) 1040px, 94vw', 'eager');
  return img ? `<div class="conteneur"><figure class="article__couverture">${img}</figure></div>` : '';
}

/** Photo de couverture d'un article de conseil, s'il en a une. */
function couvertureConseil(fichier: string): string {
  if (!fichier.startsWith(PREFIXE_PAGE_CONSEIL)) return '';
  const c = tousLesConseils().find((x) => x.fichier === fichier);
  const img = c?.photo ? photoGuide(fichier, c.photo, '(min-width: 1100px) 1040px, 94vw', 'eager') : '';
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
  const parcours = PARCOURS.find((p) => p.fichier === fichier);
  const guides = r ? RUBRIQUES[r].guides : [];
  const rang = guides.findIndex((g) => g.fichier === fichier);
  const modifiee = dateModification(html);
  // Couleur du bandeau : celle de la rubrique ; les parcours prennent celle de la culture.
  const teinte = r ?? (parcours ? 'culture' : 'reference');
  const etiquette = [
    r
      ? `${icone(guides[rang]?.icone ?? 'livre')} ${RUBRIQUES[r].nom}`
      : parcours
        ? `${icone(parcours.icone)} Parcours`
        : fichier.startsWith(PREFIXE_PAGE_CONSEIL)
          ? `${icone('ampoule')} Conseils`
          : fichier.startsWith(PREFIXE_PAGE_LEGUME)
            ? `${icone('feuille')} Fiche culture`
            : `${icone('livre')} Référence`,
    rang >= 0 ? `Guide ${rang + 1} sur ${guides.length}` : '',
    `${icone('horloge')} ${tempsLecture(corps)} min de lecture`,
    modifiee ? etiquetteMiseAJour(modifiee) : '',
  ]
    .filter(Boolean)
    .map((e) => `<span>${e}</span>`)
    .join('');

  const nouveau = `<main id="contenu" class="article article--${teinte}">
  <header class="bandeau bandeau--${teinte}">
    <div class="conteneur">
      ${fil}
      <p class="bandeau__etiquettes">${etiquette}</p>
      ${h1}
      ${chapo.replace('class="chapo"', 'class="chapo bandeau__chapo"')}
    </div>
  </header>
  ${guides[rang] ? couverture(guides[rang]) : couvertureConseil(fichier)}
  <div class="conteneur article__grille${sommaire ? '' : ' article__grille--seule'}">
    ${sommaire ? `<aside class="article__cote">${sommaire}</aside>` : ''}
    <article class="prose">${corps}${estPartageable(fichier) ? boutonPartage() : ''}</article>
  </div>
  <div class="conteneur article__apres">${apres}</div>
</main>`;
  return html.replace(main[0], nouveau);
}

/** Pages HTML écrites à la racine du projet. */
export function pagesHtml(racine: string): Record<string, string> {
  const entrees: Record<string, string> = {};
  for (const f of readdirSync(racine)) {
    if (f.endsWith('.html')) entrees[f.replace(/\.html$/, '')] = resolve(racine, f);
  }
  return entrees;
}

/** Pages générées au build (elles n'existent pas sur le disque) : cultures et articles de conseil publiés. */
export function pagesGenerees(): Map<string, string> {
  return new Map([...pagesLegumes(), ...pagesConseils()]);
}

/** Toutes les entrées du build multi-pages : pages écrites + pages générées. */
export function toutesLesPages(racine: string): Record<string, string> {
  const entrees = pagesHtml(racine);
  for (const f of pagesGenerees().keys()) entrees[f.replace(/\.html$/, '')] = resolve(racine, f);
  return entrees;
}

/** Contenu source d'une page (avec marqueurs) : fichier écrit, ou page générée. */
export function sourcePage(racine: string, fichier: string): string {
  const chemin = resolve(racine, fichier);
  if (existsSync(chemin)) return readFileSync(chemin, 'utf8');
  const genere = pagesGenerees().get(fichier);
  if (genere === undefined) throw new Error(`Page inconnue : ${fichier}`);
  return genere;
}

/** Nom de fichier d'une page générée (legume-<id>.html, conseil-<slug>.html) à partir d'un chemin ou d'une adresse, ou null. */
function pageGeneree(id: string): string | null {
  const f = basename(id.split('?')[0]);
  if (!f.startsWith(PREFIXE_PAGE_LEGUME) && !f.startsWith(PREFIXE_PAGE_CONSEIL)) return null;
  return pagesGenerees().has(f) ? f : null;
}

/**
 * Date de dernière modification d'une page (AAAA-MM-JJ) pour le sitemap. Elle vient du contenu
 * réel, pas de la date de génération : date du dernier commit des fichiers dont dépend la page
 * (source, données), date de publication des articles de conseil qu'elle affiche et éventuelle
 * <meta name="date-modification">. Undefined si rien n'est connu (hors dépôt git).
 */
export function dateDerniereModification(fichier: string, source: string, date = dateDuJour()): string | undefined {
  const publies = conseilsPublies(date);
  const candidates: (string | undefined)[] = [dateModification(source)];
  if (fichier.startsWith(PREFIXE_PAGE_CONSEIL)) {
    const c = publies.find((x) => x.fichier === fichier);
    candidates.push(c?.publieLe, dateGit([`contenu/conseils/${c?.slug}.html`]));
  } else if (fichier.startsWith(PREFIXE_PAGE_LEGUME)) {
    const id = fichier.slice(PREFIXE_PAGE_LEGUME.length, -'.html'.length);
    candidates.push(dateGit(['src/data/legumes.json', 'src/data/lampes.json', 'build/pages-legumes.ts']), conseilsDeLaCulture(id, date).at(-1)?.publieLe);
  } else {
    candidates.push(dateGit([fichier, ...(DONNEES_DES_PAGES[fichier] ?? [])]));
    // Listes d'articles : la page change quand un article est publié.
    if (/<!--#(conseils|derniers-conseils|orientation)-->/.test(source)) candidates.push(publies[0]?.publieLe);
    for (const [, liste] of source.matchAll(/<!--#conseils-lies:([a-z0-9,\s-]+)-->/g)) {
      for (const slug of liste.split(',')) candidates.push(publies.find((c) => c.slug === slug.trim())?.publieLe);
    }
  }
  const dates = candidates.filter((d): d is string => !!d && d <= date).sort();
  return dates.at(-1);
}

/** Fichiers de données dont dépend le contenu d'une page écrite (en plus de la page elle-même). */
const DONNEES_DES_PAGES: Record<string, string[]> = {
  'index.html': ['src/data/legumes.json'],
  'legumes.html': ['src/data/legumes.json'],
  'glossaire.html': ['src/data/legumes.json'],
  'lampes.html': ['src/data/lampes.json'],
  'meilleures-lampes.html': ['src/data/lampes.json', 'src/data/budget.json'],
  'led-comparer.html': ['src/data/lampes.json'],
  'led-puissance.html': ['src/data/legumes.json'],
  'led-semis.html': ['src/data/legumes.json'],
  'debuter.html': ['src/data/budget.json'],
  'tente.html': ['src/data/budget.json'],
  'mentions-legales.html': ['src/lampes.ts'],
};

const RACINE_PROJET = resolve(import.meta.dirname, '..');

/** Date (AAAA-MM-JJ) du dernier commit qui touche ces fichiers, ou undefined (pas de dépôt, historique absent). */
function dateGit(fichiers: string[]): string | undefined {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...fichiers], { cwd: RACINE_PROJET, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  } catch {
    return undefined;
  }
}

export function sitemap(pages: string[], url = SITE_URL, lastmod: (page: string) => string | undefined = () => undefined): string {
  const urls = pages
    .filter((p) => p !== '404.html')
    .sort()
    .map((p) => {
      const d = lastmod(p);
      return `  <url><loc>${url}${p === 'index.html' ? '' : p}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Flux RSS des articles de conseil publiés (abonnement dans un lecteur de flux). */
export const FICHIER_FLUX = 'conseils.xml';

function xml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Les 20 derniers articles publiés, au format RSS 2.0 (date : le matin de la publication, heure de Paris). */
export function fluxRss(date = dateDuJour(), url = SITE_URL, nombre = 20): string {
  const articles = conseilsPublies(date).slice(0, nombre);
  const jour = (iso: string) => new Date(`${iso}T05:00:00Z`).toUTCString();
  const items = articles
    .map((c) => {
      const adresse = `${url}${c.fichier}`;
      return `    <item>
      <title>${xml(decoderEntites(c.titre))}</title>
      <link>${adresse}</link>
      <guid isPermaLink="true">${adresse}</guid>
      <pubDate>${jour(c.publieLe)}</pubDate>
      <category>${xml(THEMES[c.theme])}</category>
      <description>${xml(decoderEntites(c.description))}</description>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Conseils OptiLED — LED et culture indoor</title>
    <link>${url}conseils.html</link>
    <atom:link href="${url}${FICHIER_FLUX}" rel="self" type="application/rss+xml" />
    <description>Un article par semaine pour cultiver des légumes sous LED, en intérieur.</description>
    <language>fr-FR</language>
${articles.length ? `    <lastBuildDate>${jour(articles[0].publieLe)}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`;
}

/** Applique toutes les transformations à une page. */
export function transformerPage(html: string, fichier: string): string {
  let numeroTableau = 0;
  // Nombre de cultures, tiré des données (avant tout : il peut figurer dans la description).
  html = html.replace(/<!--#nb-cultures-->/g, () => String(chargerLegumes().length));
  // Mois de la sélection de lampes (titre, h1) et date de vérification (date-modification) : avant le référencement.
  html = html
    .replace(/<!--#mois-lampes-->/g, () => moisLampes())
    .replace(/<!--#lampes-verifiees-le-->/g, () => LAMPES_VERIFIEES_LE)
    .replace(/<!--#mention-affiliation-->/g, () => MENTION_AFFILIATION)
    .replace(/<!--#mesure-audience-->/g, () => texteMesureAudience());
  const base = fichier === '404.html' ? `<base href="${SITE_URL}" />\n    ` : '';
  const page = mettreEnPageArticle(html, fichier)
    .replace('<!--#climat-->', () => rendreTableauClimat())
    .replace('<!--#tuiles-->', () => htmlTuiles())
    .replace('<!--#sources-->', () => rendreSources())
    .replace('<!--#lampes-->', () => rendreLampes())
    .replace('<!--#meilleures-lampes-->', () => rendreMeilleuresLampes())
    .replace(/<!--#budget:([a-z-]+)-->/g, (_m, id: string) => rendreBudget(id))
    .replace('<!--#conseils-->', () => rendreListeConseils())
    .replace('<!--#orientation-->', () => cartesOrientation())
    .replace('<!--#parcours-->', () => `<div class="cartes-guides cartes-orientation">${cartesParcours()}</div>`)
    .replace(/<!--#conseils-lies:([a-z0-9,\s-]+)-->/g, (_m, liste: string) => rendreConseilsLies(liste.split(',')))
    .replace('<!--#puissances-surfaces-->', () => rendrePuissancesSurfaces())
    .replace('<!--#puissances-cultures-->', () => rendrePuissancesCultures())
    .replace('<!--#effet-efficacite-->', () => rendreEffetEfficacite())
    .replace('<!--#comparaison-lampes-->', () => rendreComparaisonLampes())
    .replace('<!--#etageres-semis-->', () => rendreEtageresSemis())
    .replace('<!--#dli-semis-->', () => rendreDliSemis())
    // Tableaux qui défilent horizontalement : atteignables et nommés au clavier.
    .replace(/<div class="tableau-defile">/g, () => `<div class="tableau-defile" tabindex="0" role="region" aria-label="Tableau ${++numeroTableau} (faire défiler horizontalement)">`)
    // La 404 peut être servie sous n'importe quel chemin : liens résolus depuis la racine du site.
    .replace('<!--#head-->', `${base}<!--#head-->\n    ${referencement(html, fichier)}\n    ${mesureAudience()}`)
    .replace('<!--#head-->', head())
    .replace('<!--#header-->', header(fichier))
    .replace('<!--#footer-->', footer())
    .replace('<!--#fiches-->', () => rendreFiches())
    .replace(/<!--#cartes:(led|culture)-->/g, (_m, r: Rubrique) => cartesGuides(r))
    .replace(/<!--#icone:([a-z]+)-->/g, (_m, nom: NomIcone) => icone(nom));
  return insecables(page);
}

/** Images (photo et partage) des articles de conseil pas encore publiés, chemins relatifs au dossier de sortie. */
export function fichiersImagesNonPubliees(date?: string): string[] {
  const publies = new Set(conseilsPublies(date).map((c) => c.slug));
  return tousLesConseils()
    .filter((c) => !publies.has(c.slug))
    .flatMap((c) => [800, 1600].map((l) => `images/guides/${PREFIXE_PAGE_CONSEIL}${c.slug}-${l}.webp`).concat(`images/partage/${PREFIXE_PAGE_CONSEIL}${c.slug}.jpg`));
}

// Cloudflare Web Analytics : visites, pages et provenance, sans cookie ni bandeau.
const MESURE_AUDIENCE =
  `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "bc705dd734324f6cae561f7e7da0d3be"}'></script>`;

export function pluginSite(): Plugin {
  let racine = process.cwd();
  let sortie = resolve(racine, 'dist');
  return {
    name: 'optiled-site',
    configResolved(config) {
      racine = config.root;
      sortie = resolve(config.root, config.build.outDir);
    },
    // Pages détaillées des cultures : elles n'existent pas sur le disque, on les fournit à Vite.
    resolveId(id) {
      return pageGeneree(id) ? resolve(racine, basename(id.split('?')[0])) : null;
    },
    load(id) {
      const f = pageGeneree(id);
      return f ? sourcePage(racine, f) : null;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const f = req.url ? pageGeneree(req.url) : null;
        if (!f) return next();
        const html = await server.transformIndexHtml(req.url!, sourcePage(racine, f));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      });
    },
    transformIndexHtml(html, ctx) {
      const page = transformerPage(html, basename(ctx.filename));
      // Mesure d'audience Cloudflare Web Analytics (sans cookie), seulement sur le site publié.
      return ctx.server ? page : page.replace('</body>', `${MESURE_AUDIENCE}\n</body>`);
    },
    generateBundle() {
      // Les pages marquées noindex (404, redirections) ne vont pas dans le sitemap.
      const pages = Object.keys(toutesLesPages(racine))
        .map((nom) => `${nom}.html`)
        .filter((f) => !sourcePage(racine, f).includes('content="noindex"'));
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(pages, SITE_URL, (f) => dateDerniereModification(f, sourcePage(racine, f))) });
      this.emitFile({ type: 'asset', fileName: FICHIER_FLUX, source: fluxRss() });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n` });
    },
    closeBundle() {
      // Les photos des articles programmés ne sont publiées qu'avec l'article (public/ est copié en entier).
      for (const f of fichiersImagesNonPubliees()) rmSync(resolve(sortie, f), { force: true });
    },
  };
}
