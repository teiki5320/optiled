/**
 * État du formulaire du calculateur ⇄ paramètres d'adresse (partage d'un calcul par lien)
 * et mémorisation locale. Module pur : aucun accès au DOM.
 */

/** Identifiant du champ dans la page → nom court du paramètre dans l'adresse. */
export const PARAMETRES: Record<string, string> = {
  legume: 'l',
  stade: 's',
  mode: 'm',
  longueur: 'L',
  largeur: 'W',
  'nb-rangs': 'n',
  'longueur-rang': 'lr',
  'largeur-rang': 'wr',
  espacement: 'e',
  photoperiode: 'h',
  'prix-kwh': 'prix',
  jours: 'j',
  'longueur-barre': 'lb',
  'puissance-barre': 'pb',
  efficacite: 'eff',
  coef: 'cu',
  'lampe-ppf': 'ppf',
  'lampe-w': 'pw',
};

export type Etat = Record<string, string>;

const CHOIX: Record<string, RegExp> = {
  legume: /^[a-z0-9-]{1,40}$/,
  stade: /^(croissance|floraison)$/,
  mode: /^(rectangle|rangs)$/,
};
/** Nombre saisi à la française ou non (chiffres, une virgule ou un point). */
const NOMBRE = /^\d{1,6}([.,]\d{1,4})?$/;

function valide(champ: string, valeur: string): boolean {
  return (CHOIX[champ] ?? NOMBRE).test(valeur);
}

/** Construit la chaîne de paramètres (sans « ? ») ; ignore les valeurs vides ou invalides. */
export function versParams(etat: Etat): string {
  const p = new URLSearchParams();
  for (const [champ, court] of Object.entries(PARAMETRES)) {
    const v = etat[champ]?.trim();
    if (v && valide(champ, v)) p.set(court, v);
  }
  return p.toString();
}

/** Lit l'état depuis une chaîne de paramètres ; accepte aussi l'ancien « ?legume=tomate ». */
export function depuisParams(recherche: string): Etat {
  const p = new URLSearchParams(recherche);
  const etat: Etat = {};
  for (const [champ, court] of Object.entries(PARAMETRES)) {
    const v = p.get(court) ?? p.get(champ);
    if (v !== null && valide(champ, v.trim())) etat[champ] = v.trim();
  }
  return etat;
}
