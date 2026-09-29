/**
 * Budgets de départ types (marqueurs <!--#budget:etagere--> et <!--#budget:tente-->) et tableau des
 * fourchettes par gamme de lampes (<!--#budget-gammes-->), générés depuis src/data/budget.json et
 * legumes.json : aucun montant écrit à la main dans les pages. Jamais de prix par produit ni de lien d'achat.
 */
import { calculer, longueurBarreConseillee } from '../src/calc.ts';
import {
  BUDGET,
  gammePourPuissance,
  mentionReleve,
  multiplier,
  sommeFourchettes,
  texteFourchette,
  type Accessoire,
  type Fourchette,
  type GammeLampe,
} from '../src/budget.ts';
import type { Legume, Stade } from '../src/data.ts';
import { chargerLegumes } from './fiches.ts';
import { COEF_UTILISATION, EFFICACITE, PRIX_KWH } from './guides-achat.ts';

export interface ScenarioBudget {
  id: string;
  titre: string;
  legume: string;
  stade: Stade;
  longueurM: number;
  largeurM: number;
  accessoires: Accessoire[];
  /** Ce qui n'est pas compté (déjà chez soi, ou trop variable). */
  horsBudget: string;
}

export const SCENARIOS: ScenarioBudget[] = [
  {
    id: 'etagere',
    titre: 'Étagère de salades, 60 × 30 cm',
    legume: 'laitue',
    stade: 'croissance',
    longueurM: 0.6,
    largeurM: 0.3,
    accessoires: ['minuterie', 'thermo-hygrometre', 'ventilateur-pince'],
    horsBudget: "l'étagère, les pots, le terreau et les graines",
  },
  {
    id: 'tente',
    titre: 'Tente de 80 × 80 cm pour des tomates',
    legume: 'tomate',
    stade: 'floraison',
    longueurM: 0.8,
    largeurM: 0.8,
    accessoires: ['tente-80', 'extracteur-100', 'ventilateur-pince', 'minuterie', 'thermo-hygrometre', 'ph-metre'],
    horsBudget: 'les pots, le substrat, les engrais et les graines',
  },
];

const nb = (n: number, decimales = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).replace(/ /g, ' ');

export interface Budget {
  scenario: ScenarioBudget;
  legume: Legume;
  puissanceW: number;
  photoperiodeH: number;
  gamme: GammeLampe;
  nombreLampes: number;
  lampe: Fourchette;
  postes: { libelle: string; fourchette: Fourchette }[];
  materiel: Fourchette;
  electriciteMoisEur: number;
  electriciteAnEur: number;
}

/** Calcule un budget de départ : lampe de la gamme qui correspond à la puissance calculée, accessoires, électricité. */
export function calculerBudget(scenario: ScenarioBudget, legumes: Legume[] = chargerLegumes()): Budget {
  const legume = legumes.find((l) => l.id === scenario.legume);
  const stade = legume?.stades[scenario.stade];
  if (!legume || !stade) throw new Error(`Budget ${scenario.id} : culture ou stade inconnu`);
  const r = calculer({
    ppfd: stade.ppfd.valeur,
    photoperiodeH: stade.photoperiode.valeur,
    surface: { mode: 'rectangle', longueurM: scenario.longueurM, largeurM: scenario.largeurM },
    efficaciteUmolJ: EFFICACITE,
    coefUtilisation: COEF_UTILISATION,
    hauteurCm: stade.hauteur_cm.valeur,
    longueurBarreM: longueurBarreConseillee(scenario.longueurM),
    prixKwh: PRIX_KWH,
    joursParAn: 365,
  });
  const { gamme, nombre } = gammePourPuissance(r.puissanceW);
  const lampe = multiplier(BUDGET.lampes[gamme].fourchette, nombre);
  const postes = [
    { libelle: `${nombre > 1 ? `${nombre} × ` : ''}${BUDGET.lampes[gamme].libelle}, pour environ ${nb(Math.round(r.puissanceW))} W`, fourchette: lampe },
    ...scenario.accessoires.map((a) => BUDGET.accessoires[a]),
  ];
  const coutAn = r.coutAnEur ?? 0;
  return {
    scenario,
    legume,
    puissanceW: r.puissanceW,
    photoperiodeH: stade.photoperiode.valeur,
    gamme,
    nombreLampes: nombre,
    lampe,
    postes,
    materiel: sommeFourchettes(postes.map((p) => p.fourchette)),
    electriciteMoisEur: coutAn / 12,
    electriciteAnEur: coutAn,
  };
}

/** Montant d'électricité lisible : à l'euro près, sauf sous 10 € (au demi-euro, et « moins de 1 € »). */
export function texteEuros(v: number): string {
  if (v < 1) return 'moins de 1 €';
  if (v < 10) return `${nb(Math.round(v * 2) / 2, Number.isInteger(Math.round(v * 2) / 2) ? 0 : 1)} €`;
  return `${nb(Math.round(v))} €`;
}

/** Tableau du budget de départ d'un scénario (marqueur <!--#budget:id-->). */
export function rendreBudget(id: string, legumes?: Legume[]): string {
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (!scenario) throw new Error(`Budget inconnu : ${id}`);
  const b = calculerBudget(scenario, legumes);
  const lignes = b.postes.map((p) => `<tr><td>${p.libelle}</td><td>${texteFourchette(p.fourchette)}</td></tr>`);
  return `<div class="tableau-defile">
          <table class="tableau tableau--budget">
            <caption>${scenario.titre}</caption>
            <thead><tr><th>Poste</th><th>Fourchette de prix</th></tr></thead>
            <tbody>
              ${lignes.join('\n              ')}
              <tr class="total"><th scope="row">Matériel, total</th><td><strong>${texteFourchette(b.materiel)}</strong></td></tr>
              <tr class="total"><th scope="row">Électricité de l'éclairage (${nb(b.photoperiodeH)} h par jour, ${nb(PRIX_KWH, 2)} € le kWh)</th><td><strong>≈ ${texteEuros(b.electriciteMoisEur)} par mois</strong> (${texteEuros(b.electriciteAnEur)} par an)</td></tr>
            </tbody>
          </table>
        </div>
        <p class="aide">Sans compter ${b.scenario.horsBudget}. ${mentionReleve()}</p>`;
}

/** Fourchettes de toutes les gammes de lampes (page « Meilleures lampes »), sans lien d'achat. */
export function rendreFourchettesGammes(): string {
  const lignes = (Object.keys(BUDGET.lampes) as GammeLampe[]).map((g) => `<tr><td>${BUDGET.lampes[g].libelle}</td><td>${texteFourchette(BUDGET.lampes[g].fourchette)}</td></tr>`);
  return `<div class="tableau-defile">
          <table class="tableau tableau--budget">
            <thead><tr><th>Gamme</th><th>Fourchette de prix</th></tr></thead>
            <tbody>
              ${lignes.join('\n              ')}
            </tbody>
          </table>
        </div>
        <p class="aide">${mentionReleve()} Ces fourchettes couvrent toute une gamme, pas un modèle précis : le prix du jour est sur la page du produit.</p>`;
}
