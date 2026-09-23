import brut from './data/legumes.json';

/** Une valeur accompagnée de sa source bibliographique. */
export interface ValeurSourcee<T> {
  valeur: T;
  source: string;
}

export interface ParametresStade {
  /** µmol/m²/s */
  ppfd: ValeurSourcee<number>;
  /** heures / jour */
  photoperiode: ValeurSourcee<number>;
  /** [min, max] en cm au-dessus de la canopée */
  hauteur_cm: ValeurSourcee<[number, number]>;
  spectre: ValeurSourcee<string>;
}

export type Stade = 'croissance' | 'floraison';

type Plage = [number, number];

/** Conditions de culture générales (affichées dans les fiches légumes). */
export interface ParametresCulture {
  /** °C, le jour */
  temperature_c: ValeurSourcee<Plage>;
  /** °C, la nuit (lampes éteintes) */
  temperature_nuit_c: ValeurSourcee<Plage>;
  /** texte court : températures à éviter et leur effet (ex. « > 24 °C (montaison) ») */
  temperature_a_eviter: ValeurSourcee<string>;
  /** humidité relative, % */
  humidite_pct: ValeurSourcee<Plage>;
  ph: ValeurSourcee<Plage>;
  /** conductivité de la solution nutritive, mS/cm */
  ec_ms_cm: ValeurSourcee<Plage>;
  /**
   * Délai indicatif jusqu'à la première récolte, en jours, compté depuis le semis
   * sauf mention contraire dans la source (fraise : depuis la plantation du plant ;
   * chanvre : du semis à la récolte des fleurs).
   */
  jours_recolte: ValeurSourcee<Plage>;
  /** cm entre plants ; null pour un semis à la volée */
  espacement_cm: ValeurSourcee<Plage | null>;
  conseils: ValeurSourcee<string>;
}

export interface Legume {
  id: string;
  nom: string;
  famille: string;
  /** Mise en garde affichée dans le calculateur et la fiche (réglementation…) ; texte simple, qui cite lui-même sa source */
  avertissement?: string;
  stades: {
    croissance: ParametresStade;
    floraison: ParametresStade | null;
  };
  culture: ParametresCulture;
}

export const LEGUMES: Legume[] = (brut as unknown as { legumes: Legume[] }).legumes;

export function trouverLegume(id: string): Legume | undefined {
  return LEGUMES.find((l) => l.id === id);
}

/** Paramètres du stade demandé (null si le légume n'a pas ce stade). */
export function parametresStade(legume: Legume, stade: Stade): ParametresStade | null {
  return legume.stades[stade];
}

/** Regroupe les légumes par famille, dans l'ordre d'apparition du JSON. */
export function legumesParFamille(legumes: Legume[] = LEGUMES): Map<string, Legume[]> {
  const groupes = new Map<string, Legume[]>();
  for (const l of legumes) {
    const liste = groupes.get(l.famille) ?? [];
    liste.push(l);
    groupes.set(l.famille, liste);
  }
  return groupes;
}
