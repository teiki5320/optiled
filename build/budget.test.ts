import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculerBudget, rendreBudget, rendreNiveauxGammes, SCENARIOS, texteEuros } from './budget.ts';

const racine = resolve(import.meta.dirname, '..');

describe('budgets de départ', () => {
  it('étagère de salades : réglettes, petit budget ; tente de tomates : panneau moyen, budget moyen', () => {
    const etagere = calculerBudget(SCENARIOS.find((s) => s.id === 'etagere')!);
    const tente = calculerBudget(SCENARIOS.find((s) => s.id === 'tente')!);
    expect(etagere.gamme).toBe('barres');
    expect(etagere.materiel).toBe('petit');
    expect(tente.gamme).toBe('moyens');
    expect(tente.materiel).toBe('moyen');
  });

  it('niveau par poste, électricité par mois et par an', () => {
    for (const s of SCENARIOS) {
      const b = calculerBudget(s);
      expect(b.electriciteAnEur).toBeCloseTo(b.electriciteMoisEur * 12, 6);
      const html = rendreBudget(s.id);
      expect(html).toContain('par mois');
      expect(html).toContain('<th>Niveau de budget</th>');
      expect(html).toMatch(/Petit budget|Budget moyen|Gros budget/);
    }
  });

  it('aucun montant en euros pour le matériel, aucun « prix relevé »', () => {
    for (const html of [...SCENARIOS.map((s) => rendreBudget(s.id)), rendreNiveauxGammes()]) {
      // Seule la ligne d'électricité (kWh) peut contenir des euros.
      const sansElectricite = html.replace(/<tr class="total"><th scope="row">Électricité[\s\S]*?<\/tr>/, '');
      expect(sansElectricite).not.toMatch(/€|euros?\b/);
      expect(html).not.toMatch(/relev|fourchette/i);
    }
  });

  it("ni lien d'achat ni nom de modèle dans les budgets", () => {
    for (const html of [...SCENARIOS.map((s) => rendreBudget(s.id)), rendreNiveauxGammes()]) {
      expect(html).not.toContain('amazon.fr/dp');
      expect(html).not.toContain('<a ');
      expect(html).not.toMatch(/Spider Farmer|Mars Hydro|Barrina|SANSI|ViparSpectra/);
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
