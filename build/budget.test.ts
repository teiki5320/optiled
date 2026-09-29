import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculerBudget, rendreBudget, rendreFourchettesGammes, SCENARIOS, texteEuros } from './budget.ts';
import { BUDGET, PRIX_EN_COURS } from '../src/budget.ts';

const racine = resolve(import.meta.dirname, '..');

describe('budgets de départ', () => {
  it('étagère de salades : réglettes ; tente de tomates : panneau moyen', () => {
    expect(calculerBudget(SCENARIOS.find((s) => s.id === 'etagere')!).gamme).toBe('barres');
    expect(calculerBudget(SCENARIOS.find((s) => s.id === 'tente')!).gamme).toBe('moyens');
  });

  it('total du matériel = somme des postes, électricité par mois et par an', () => {
    for (const s of SCENARIOS) {
      const b = calculerBudget(s);
      const min = b.postes.reduce((t, p) => t + (p.fourchette?.[0] ?? NaN), 0);
      if (b.materiel) expect(b.materiel[0]).toBe(min);
      expect(b.electriciteAnEur).toBeCloseTo(b.electriciteMoisEur * 12, 6);
      const html = rendreBudget(s.id);
      expect(html).toContain('par mois');
      expect(html).toContain('Prix relevés sur Amazon.fr le');
    }
  });

  it("ni lien d'achat ni nom de modèle dans les budgets", () => {
    for (const html of [...SCENARIOS.map((s) => rendreBudget(s.id)), rendreFourchettesGammes()]) {
      expect(html).not.toContain('amazon.fr/dp');
      expect(html).not.toContain('<a ');
      expect(html).not.toMatch(/Spider Farmer|Mars Hydro|Barrina|SANSI|ViparSpectra/);
    }
  });

  it('sans prix relevés : « prix en cours de relevé », la page reste complète', () => {
    const sauvegarde = structuredClone(BUDGET);
    try {
      for (const p of [...Object.values(BUDGET.lampes), ...Object.values(BUDGET.accessoires)]) p.fourchette = null;
      const html = rendreBudget('tente');
      expect(html).toContain(PRIX_EN_COURS);
      expect(html).toContain('par mois');
      expect(html).not.toContain('NaN');
      expect(rendreFourchettesGammes()).toContain(PRIX_EN_COURS);
    } finally {
      Object.assign(BUDGET, sauvegarde);
    }
  });

  it('montants d’électricité lisibles', () => {
    expect(texteEuros(0.4)).toBe('moins de 1 €');
    expect(texteEuros(2.03)).toBe('2 €');
    expect(texteEuros(2.3)).toBe('2,5 €');
    expect(texteEuros(14.4)).toBe('14 €');
  });

  it('les pages Débuter et Tente utilisent les marqueurs (aucun montant en dur)', () => {
    for (const [page, id] of [['debuter.html', 'etagere'], ['tente.html', 'tente']]) {
      const source = readFileSync(resolve(racine, page), 'utf8');
      expect(source, page).toContain(`<!--#budget:${id}-->`);
      expect(source, page).not.toMatch(/\d+\s*(€|euros)/);
    }
  });
});
