import { describe, expect, it } from 'vitest';
import { chargerLegumes } from './fiches.ts';
import { libelleStadeExigeant, NIVEAUX, rendrePuissancesCultures } from './guides-achat.ts';

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

describe('tableau « Puissance selon la culture »', () => {
  const legumes = chargerLegumes();
  const html = rendrePuissancesCultures(legumes);
  const ligne = (id: string) => html.match(new RegExp(`<tr><td><a href="legume-${id}\\.html">[\\s\\S]*?</tr>`))![0];

  it('précise le stade réellement le plus exigeant', () => {
    // Safran : 200 µmol/m²/s en croissance, 100 en floraison.
    expect(ligne('safran')).toContain('<small>en croissance</small>');
    expect(ligne('safran')).toContain('<td>200</td>');
    expect(ligne('safran')).not.toContain('floraison');
    expect(ligne('tomate')).toContain('<small>en fructification</small>');
    expect(ligne('tomate')).toContain('<td>500</td>');
    expect(ligne('chanvre-cbd')).toContain('<small>en floraison</small>');
    expect(ligne('laitue')).not.toContain('<small>');
  });

  it('pas de double parenthèse après un nom qui en contient déjà', () => {
    expect(ligne('tomate-naine')).toContain('Tomate naine (micro-tomate)</a> <small>en fructification</small>');
    expect(html).not.toMatch(/\)<\/a> <small>\(/);
  });

  it('libellé vide pour une culture à un seul stade', () => {
    expect(libelleStadeExigeant(legumes.find((l) => l.id === 'basilic')!)).toBe('');
  });
});
