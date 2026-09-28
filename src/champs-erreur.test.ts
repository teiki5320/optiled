import { describe, expect, it } from 'vitest';
import { validerEntrees, type EntreesCalcul } from './calc.ts';
import { champsConcernes, erreursParChamp } from './champs-erreur.ts';

const aucun = () => undefined;

describe('messages d’erreur reliés aux champs', () => {
  it('longueur des barres : pas confondue avec la longueur de la culture', () => {
    expect(champsConcernes('La longueur des barres doit être un nombre strictement positif.', aucun)).toEqual(['longueur-barre']);
    expect(champsConcernes('La longueur doit être un nombre strictement positif.', aucun)).toEqual(['longueur', 'longueur-rang']);
  });

  it('dimensions trop grandes : seul le champ qui dépasse est signalé', () => {
    const valeurs: Record<string, number> = { longueur: 120, largeur: 0.6 };
    const ids = champsConcernes("Les dimensions ne peuvent pas dépasser 50 m : elles s'expriment en mètres (1,20 et non 120).", (id) => valeurs[id]);
    expect(ids).toEqual(['longueur']);
  });

  it('chaque message de validation trouve son champ', () => {
    const e: EntreesCalcul = {
      ppfd: 200,
      photoperiodeH: 30,
      surface: { mode: 'rangs', nbRangs: 0.5, longueurM: -1, largeurRangM: 0.4 },
      efficaciteUmolJ: 9,
      coefUtilisation: 2,
      hauteurCm: [20, 30],
      longueurBarreM: 0,
      puissanceBarreW: -3,
      prixKwh: -1,
      joursParAn: 400,
    };
    const messages = validerEntrees(e);
    const parChamp = erreursParChamp(messages, aucun);
    for (const id of ['photoperiode', 'nb-rangs', 'longueur-rang', 'efficacite', 'coef', 'longueur-barre', 'puissance-barre', 'prix-kwh', 'jours']) {
      expect(parChamp.get(id), id).toBeTruthy();
    }
    expect(parChamp.has('longueur-barre') && parChamp.get('longueur-barre')!.every((m) => /barres/.test(m))).toBe(true);
  });

  it("espacement hors bornes", () => {
    expect(champsConcernes("L'espacement entre plants doit être compris entre 5 et 300 cm.", aucun)).toEqual(['espacement']);
  });
});
