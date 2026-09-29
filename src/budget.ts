/**
 * Budget indicatif : fourchettes de prix par gamme de lampes et par accessoire (src/data/budget.json).
 * Module pur, partagé entre le build (budgets de départ, page « Meilleures lampes ») et le calculateur.
 * Jamais de prix par produit : seulement des fourchettes par gamme, datées et arrondies.
 */
import brut from './data/budget.json' with { type: 'json' };

/** [minimum, maximum] en euros, ou null quand le relevé n'est pas encore fait. */
export type Fourchette = [number, number] | null;

export interface PosteBudget {
  libelle: string;
  fourchette: Fourchette;
}

export type GammeLampe = 'barres' | 'appoint' | 'petits' | 'moyens' | 'grands';
export type Accessoire = 'minuterie' | 'thermo-hygrometre' | 'tente-80' | 'extracteur-100' | 'ventilateur-pince' | 'ph-metre';

export interface DonneesBudget {
  releve_le: string;
  lampes: Record<GammeLampe, PosteBudget>;
  accessoires: Record<Accessoire, PosteBudget>;
}

export const BUDGET: DonneesBudget = brut as unknown as DonneesBudget;

export const PRIX_EN_COURS = 'prix en cours de relevé';

/** Pas d'arrondi : 5 € sous 50 €, 10 € à partir de 50 €. */
function pas(v: number): number {
  return v < 50 ? 5 : 10;
}

/** Borne basse d'une fourchette : arrondie vers le bas. */
export function arrondirBas(v: number): number {
  return Math.floor(v / pas(v)) * pas(v);
}

/** Borne haute d'une fourchette : arrondie vers le haut (49,44 → 50 ; 127,99 → 130). */
export function arrondirHaut(v: number): number {
  return Math.ceil(v / pas(v)) * pas(v);
}

/** Fourchette arrondie à partir de prix relevés (outil pour la mise à jour mensuelle). */
export function fourchetteDepuisPrix(prix: number[]): Fourchette {
  if (prix.length === 0) return null;
  return [arrondirBas(Math.min(...prix)), arrondirHaut(Math.max(...prix))];
}

/** Somme de postes ; null dès qu'un poste n'a pas encore de prix. */
export function sommeFourchettes(fourchettes: Fourchette[]): Fourchette {
  let min = 0;
  let max = 0;
  for (const f of fourchettes) {
    if (f === null) return null;
    min += f[0];
    max += f[1];
  }
  return [min, max];
}

/** Multiplie une fourchette (plusieurs lampes identiques). */
export function multiplier(f: Fourchette, n: number): Fourchette {
  return f === null ? null : [f[0] * n, f[1] * n];
}

const milliers = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** « 45 à 130 € », ou « prix en cours de relevé ». */
export function texteFourchette(f: Fourchette): string {
  return f === null ? PRIX_EN_COURS : `${milliers(f[0])} à ${milliers(f[1])} €`;
}

/** Puissance maximale d'un grand panneau courant : au-delà, on compte plusieurs lampes. */
export const PUISSANCE_MAX_UNE_LAMPE_W = 450;

/**
 * Gamme de lampe qui correspond à une puissance calculée (W réels) : réglettes pour une
 * étagère, puis panneaux petits, moyens ou grands ; au-delà d'un grand panneau, plusieurs lampes.
 */
export function gammePourPuissance(puissanceW: number): { gamme: GammeLampe; nombre: number } {
  if (puissanceW <= 50) return { gamme: 'barres', nombre: 1 };
  if (puissanceW <= 100) return { gamme: 'petits', nombre: 1 };
  if (puissanceW <= 200) return { gamme: 'moyens', nombre: 1 };
  return { gamme: 'grands', nombre: Math.max(1, Math.ceil(puissanceW / PUISSANCE_MAX_UNE_LAMPE_W - 1e-9)) };
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 29 septembre 2026 » (sans dépendre de la langue du navigateur). */
export function dateReleve(iso = BUDGET.releve_le): string {
  const [a, m, j] = iso.split('-').map(Number);
  return `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`;
}

/** « septembre 2026 ». */
export function moisAnnee(iso: string): string {
  const [a, m] = iso.split('-').map(Number);
  return `${MOIS[m - 1]} ${a}`;
}

/** Phrase de méthode, affichée sous chaque budget. */
export function mentionReleve(): string {
  return `Prix relevés sur Amazon.fr le ${dateReleve()}, à titre indicatif : fourchettes par gamme, arrondies, qui varient selon les marques et les périodes.`;
}
