/**
 * Codes de suivi Amazon Partenaires, par emplacement : LA table unique du site.
 * Chaque lien Amazon dit d'où il vient (calculateur, Top 10, fiche culture, guide, conseil)
 * et reçoit le code de cet emplacement. Pour l'instant, tous les emplacements utilisent le
 * code actuel du site : rien ne change en ligne tant que Jean n'a pas créé les nouveaux codes.
 */

/** Code actuel du site (compte toakeur-21, code du site kultiledfr-21). */
export const TAG_AMAZON = 'kultiledfr-21';

export type Emplacement = 'calculateur' | 'top' | 'fiche' | 'guide' | 'conseil';

export const CODES_SUIVI: Record<Emplacement, string> = {
  /** Calculateur de l'accueil (lampes proposées) */
  calculateur: TAG_AMAZON,
  /** Pages Top 10 */
  top: TAG_AMAZON,
  /** Fiches cultures (legume-<id>.html) */
  fiche: TAG_AMAZON,
  /** Guides d'achat : lampes.html, meilleures-lampes.html */
  guide: TAG_AMAZON,
  /** Encadré « Le matériel pour ça » des conseils */
  conseil: TAG_AMAZON,
};

/** Code de suivi d'un emplacement. */
export function codeSuivi(emplacement: Emplacement): string {
  return CODES_SUIVI[emplacement];
}
