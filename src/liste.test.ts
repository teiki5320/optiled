import { describe, expect, it } from 'vitest';
import { calculer, type EntreesCalcul } from './calc.ts';
import { arrondiPuissance, listeAchat, resumeTexte, type ContexteListe } from './liste.ts';

const entrees: EntreesCalcul = {
  ppfd: 250,
  photoperiodeH: 16,
  surface: { mode: 'rectangle', longueurM: 1.2, largeurM: 0.6 },
  efficaciteUmolJ: 2.7,
  coefUtilisation: 0.8,
  hauteurCm: [20, 30],
  longueurBarreM: 1.2,
  prixKwh: 0.2,
  joursParAn: 365,
};
const ctx: ContexteListe = {
  legume: 'Laitue',
  stade: 'croissance',
  spectre: 'Blanc 4000 K',
  efficaciteUmolJ: 2.7,
  longueurBarreM: 1.2,
  photoperiodeH: 16,
};

describe('liste d’achat', () => {
  it('arrondiPuissance arrondit au multiple de 5 W supérieur', () => {
    expect(arrondiPuissance(27.8)).toBe(30);
    expect(arrondiPuissance(30)).toBe(30);
    expect(arrondiPuissance(0.1)).toBe(5);
  });

  it('commence par les barres, avec la bonne quantité', () => {
    const [barres] = listeAchat(calculer(entrees), ctx);
    expect(barres.quantite).toBe(3);
    expect(barres.detail).toContain('≥ 30 W');
  });

  it('le résumé texte contient les chiffres clés', () => {
    const texte = resumeTexte(calculer(entrees), ctx);
    expect(texte).toContain('Laitue');
    expect(texte).toContain('14,4 mol/m²/jour');
    expect(texte).toContain("Liste d'achat");
    expect(texte).toMatch(/Coût électrique annuel : 97,33/);
  });
});

describe('résumé : plants, alertes et avertissement', () => {
  it('ajoute le nombre de plants, les alertes et l’avertissement', () => {
    const texte = resumeTexte(calculer(entrees), { ...ctx, plants: { total: 18, espacementCm: 20 }, alertes: ['Trop long.'], avertissement: 'Réglementé.' });
    expect(texte).toContain('Plants : ≈ 18 à 20 cm');
    expect(texte).toContain('Attention : Trop long.');
    expect(texte).toContain('Avertissement : Réglementé.');
  });
});
