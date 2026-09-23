import { describe, expect, it } from 'vitest';
import { calculer, type EntreesCalcul } from './calc';
import { jaugeDli, planBarres } from './schema';

const base: EntreesCalcul = {
  ppfd: 500,
  photoperiodeH: 16,
  surface: { mode: 'rangs', nbRangs: 3, longueurM: 2.4, largeurRangM: 0.4 },
  efficaciteUmolJ: 2.7,
  coefUtilisation: 0.8,
  hauteurCm: [35, 50],
  longueurBarreM: 1.2,
  puissanceBarreW: 60,
  joursParAn: 365,
};

describe('plan des barres', () => {
  it('dessine une zone par rang et une barre par barre calculée', () => {
    const r = calculer(base);
    const svg = planBarres(base.surface, r.barres, base.longueurBarreM);
    expect(svg.match(/class="plan-zone"/g)).toHaveLength(3);
    expect(svg.match(/class="plan-barre"/g)).toHaveLength(r.barres.total);
    expect(svg).toContain('2,40 m');
  });

  it("affiche l'entraxe quand il y a plusieurs lignes", () => {
    const e: EntreesCalcul = { ...base, ppfd: 250, surface: { mode: 'rectangle', longueurM: 1.2, largeurM: 0.6 }, hauteurCm: [20, 30], puissanceBarreW: undefined };
    const r = calculer(e);
    expect(planBarres(e.surface, r.barres, 1.2)).toContain('20 cm');
  });
});

describe('jauge DLI', () => {
  it('place le curseur proportionnellement et le borne à 100 %', () => {
    expect(jaugeDli(20)).toContain('left:50.00%');
    expect(jaugeDli(80)).toContain('left:100.00%');
    expect(jaugeDli(14.4)).toContain('14,4');
  });
});
