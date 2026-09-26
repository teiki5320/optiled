/**
 * Rubrique « Conseils » : un article par question, publié à sa date.
 *
 * Chaque article est un fragment HTML dans contenu/conseils/<slug>.html, qui commence par
 * un commentaire d'en-tête :
 *
 *   <!--
 *   titre: Combien d'heures de lumière par jour pour des plantes d'intérieur ?
 *   description: Phrase de 70 à 170 caractères pour les moteurs de recherche.
 *   publie_le: 2026-09-25
 *   theme: lumiere
 *   -->
 *   <p class="chapo">Réponse courte…</p>
 *   <h2 id="…">…</h2> …
 *
 * Seuls les articles dont la date est passée sont construits (page conseil-<slug>.html,
 * liste, sitemap). La date de référence est celle du jour à Paris, ou DATE_PUBLICATION
 * (AAAA-MM-JJ) pour prévisualiser. Une reconstruction hebdomadaire (GitHub Actions) publie
 * les articles programmés.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { echapper } from './fiches.ts';
import { icone, type NomIcone } from './icones.ts';

export const PREFIXE_PAGE_CONSEIL = 'conseil-';
export const DOSSIER_CONSEILS = resolve(import.meta.dirname, '../contenu/conseils');

export type Theme = 'lumiere' | 'cultures' | 'eau' | 'installation';

export const THEMES: Record<Theme, string> = {
  lumiere: 'Lumière et LED',
  cultures: 'Cultures',
  eau: 'Eau, hydroponie et nutriments',
  installation: 'Installation, climat et problèmes',
};

export interface Conseil {
  slug: string;
  fichier: string;
  titre: string;
  description: string;
  publieLe: string;
  theme: Theme;
  corps: string;
}

/** Date du jour à Paris (AAAA-MM-JJ), ou DATE_PUBLICATION si elle est définie. */
export function dateDuJour(): string {
  return process.env.DATE_PUBLICATION ?? new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

export function fichierConseil(slug: string): string {
  return `${PREFIXE_PAGE_CONSEIL}${slug}.html`;
}

/** Lit un fichier d'article et son en-tête. Lève une erreur explicite si l'en-tête est incomplet. */
export function lireConseil(slug: string, source: string): Conseil {
  const entete = source.match(/^\s*<!--([\s\S]*?)-->/);
  if (!entete) throw new Error(`Conseil ${slug} : en-tête manquant`);
  const champs: Record<string, string> = {};
  for (const ligne of entete[1].split('\n')) {
    const m = ligne.match(/^\s*([a-z_]+)\s*:\s*(.+?)\s*$/);
    if (m) champs[m[1]] = m[2];
  }
  for (const champ of ['titre', 'description', 'publie_le', 'theme']) {
    if (!champs[champ]) throw new Error(`Conseil ${slug} : champ « ${champ} » manquant`);
  }
  if (!(champs.theme in THEMES)) throw new Error(`Conseil ${slug} : thème inconnu « ${champs.theme} »`);
  return {
    slug,
    fichier: fichierConseil(slug),
    titre: champs.titre,
    description: champs.description,
    publieLe: champs.publie_le,
    theme: champs.theme as Theme,
    corps: source.slice(entete[0].length).trim(),
  };
}

/** Tous les articles, publiés ou programmés, du plus récent au plus ancien. */
export function tousLesConseils(dossier = DOSSIER_CONSEILS): Conseil[] {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((f) => f.endsWith('.html'))
    .map((f) => lireConseil(f.replace(/\.html$/, ''), readFileSync(resolve(dossier, f), 'utf8')))
    .sort((a, b) => b.publieLe.localeCompare(a.publieLe) || a.titre.localeCompare(b.titre, 'fr'));
}

/** Articles publiés à la date de référence. */
export function conseilsPublies(date = dateDuJour(), tous = tousLesConseils()): Conseil[] {
  return tous.filter((c) => c.publieLe <= date);
}

export function dateLongue(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Page complète (avec marqueurs) d'un article. `publies` sert aux suggestions de lecture. */
export function sourcePageConseil(c: Conseil, publies: Conseil[]): string {
  const titres = [...c.corps.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
  const sommaire = titres.length
    ? `<nav class="sommaire" aria-label="Sommaire">
          <strong>Dans cet article</strong>
          <ol>${titres.map(([, id, t]) => `<li><a href="#${id}">${t.replace(/<[^>]+>/g, '')}</a></li>`).join('')}</ol>
        </nav>`
    : '';
  // Le chapô (réponse courte) reste en tête : il est repris dans le bandeau.
  const chapo = c.corps.match(/^<p class="chapo">[\s\S]*?<\/p>/)?.[0] ?? '';
  const suite = chapo ? c.corps.slice(chapo.length).trim() : c.corps;
  const voisins = publies.filter((v) => v.slug !== c.slug && v.theme === c.theme).slice(0, 3);
  const autres = voisins.length < 3 ? publies.filter((v) => v.slug !== c.slug && v.theme !== c.theme).slice(0, 3 - voisins.length) : [];
  const lire = [...voisins, ...autres];
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${echapper(c.description)}" />
    <meta name="date-publication" content="${c.publieLe}" />
    <title>${echapper(c.titre)} — OptiLED</title>
    <!--#head-->
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="page">
      <p class="fil"><a href="index.html">Accueil</a> › <a href="conseils.html">Conseils</a></p>
      <article class="prose">
        <h1>${echapper(c.titre)}</h1>
        ${chapo}
        ${sommaire}
        ${suite}
        <p class="aide">Publié le ${dateLongue(c.publieLe)} dans « ${THEMES[c.theme]} ». Valeurs indicatives tirées de la littérature horticole (voir les <a href="glossaire.html#sources">sources</a>).</p>
      </article>
      ${
        lire.length
          ? `<section class="voisines" aria-labelledby="a-lire">
        <h2 id="a-lire">À lire aussi</h2>
        <nav class="suite suite--familles">${lire.map((v) => `<a href="${v.fichier}"><small>${THEMES[v.theme]}</small>${echapper(v.titre)}</a>`).join('')}</nav>
      </section>`
          : ''
      }
    </main>
    <!--#footer-->
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

/** Pages des articles publiés : nom de fichier → contenu HTML (avec marqueurs). */
export function pagesConseils(date = dateDuJour()): Map<string, string> {
  const publies = conseilsPublies(date);
  return new Map(publies.map((c) => [c.fichier, sourcePageConseil(c, publies)]));
}

/** Icône de chaque thème sur les cartes. */
const ICONES_THEMES: Record<Theme, NomIcone> = { lumiere: 'ampoule', cultures: 'pousse', eau: 'goutte', installation: 'thermometre' };

/** Date courte d'une carte (« 21 sept. 2026 »). */
export function dateCourte(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Cartes des articles publiés, du plus récent au plus ancien (page conseils.html, marqueur <!--#conseils-->). */
export function rendreListeConseils(date = dateDuJour()): string {
  const publies = conseilsPublies(date);
  if (publies.length === 0) return '<p>Les premiers articles arrivent bientôt.</p>';
  return `<div class="cartes-guides cartes-conseils">${publies
    .map(
      (c) => `<a class="carte-guide carte-conseil--${c.theme}" href="${c.fichier}">
      <span class="carte-guide__icone">${icone(ICONES_THEMES[c.theme])}</span>
      <time class="carte-guide__date" datetime="${c.publieLe}">${dateCourte(c.publieLe)}</time>
      <strong>${echapper(c.titre)}</strong>
      <span>${echapper(c.description)}</span>
      <span class="carte-guide__lire">Lire l'article ${icone('fleche', 'icone icone--petite')}</span>
    </a>`,
    )
    .join('')}</div>`;
}
