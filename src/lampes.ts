/**
 * Lampes du commerce (Amazon.fr) : données et choix des modèles qui conviennent.
 * Module pur, partagé entre le build (page « Lampes ») et le calculateur.
 */
import brut from './data/lampes.json' with { type: 'json' };
import type { Stade } from './data.ts';

export interface Lampe {
  id: string;
  nom: string;
  marque: string;
  type: 'barre' | 'panneau' | 'appoint';
  asin: string;
  puissance_w: number;
  /** µmol/s ; null si le fabricant ne publie pas assez de chiffres */
  ppf: number | null;
  ppf_estime: boolean;
  couverture_m2: { croissance: number; floraison: number } | null;
  dimensions: string;
  variateur: boolean;
  note: number;
  avis: number;
  source_ppf: string;
}

export const LAMPES: Lampe[] = (brut as unknown as { lampes: Lampe[] }).lampes;
export const LAMPES_VERIFIEES_LE: string = (brut as unknown as { verifie_le: string }).verifie_le;

/** Identifiant Partenaires Amazon (un seul endroit à changer). */
export const TAG_AMAZON = 'optiled-21';
export const MENTION_AFFILIATION = 'En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises.';

export function lienAmazon(l: Lampe): string {
  return `https://www.amazon.fr/dp/${l.asin}?tag=${TAG_AMAZON}`;
}

export interface Proposition {
  lampe: Lampe;
  nombre: number;
  ppfTotal: number;
  puissanceW: number;
}

/** Au-delà, on propose plutôt un modèle plus puissant. */
const NOMBRE_MAX = 6;
/** Lumière fournie au plus 2,5 fois le besoin (sinon lampe surdimensionnée). */
const EXCES_MAX = 2.5;

/**
 * Les modèles qui conviennent : assez de lumière (PPF) pour le besoin, et assez de
 * surface couverte (au moins 80 % de la surface cultivée) pour une lumière homogène.
 * Classés du plus ajusté au moins ajusté, un peu pénalisés quand il faut plusieurs lampes.
 */
export function lampesConseillees(ppfNecessaire: number, surfaceM2: number, stade: Stade, max = 3): Proposition[] {
  if (!(ppfNecessaire > 0) || !(surfaceM2 > 0)) return [];
  const propositions: (Proposition & { score: number })[] = [];
  for (const lampe of LAMPES) {
    if (lampe.ppf === null || lampe.couverture_m2 === null) continue;
    const couverture = lampe.couverture_m2[stade];
    const nombre = Math.max(Math.ceil(ppfNecessaire / lampe.ppf - 1e-9), Math.ceil((surfaceM2 * 0.8) / couverture - 1e-9), 1);
    const ppfTotal = nombre * lampe.ppf;
    const exces = ppfTotal / ppfNecessaire;
    if (nombre > NOMBRE_MAX || exces > EXCES_MAX) continue;
    propositions.push({ lampe, nombre, ppfTotal, puissanceW: nombre * lampe.puissance_w, score: exces - 1 + 0.12 * (nombre - 1) });
  }
  return propositions
    .sort((a, b) => a.score - b.score)
    .slice(0, max)
    .map(({ score: _score, ...p }) => p);
}
