import { describe, expect, it } from 'vitest';
import brut from './data/legumes.json';
import { LEGUMES, legumesParFamille, parametresStade, trouverLegume } from './data';

describe('legumes.json', () => {
  it('contient les légumes demandés', () => {
    for (const id of ['laitue', 'epinard', 'basilic', 'persil', 'micro-pousses', 'fraise', 'tomate', 'poivron', 'concombre', 'piment']) {
      expect(trouverLegume(id), id).toBeDefined();
    }
  });

  it('identifiants uniques', () => {
    const ids = LEGUMES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('les références déclarées sont non vides', () => {
    for (const texte of Object.values(brut.references)) expect(texte.trim()).not.toBe('');
  });

  for (const legume of LEGUMES) {
    describe(legume.nom, () => {
      it('a un stade croissance', () => {
        expect(legume.stades.croissance).toBeTruthy();
      });

      for (const [stade, p] of Object.entries(legume.stades)) {
        if (!p) continue;
        it(`${stade} : chaque valeur a une source`, () => {
          for (const champ of [p.ppfd, p.photoperiode, p.hauteur_cm, p.spectre]) {
            expect(typeof champ.source).toBe('string');
            expect(champ.source.trim().length).toBeGreaterThan(5);
          }
        });

        it(`${stade} : valeurs plausibles`, () => {
          expect(p.ppfd.valeur).toBeGreaterThan(50);
          expect(p.ppfd.valeur).toBeLessThanOrEqual(1500);
          expect(p.photoperiode.valeur).toBeGreaterThan(0);
          expect(p.photoperiode.valeur).toBeLessThanOrEqual(24);
          expect(p.hauteur_cm.valeur).toHaveLength(2);
          expect(p.hauteur_cm.valeur[0]).toBeGreaterThan(0);
          expect(p.hauteur_cm.valeur[0]).toBeLessThanOrEqual(p.hauteur_cm.valeur[1]);
          expect(p.spectre.valeur.trim()).not.toBe('');
        });
      }
    });
  }
});

describe('accès aux données', () => {
  it('parametresStade renvoie null pour la floraison des légumes feuilles', () => {
    expect(parametresStade(trouverLegume('laitue')!, 'floraison')).toBeNull();
    expect(parametresStade(trouverLegume('tomate')!, 'floraison')).not.toBeNull();
  });

  it('legumesParFamille regroupe tous les légumes', () => {
    const total = [...legumesParFamille().values()].reduce((n, l) => n + l.length, 0);
    expect(total).toBe(LEGUMES.length);
  });
});
