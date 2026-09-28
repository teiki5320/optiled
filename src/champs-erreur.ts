/**
 * Relie chaque message d'erreur du calculateur aux champs du formulaire qu'il concerne,
 * pour afficher le message sous le champ fautif (en plus du récapitulatif des résultats).
 */
import { DIMENSION_MAX_M } from './calc.ts';

const DIMENSIONS = ['longueur', 'largeur', 'longueur-rang', 'largeur-rang'];

/** Règles dans l'ordre : la première qui reconnaît le message l'emporte. */
const REGLES: [RegExp, string[]][] = [
  [/longueur des barres/i, ['longueur-barre']],
  [/^Les dimensions/, DIMENSIONS],
  [/^La longueur/, ['longueur', 'longueur-rang']],
  [/^La largeur/, ['largeur', 'largeur-rang']],
  [/rangs/, ['nb-rangs']],
  [/photopériode/, ['photoperiode']],
  [/efficacité/i, ['efficacite']],
  [/coefficient/, ['coef']],
  [/puissance des barres/, ['puissance-barre']],
  [/prix du kWh/, ['prix-kwh']],
  [/jours d'éclairage/, ['jours']],
  [/espacement/, ['espacement']],
];

/**
 * Identifiants des champs concernés par un message. Pour les dimensions trop grandes,
 * seuls les champs qui dépassent réellement la borne sont retenus.
 */
export function champsConcernes(message: string, valeur: (id: string) => number | undefined): string[] {
  const regle = REGLES.find(([motif]) => motif.test(message));
  if (!regle) return [];
  if (regle[1] === DIMENSIONS) return DIMENSIONS.filter((id) => (valeur(id) ?? 0) > DIMENSION_MAX_M);
  return regle[1];
}

/** Messages groupés par champ (un champ peut en recevoir plusieurs). */
export function erreursParChamp(messages: string[], valeur: (id: string) => number | undefined): Map<string, string[]> {
  const parChamp = new Map<string, string[]>();
  for (const m of messages) {
    for (const id of champsConcernes(m, valeur)) parChamp.set(id, [...(parChamp.get(id) ?? []), m]);
  }
  return parChamp;
}
