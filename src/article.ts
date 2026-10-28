/**
 * Articles complets des actus (veille, depuis le 28 octobre 2026) : une actu touchée ouvre son
 * article sur le site. Chaque article est un fichier de la veille :
 *   https://teiki5320.github.io/veille/articles/kultiled/<id>.json
 * Schéma : https://teiki5320.github.io/veille/schema/article-schema-v1.json
 *
 * Ce module ne contient que des fonctions pures (partagées par le build, build/articles.ts, et par
 * la page de secours, src/article-secours.ts) : vérification d'un fichier article et petits formats.
 */
import { imageValide, lienSourceSur, MOTIF_ID, MOTIF_SLUG, SUJET_EXCLU, type ImageActu } from './veille.ts';

export const BASE_VEILLE = 'https://teiki5320.github.io/veille/';
export const SITE_VEILLE = 'kultiled';

/** Chemin d'un article dans la veille. */
export const cheminArticle = (id: string) => `articles/${SITE_VEILLE}/${id}.json`;

export interface BlocArticle {
  intertitre?: string | null;
  paragraphes: string[];
}

/** Un article (schéma v1). */
export interface ArticleVeille {
  version: 1;
  site: string;
  id: string;
  slug: string;
  titre: string;
  chapo: string;
  blocs: BlocArticle[];
  mots: number;
  lecture_min: number;
  theme?: string;
  pays?: string[];
  competition?: string | null;
  tags?: string[];
  source_nom: string;
  source_url: string;
  autres_sources?: string[];
  publie_le: string;
  redige_le: string;
  image: ImageActu;
}

const texte = (x: unknown, min = 1): x is string => typeof x === 'string' && x.trim().length >= min;

/**
 * Garde seulement un article complet et sûr : bon identifiant, texte présent, source http(s)
 * non Amazon, image servie par la veille, jamais de sujet exclu (SUJET_EXCLU). `id` : l'identifiant attendu.
 */
export function articleValide(a: unknown, id?: string): a is ArticleVeille {
  if (!a || typeof a !== 'object') return false;
  const x = a as Partial<ArticleVeille>;
  if (x.version !== 1 || typeof x.id !== 'string' || !MOTIF_ID.test(x.id) || (id !== undefined && x.id !== id)) return false;
  if (typeof x.slug !== 'string' || !MOTIF_SLUG.test(x.slug) || x.slug.length > 80) return false;
  if (!texte(x.titre, 5) || !texte(x.chapo, 20) || !texte(x.source_nom)) return false;
  if (!lienSourceSur(x.source_url) || !texte(x.publie_le) || Number.isNaN(Date.parse(x.publie_le))) return false;
  if (!Array.isArray(x.blocs) || x.blocs.length === 0) return false;
  for (const b of x.blocs) {
    if (!b || typeof b !== 'object' || !Array.isArray(b.paragraphes) || b.paragraphes.length === 0) return false;
    if (b.intertitre != null && typeof b.intertitre !== 'string') return false;
    if (!b.paragraphes.every((p) => texte(p))) return false;
  }
  if (x.tags !== undefined && (!Array.isArray(x.tags) || !x.tags.every((t) => typeof t === 'string'))) return false;
  const tout = [...x.tags ?? [], x.titre, x.chapo, ...x.blocs.flatMap((b) => [b.intertitre ?? '', ...b.paragraphes])].join(' ');
  if (SUJET_EXCLU.test(tout)) return false;
  return imageValide(x.image);
}

/** Autres sources sûres (http(s), jamais Amazon), sans doublon de la source principale. */
export function autresSources(a: ArticleVeille): string[] {
  return [...new Set((a.autres_sources ?? []).filter((u) => lienSourceSur(u) && u !== a.source_url))];
}

/** Nom court d'une autre source : son domaine, sans « www. ». */
export function nomDomaine(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}

/** Durée de lecture (au moins 1 min). */
export function minutesLecture(a: Pick<ArticleVeille, 'lecture_min' | 'mots'>): number {
  const n = Number(a.lecture_min);
  if (Number.isFinite(n) && n >= 1) return Math.round(n);
  return Math.max(1, Math.round((Number(a.mots) || 0) / 200));
}

/** « 27 octobre 2026 », heure de Paris. */
export function dateArticle(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
}

/** Identifiant demandé à la page de secours (?id=<40 caractères hexadécimaux>), ou null. */
export function idDepuisRecherche(recherche: string): string | null {
  const id = new URLSearchParams(recherche).get('id')?.trim().toLowerCase() ?? '';
  return MOTIF_ID.test(id) ? id : null;
}

/** Fiche du site reliée à un tag de l'article (« legume:tomate » → page et nom). */
export interface FicheLiee {
  href: string;
  nom: string;
}

/** Fiches existantes du site citées par l'article (les autres tags sont ignorés). */
export function fichesLiees(tags: string[] | undefined, fiches: Record<string, FicheLiee>): FicheLiee[] {
  const vues = new Set<string>();
  return (tags ?? []).flatMap((t) => {
    const f = Object.hasOwn(fiches, t) ? fiches[t] : undefined;
    if (!f || vues.has(f.href)) return [];
    vues.add(f.href);
    return [f];
  });
}
