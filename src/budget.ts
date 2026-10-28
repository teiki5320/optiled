/**
 * Budget indicatif : niveau de budget (petit, moyen, gros) par gamme de lampes et par accessoire
 * (src/data/budget.json). Module pur, partagé entre le build (budgets de départ, page « Meilleures
 * lampes ») et le calculateur. Jamais de montant en euros pour le matériel (règles Amazon Partenaires).
 */
import brut from './data/budget.json' with { type: 'json' };

export type Niveau = 'petit' | 'moyen' | 'gros';

export interface PosteBudget {
  libelle: string;
  niveau: Niveau;
}

export type GammeLampe = 'barres' | 'appoint' | 'petits' | 'moyens' | 'grands';
export type Accessoire = 'minuterie' | 'thermo-hygrometre' | 'tente-80' | 'extracteur-100' | 'ventilateur-pince' | 'ph-metre';

export interface DonneesBudget {
  lampes: Record<GammeLampe, PosteBudget>;
  accessoires: Record<Accessoire, PosteBudget>;
}

export const BUDGET: DonneesBudget = brut as unknown as DonneesBudget;

export const NIVEAUX: Niveau[] = ['petit', 'moyen', 'gros'];

/** « Petit budget », « Budget moyen », « Gros budget ». */
export function texteNiveau(n: Niveau): string {
  return n === 'petit' ? 'Petit budget' : n === 'moyen' ? 'Budget moyen' : 'Gros budget';
}

/** Niveau d'un poste de lampes : plusieurs lampes identiques montent d'un niveau. */
export function niveauLampes(n: Niveau, nombre: number): Niveau {
  return nombre > 1 ? NIVEAUX[Math.min(NIVEAUX.indexOf(n) + 1, 2)] : n;
}

/** Niveau d'une installation complète : celui du poste le plus coûteux. */
export function niveauTotal(niveaux: Niveau[]): Niveau {
  return NIVEAUX[Math.max(0, ...niveaux.map((n) => NIVEAUX.indexOf(n)))];
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

/** « septembre 2026 ». */
export function moisAnnee(iso: string): string {
  const [a, m] = iso.split('-').map(Number);
  return `${MOIS[m - 1]} ${a}`;
}

/** Phrase de méthode, affichée sous chaque budget. */
export function mentionNiveaux(): string {
  return 'Niveaux de budget indicatifs, comparés entre les postes d’une installation : le prix du jour est sur la page de chaque produit.';
}
