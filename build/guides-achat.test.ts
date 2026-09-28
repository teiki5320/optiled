import { describe, expect, it } from 'vitest';
import { chargerLegumes } from './fiches.ts';
import { NIVEAUX } from './guides-achat.ts';

describe("niveaux de lumière des guides d'achat", () => {
  it('chaque libellé correspond aux fiches', () => {
    const legumes = chargerLegumes();
    const maxFamille = (famille: string) =>
      Math.max(...legumes.filter((l) => l.famille === famille).flatMap((l) => [l.stades.croissance.ppfd.valeur, l.stades.floraison?.ppfd.valeur ?? 0]));
    for (const n of NIVEAUX) {
      expect(n.libelle).toContain(`(${n.ppfd})`);
      // Les aromatiques ne dépassent pas 300 µmol/m²/s : aucune colonne « Aromatiques » au-dessus.
      if (/aromatiques/i.test(n.libelle)) expect(n.ppfd, n.libelle).toBeLessThanOrEqual(maxFamille('Aromatiques'));
    }
    const croissanceFruits = legumes.filter((l) => l.famille === 'Légumes fruits').map((l) => l.stades.croissance.ppfd.valeur);
    expect(Math.max(...croissanceFruits)).toBe(350);
  });
});
