/**
 * Tableaux calculés des guides d'achat (led-puissance, led-comparer, led-semis), à partir des
 * données du site (legumes.json, lampes.json) et du module de calcul : aucun chiffre saisi à la main.
 */
import { calculer, calculerDli, longueurBarreConseillee, type ResultatCalcul } from '../src/calc.ts';
import type { Legume } from '../src/data.ts';
import { LAMPES, type Lampe } from '../src/lampes.ts';
import { chargerLegumes, echapper } from './fiches.ts';
import { fichierLegume } from './pages-legumes.ts';

/** Réglages par défaut du calculateur. */
export const EFFICACITE = 2.7;
export const COEF_UTILISATION = 0.8;
export const PRIX_KWH = 0.2;
const HEURES = 16;

const nb = (n: number, decimales = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).replace(/ /g, ' ');
const cm = (m: number) => nb(Math.round(m * 100));

/** Puissance réelle (W) pour un PPFD donné sur une surface, avec les réglages par défaut. */
export function puissance(ppfd: number, surfaceM2: number, efficacite = EFFICACITE): number {
  return (ppfd * surfaceM2) / COEF_UTILISATION / efficacite;
}

function tableau(entetes: string[], lignes: string[][]): string {
  return `<div class="tableau-defile">
          <table class="tableau">
            <thead><tr>${entetes.map((e) => `<th>${e}</th>`).join('')}</tr></thead>
            <tbody>
              ${lignes.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n              ')}
            </tbody>
          </table>
        </div>`;
}

/** Surfaces courantes : étagères et tentes du commerce. */
export const SURFACES: { nom: string; longueurM: number; largeurM: number }[] = [
  { nom: 'Étagère', longueurM: 0.6, largeurM: 0.3 },
  { nom: 'Étagère', longueurM: 1.2, largeurM: 0.4 },
  { nom: 'Tente', longueurM: 0.6, largeurM: 0.6 },
  { nom: 'Tente', longueurM: 0.8, largeurM: 0.8 },
  { nom: 'Tente', longueurM: 1, largeurM: 1 },
  { nom: 'Tente', longueurM: 1.2, largeurM: 1.2 },
];

/** Niveaux de lumière repris des fiches : semis, salades, aromatiques et croissance des légumes fruits, fructification. */
export const NIVEAUX: { ppfd: number; libelle: string }[] = [
  { ppfd: 150, libelle: 'Semis (150)' },
  { ppfd: 250, libelle: 'Salades (250)' },
  { ppfd: 350, libelle: 'Aromatiques (350)' },
  { ppfd: 500, libelle: 'Fructification (500)' },
];

/** Puissance réelle à prévoir pour chaque surface courante et chaque niveau de lumière. */
export function rendrePuissancesSurfaces(): string {
  return tableau(
    ['Surface', ...NIVEAUX.map((n) => n.libelle)],
    SURFACES.map((s) => [
      `${s.nom} ${cm(s.longueurM)} × ${cm(s.largeurM)} cm (${nb(s.longueurM * s.largeurM, 2)} m²)`,
      ...NIVEAUX.map((n) => `${nb(Math.round(puissance(n.ppfd, s.longueurM * s.largeurM)))} W`),
    ]),
  );
}

/** Stade le plus exigeant d'une culture. */
function ppfdMax(l: Legume): number {
  return Math.max(l.stades.croissance.ppfd.valeur, l.stades.floraison?.ppfd.valeur ?? 0);
}

/** Besoin de chaque culture (stade le plus exigeant) : PPF et puissance par m², puissance pour une tente de 60 × 60 cm. */
export function rendrePuissancesCultures(legumes: Legume[] = chargerLegumes()): string {
  const tries = [...legumes].sort((a, b) => ppfdMax(a) - ppfdMax(b) || a.nom.localeCompare(b.nom, 'fr'));
  return tableau(
    ['Culture', 'PPFD visé (µmol/m²/s)', 'Lumière à émettre par m² (PPF)', 'Puissance réelle par m²', 'Tente 60 × 60 cm'],
    tries.map((l) => {
      const p = ppfdMax(l);
      return [
        `<a href="${fichierLegume(l.id)}">${echapper(l.nom)}</a>${l.stades.floraison ? ' <small>(floraison)</small>' : ''}`,
        nb(p),
        `${nb(Math.round(p / COEF_UTILISATION))} µmol/s`,
        `${nb(Math.round(puissance(p, 1)))} W`,
        `${nb(Math.round(puissance(p, 0.36)))} W`,
      ];
    }),
  );
}

