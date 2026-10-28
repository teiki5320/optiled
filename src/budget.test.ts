import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUDGET, gammePourPuissance, mentionNiveaux, moisAnnee, NIVEAUX, niveauLampes, niveauTotal, texteNiveau } from './budget.ts';
import { LAMPES } from './lampes.ts';

const brut = readFileSync(resolve(import.meta.dirname, 'data/budget.json'), 'utf8');
const postes = [...Object.values(BUDGET.lampes), ...Object.values(BUDGET.accessoires)];

describe('budget.json : format', () => {
  it('les cinq gammes de lampes et les six accessoires, chacun avec un libellé', () => {
    expect(Object.keys(BUDGET.lampes).sort()).toEqual(['appoint', 'barres', 'grands', 'moyens', 'petits']);
    expect(Object.keys(BUDGET.accessoires).sort()).toEqual(['extracteur-100', 'minuterie', 'ph-metre', 'tente-80', 'thermo-hygrometre', 'ventilateur-pince']);
    for (const p of postes) expect(p.libelle.length).toBeGreaterThan(3);
  });

  it('chaque poste a un niveau de budget (petit, moyen, gros), jamais de montant', () => {
    for (const p of postes) expect(NIVEAUX, p.libelle).toContain(p.niveau);
    expect(JSON.stringify(postes)).not.toMatch(/€|euros?|fourchette/);
    for (const p of postes) expect(Object.keys(p).sort(), p.libelle).toEqual(['libelle', 'niveau']);
  });

  it('gammes dans un ordre de budget cohérent', () => {
    const rang = (g: keyof typeof BUDGET.lampes) => NIVEAUX.indexOf(BUDGET.lampes[g].niveau);
    expect(rang('petits')).toBeLessThanOrEqual(rang('moyens'));
    expect(rang('moyens')).toBeLessThanOrEqual(rang('grands'));
  });

  it('aucun prix par produit : ni ASIN, ni nom de modèle, ni champ « prix »', () => {
    expect(brut).not.toMatch(/B0[0-9A-Z]{8}/);
    expect(brut).not.toMatch(/"(asin|prix|price|note|avis)"\s*:/i);
    for (const l of LAMPES) {
      expect(brut, l.id).not.toContain(l.id);
      expect(brut, l.nom).not.toContain(l.nom);
    }
    const marques = new Set(LAMPES.map((l) => l.marque));
    for (const m of marques) expect(brut.includes(`"${m}`), m).toBe(false);
  });
});

describe('niveaux et textes', () => {
  it('textes des niveaux, sans chiffres', () => {
    expect(NIVEAUX.map(texteNiveau)).toEqual(['Petit budget', 'Budget moyen', 'Gros budget']);
    expect(mentionNiveaux()).not.toMatch(/\d|€|Amazon/);
  });

  it('plusieurs lampes montent d’un niveau ; une installation prend le niveau de son poste le plus coûteux', () => {
    expect(niveauLampes('petit', 1)).toBe('petit');
    expect(niveauLampes('moyen', 2)).toBe('gros');
    expect(niveauLampes('gros', 3)).toBe('gros');
    expect(niveauTotal(['petit', 'petit'])).toBe('petit');
    expect(niveauTotal(['petit', 'moyen', 'petit'])).toBe('moyen');
    expect(niveauTotal(['gros', 'moyen'])).toBe('gros');
  });

  it('gamme selon la puissance calculée', () => {
    expect(gammePourPuissance(21)).toEqual({ gamme: 'barres', nombre: 1 });
    expect(gammePourPuissance(83)).toEqual({ gamme: 'petits', nombre: 1 });
    expect(gammePourPuissance(148)).toEqual({ gamme: 'moyens', nombre: 1 });
    expect(gammePourPuissance(300)).toEqual({ gamme: 'grands', nombre: 1 });
    expect(gammePourPuissance(900)).toEqual({ gamme: 'grands', nombre: 2 });
  });

  it('dates en français', () => {
    expect(moisAnnee('2026-09-24')).toBe('septembre 2026');
  });
});
