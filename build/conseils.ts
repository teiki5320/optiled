/**
 * Rubrique « Conseils » : un article par question, publié à sa date.
 *
 * Chaque article est un fragment HTML dans contenu/conseils/<slug>.html, qui commence par
 * un commentaire d'en-tête :
 *
 *   <!--
 *   titre: Combien d'heures de lumière par jour pour des plantes d'intérieur ?
 *   titre_court: Titre de l'onglet et des moteurs de recherche, si le titre dépasse 60 caractères (facultatif)
 *   description: Phrase de 70 à 160 caractères (idéalement 150 à 158) pour les moteurs de recherche.
 *   publie_le: 2026-09-25
 *   theme: lumiere
 *   photo: Texte alternatif de la photo (facultatif ; photo dans public/images/guides/conseil-<slug>-800.webp et -1600.webp)
 *   cultures: basilic, tomate (facultatif ; identifiants de src/data/legumes.json, séparés par des virgules)
 *   -->
 *   <p class="chapo">Réponse courte…</p>
 *   <h2 id="…">…</h2> …
 *
 * Le champ `cultures` relie l'article aux fiches : liens « Fiche : … » sous l'article, et section
 * « Questions fréquentes » de chaque fiche citée (build/pages-legumes.ts), dès la publication.
 *
 * Seuls les articles dont la date est passée sont construits (page conseil-<slug>.html,
 * liste, sitemap). La date de référence est celle du jour à Paris, ou DATE_PUBLICATION
 * (AAAA-MM-JJ) pour prévisualiser. Une reconstruction hebdomadaire (GitHub Actions) publie
 * les articles programmés.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chargerLegumes, echapper, pageDetaillee } from './fiches.ts';
import { icone, type NomIcone } from './icones.ts';
import { CARTES_PREMIERE_RANGEE, photoGuide } from './photos.ts';

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
  /** Titre de la balise <title> (sans « — OptiLED ») : titre_court s'il existe, sinon le titre. */
  titrePage: string;
  description: string;
  publieLe: string;
  theme: Theme;
  /** Texte alternatif de la photo, ou chaîne vide. */
  photo: string;
  /** Identifiants des cultures dont parle l'article (legumes.json), éventuellement vide. */
  cultures: string[];
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
    titrePage: champs.titre_court ?? champs.titre,
    description: champs.description,
    publieLe: champs.publie_le,
    theme: champs.theme as Theme,
    photo: champs.photo ?? '',
    cultures: (champs.cultures ?? '').split(',').map((id) => id.trim()).filter(Boolean),
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

/** Écart en jours entre deux dates AAAA-MM-JJ. */
function ecartJours(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;
}

/**
 * Suggestions « À lire aussi » : d'abord les articles du même thème, puis les autres, en prenant
 * à chaque fois les plus proches en date (avant comme après), pour ne pas renvoyer toujours
 * vers les derniers parus. À écart égal, le plus ancien passe devant.
 */
export function aLireAussi(c: Conseil, publies: Conseil[], nombre = 3): Conseil[] {
  const proches = (liste: Conseil[]) =>
    [...liste].sort((a, b) => ecartJours(a.publieLe, c.publieLe) - ecartJours(b.publieLe, c.publieLe) || a.publieLe.localeCompare(b.publieLe) || a.titre.localeCompare(b.titre, 'fr'));
  const autres = publies.filter((v) => v.slug !== c.slug);
  return [...proches(autres.filter((v) => v.theme === c.theme)), ...proches(autres.filter((v) => v.theme !== c.theme))].slice(0, nombre);
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
  const lire = aLireAussi(c, publies);
  const legumes = chargerLegumes();
  const fiches = c.cultures.flatMap((id) => legumes.filter((l) => l.id === id));
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${echapper(c.description)}" />
    <meta name="date-publication" content="${c.publieLe}" />
    <title>${echapper(c.titrePage)} — OptiLED</title>
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
        ${
          fiches.length
            ? `<nav class="fiches-liees" aria-label="Fiches des cultures citées">${fiches
                .map((l) => `<a class="bouton-lien" href="${pageDetaillee(l.id)}">Fiche : ${echapper(l.nom)}</a>`)
                .join(' ')}</nav>`
            : ''
        }
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

/** Articles publiés qui citent une culture (champ `cultures`), du plus ancien au plus récent. */
export function conseilsDeLaCulture(id: string, date = dateDuJour(), tous = tousLesConseils()): Conseil[] {
  return conseilsPublies(date, tous)
    .filter((c) => c.cultures.includes(id))
    .sort((a, b) => a.publieLe.localeCompare(b.publieLe) || a.titre.localeCompare(b.titre, 'fr'));
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
      (c, i) => `<a class="carte-guide carte-conseil--${c.theme}" href="${c.fichier}">
      <span class="carte-guide__photo">${c.photo ? photoGuide(c.fichier, '', '(min-width: 1100px) 360px, (min-width: 700px) 45vw, 92vw', i < CARTES_PREMIERE_RANGEE ? 'eager' : 'lazy', i === 0) : ''}</span>
      <span class="carte-guide__icone">${icone(ICONES_THEMES[c.theme])}</span>
      <time class="carte-guide__date" datetime="${c.publieLe}">${dateCourte(c.publieLe)}</time>
      <strong>${echapper(c.titre)}</strong>
      <span>${echapper(c.description)}</span>
      <span class="carte-guide__lire">Lire l'article ${icone('fleche', 'icone icone--petite')}</span>
    </a>`,
    )
    .join('')}</div>`;
}