/** Même lumière, efficacités différentes : puissance, consommation et coût annuel pour 1 m² à 500 µmol/m²/s. */
export function rendreEffetEfficacite(): string {
  const ppfd = 500;
  return tableau(
    ['Efficacité de la lampe', 'Puissance réelle', 'Consommation (16 h par jour)', 'Coût annuel'],
    [1.8, 2.2, 2.7, 3].map((e) => {
      const w = puissance(ppfd, 1, e);
      const kwh = (w * HEURES * 365) / 1000;
      return [`${nb(e, 1)} µmol/J`, `${nb(Math.round(w))} W`, `${nb(Math.round(kwh))} kWh par an`, `${nb(Math.round(kwh * PRIX_KWH))} €`];
    }),
  );
}

/** PPFD moyen qu'une lampe apporte sur sa surface de couverture (croissance). */
export function ppfdMoyen(l: Lampe): number | null {
  if (l.ppf === null || l.couverture_m2 === null) return null;
  return (l.ppf * COEF_UTILISATION) / l.couverture_m2.croissance;
}

/** Comparatif des lampes de la sélection qui publient un PPF : efficacité, surface, PPFD moyen, consommation. */
export function rendreComparaisonLampes(): string {
  const lampes = LAMPES.filter((l) => l.ppf !== null && l.couverture_m2 !== null).sort((a, b) => a.puissance_w - b.puissance_w || (b.ppf ?? 0) - (a.ppf ?? 0));
  return tableau(
    ['Lampe', 'Puissance réelle', 'PPF', 'Efficacité', 'Surface en croissance', 'PPFD moyen sur cette surface', 'Consommation (16 h par jour)'],
    lampes.map((l) => {
      const kwh = (l.puissance_w * HEURES * 365) / 1000;
      return [
        echapper(l.nom),
        `${nb(l.puissance_w)} W`,
        `${nb(l.ppf!)} µmol/s${l.ppf_estime ? ' <small>(estimé)</small>' : ''}`,
        `${nb(l.ppf! / l.puissance_w, 2)} µmol/J`,
        `${nb(l.couverture_m2!.croissance, 2)} m²`,
        `${nb(Math.round(ppfdMoyen(l)!))} µmol/m²/s`,
        `${nb(Math.round(kwh))} kWh par an`,
      ];
    }),
  );
}

/** Étagères de semis : réglettes nécessaires à 150 µmol/m²/s, hauteur 10 à 30 cm. */
export const ETAGERES: { longueurM: number; largeurM: number }[] = [
  { longueurM: 0.6, largeurM: 0.3 },
  { longueurM: 0.9, largeurM: 0.4 },
  { longueurM: 1.2, largeurM: 0.4 },
  { longueurM: 1.2, largeurM: 0.6 },
];

export function calculEtagere(longueurM: number, largeurM: number, ppfd = 150): ResultatCalcul {
  return calculer({
    ppfd,
    photoperiodeH: HEURES,
    surface: { mode: 'rectangle', longueurM, largeurM },
    efficaciteUmolJ: EFFICACITE,
    coefUtilisation: COEF_UTILISATION,
    hauteurCm: [10, 30],
    longueurBarreM: longueurBarreConseillee(longueurM),
    prixKwh: PRIX_KWH,
    joursParAn: 365,
  });
}

export function rendreEtageresSemis(): string {
  return tableau(
    ['Étage de', 'Puissance réelle', 'Réglettes', 'Consommation', 'Coût annuel'],
    ETAGERES.map(({ longueurM, largeurM }) => {
      const r = calculEtagere(longueurM, largeurM);
      const b = r.barres;
      return [
        `${cm(longueurM)} × ${cm(largeurM)} cm`,
        `${nb(Math.round(r.puissanceW))} W`,
        `${b.total} réglette${b.total > 1 ? 's' : ''} de ${cm(longueurBarreConseillee(longueurM))} cm, d’au moins ${nb(Math.ceil(b.puissanceParBarreNecessaireW))} W chacune`,
        `${nb(Math.round(r.consoAnKwh))} kWh par an`,
        `${nb(Math.round(r.coutAnEur ?? 0))} €`,
      ];
    }),
  );
}

/** DLI de semis pour quelques PPFD et durées (aide au réglage). */
export function rendreDliSemis(): string {
  return tableau(
    ['PPFD', '12 h', '14 h', '16 h'],
    [100, 150, 200].map((p) => [`${p} µmol/m²/s`, ...[12, 14, 16].map((h) => `${nb(calculerDli(p, h), 1)} mol/m²/j`)]),
  );
}
