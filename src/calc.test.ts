import { describe, expect, it } from 'vitest';
import {
  calculer,
  calculerDli,
  calculerSurface,
  ppfdDepuisDli,
  repartirBarres,
  validerEntrees,
  type EntreesCalcul,
} from './calc';

const base: EntreesCalcul = {
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

describe('DLI', () => {
  it('DLI = PPFD × h × 3600 / 1e6', () => {
    expect(calculerDli(250, 16)).toBeCloseTo(14.4, 6);
    expect(calculerDli(500, 12)).toBeCloseTo(21.6, 6);
  });

  it('ppfdDepuisDli est la réciproque de calculerDli', () => {
    expect(ppfdDepuisDli(calculerDli(320, 14), 14)).toBeCloseTo(320, 6);
  });
});

describe('surface', () => {
  it('rectangle : longueur × largeur', () => {
    expect(calculerSurface({ mode: 'rectangle', longueurM: 2, largeurM: 1.5 })).toBeCloseTo(3, 9);
  });

  it('rangs : nb × longueur × largeur de rang', () => {
    expect(calculerSurface({ mode: 'rangs', nbRangs: 3, longueurM: 2.4, largeurRangM: 0.4 })).toBeCloseTo(2.88, 9);
  });
});

describe('calculer — laitue sur 1,2 × 0,6 m', () => {
  const r = calculer(base);

  it('flux et puissance', () => {
    expect(r.surfaceM2).toBeCloseTo(0.72, 9);
    expect(r.ppfUtile).toBeCloseTo(180, 6);
    expect(r.ppfNecessaire).toBeCloseTo(225, 6);
    expect(r.puissanceW).toBeCloseTo(83.333, 2);
    expect(r.densitePuissanceWm2).toBeCloseTo(115.74, 1);
  });

  it('DLI', () => {
    expect(r.dli).toBeCloseTo(14.4, 6);
  });

  it('barres : 3 lignes de 1 barre, entraxe 20 cm', () => {
    expect(r.barres.barresParLigne).toBe(1);
    expect(r.barres.lignesParZone).toBe(3);
    expect(r.barres.total).toBe(3);
    expect(r.barres.espacementM).toBeCloseTo(0.2, 9);
    expect(r.barres.margeBordM).toBeCloseTo(0.1, 9);
    expect(r.barres.puissanceParBarreNecessaireW).toBeCloseTo(27.78, 2);
    expect(r.barres.tauxGradation).toBeCloseTo(1, 9);
  });

  it('consommation et coût', () => {
    expect(r.consoJourKwh).toBeCloseTo(1.3333, 4);
    expect(r.consoAnKwh).toBeCloseTo(486.67, 2);
    expect(r.coutAnEur).toBeCloseTo(97.33, 2);
  });

  it("coût null sans prix du kWh", () => {
    expect(calculer({ ...base, prixKwh: undefined }).coutAnEur).toBeNull();
  });

  it("l'efficacité divise la puissance", () => {
    const r35 = calculer({ ...base, efficaciteUmolJ: 3.5 });
    expect(r35.puissanceW).toBeCloseTo((250 * 0.72) / 0.8 / 3.5, 6);
  });

  it("coefficient d'utilisation à 1 : PPF nécessaire = PPF utile", () => {
    const r1 = calculer({ ...base, coefUtilisation: 1 });
    expect(r1.ppfNecessaire).toBeCloseTo(r1.ppfUtile, 9);
  });
});

describe('calculer — tomate en fructification sur 3 rangs', () => {
  const entrees: EntreesCalcul = {
    ...base,
    ppfd: 500,
    surface: { mode: 'rangs', nbRangs: 3, longueurM: 2.4, largeurRangM: 0.4 },
    hauteurCm: [35, 50],
    puissanceBarreW: 60,
  };
  const r = calculer(entrees);

  it('puissance', () => {
    expect(r.puissanceW).toBeCloseTo(666.67, 2);
  });

  it('les barres de 60 W imposent 2 lignes par rang', () => {
    expect(r.barres.zones).toBe(3);
    expect(r.barres.barresParLigne).toBe(2);
    expect(r.barres.lignesParZone).toBe(2);
    expect(r.barres.total).toBe(12);
    expect(r.barres.puissanceInstalleeW).toBe(720);
    expect(r.barres.tauxGradation).toBeCloseTo(0.9259, 4);
  });

  it('la puissance installée couvre toujours le besoin', () => {
    for (const p of [10, 25, 48, 100, 300]) {
      const rr = calculer({ ...entrees, puissanceBarreW: p });
      expect(rr.barres.puissanceInstalleeW).toBeGreaterThanOrEqual(rr.puissanceW - 1e-9);
    }
  });
});

describe('repartirBarres', () => {
  const commun = { puissanceTotaleW: 100, hauteurCm: [20, 30] as [number, number] };

  it("tolère qu'il manque moins d'un quart de barre", () => {
    const r = repartirBarres({ ...commun, surface: { mode: 'rectangle', longueurM: 2.5, largeurM: 0.25 }, longueurBarreM: 1.2 });
    expect(r.barresParLigne).toBe(2);
  });

  it("ajoute une barre au-delà d'un quart manquant", () => {
    const r = repartirBarres({ ...commun, surface: { mode: 'rectangle', longueurM: 1.7, largeurM: 0.25 }, longueurBarreM: 1.2 });
    expect(r.barresParLigne).toBe(2);
  });

  it('au moins une barre même pour une petite surface', () => {
    const r = repartirBarres({ ...commun, surface: { mode: 'rectangle', longueurM: 0.3, largeurM: 0.2 }, longueurBarreM: 1.2 });
    expect(r.barresParLigne).toBe(1);
    expect(r.lignesParZone).toBe(1);
    expect(r.total).toBe(1);
  });

  it("l'entraxe ne dépasse jamais la hauteur moyenne", () => {
    for (const largeurM of [0.3, 0.6, 1, 1.25, 2.4]) {
      const r = repartirBarres({ ...commun, surface: { mode: 'rectangle', longueurM: 1.2, largeurM }, longueurBarreM: 1.2 });
      expect(r.espacementM).toBeLessThanOrEqual(0.25 + 1e-9);
    }
  });
});

describe('validerEntrees', () => {
  it('aucune erreur pour des entrées valides', () => {
    expect(validerEntrees(base)).toEqual([]);
  });

  it.each([
    ['PPFD nul', { ppfd: 0 }],
    ['photopériode > 24 h', { photoperiodeH: 25 }],
    ['largeur négative', { surface: { mode: 'rectangle', longueurM: 1, largeurM: -1 } }],
    ['nombre de rangs non entier', { surface: { mode: 'rangs', nbRangs: 2.5, longueurM: 1, largeurRangM: 0.4 } }],
    ['efficacité irréaliste', { efficaciteUmolJ: 8 }],
    ['coefficient > 1', { coefUtilisation: 1.2 }],
    ['prix négatif', { prixKwh: -0.1 }],
    ['valeur NaN', { photoperiodeH: NaN }],
  ] as [string, Partial<EntreesCalcul>][])('%s', (_nom, modif) => {
    expect(validerEntrees({ ...base, ...modif }).length).toBeGreaterThan(0);
  });

  it('calculer lève une RangeError sur entrée invalide', () => {
    expect(() => calculer({ ...base, ppfd: -5 })).toThrow(RangeError);
  });
});
