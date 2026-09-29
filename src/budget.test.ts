import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  arrondirBas,
  arrondirHaut,
  BUDGET,
  dateReleve,
  fourchetteDepuisPrix,
  gammePourPuissance,
  moisAnnee,
  multiplier,
  PRIX_EN_COURS,
  sommeFourchettes,
  texteFourchette,
  type Fourchette,
} from './budget.ts';
import { LAMPES } from './lampes.ts';

const brut = readFileSync(resolve(import.meta.dirname, 'data/budget.json'), 'utf8');
const postes = [...Object.values(BUDGET.lampes), ...Object.values(BUDGET.accessoires)];

/** Une borne est bien arrondie : à 5 € sous 50 €, à 10 € à partir de 50 €. */
const bienArrondie = (v: number) => (v < 50 ? v % 5 === 0 : v % 10 === 0);

describe('budget.json : format', () => {
  it('date de relevé valide, pas dans le futur', () => {
    expect(BUDGET.releve_le).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(BUDGET.releve_le))).toBe(false);
    expect(BUDGET.releve_le <= new Date().toISOString().slice(0, 10)).toBe(true);
  });

  it('les cinq gammes de lampes et les six accessoires, chacun avec un libellé', () => {
    expect(Object.keys(BUDGET.lampes).sort()).toEqual(['appoint', 'barres', 'grands', 'moyens', 'petits']);
    expect(Object.keys(BUDGET.accessoires).sort()).toEqual(['extracteur-100', 'minuterie', 'ph-metre', 'tente-80', 'thermo-hygrometre', 'ventilateur-pince']);
    for (const p of postes) expect(p.libelle.length).toBeGreaterThan(3);
  });

  it('fourchettes : null ou [min, max] entiers, 0 < min < max, bornes arrondies', () => {
    for (const p of postes) {
      const f = p.fourchette;
      if (f === null) continue;
      expect(f, p.libelle).toHaveLength(2);
      const [min, max] = f;
      expect(Number.isInteger(min) && Number.isInteger(max), p.libelle).toBe(true);
      expect(min, p.libelle).toBeGreaterThan(0);
      expect(max, p.libelle).toBeGreaterThan(min);
      expect(bienArrondie(min), `${p.libelle} : ${min}`).toBe(true);
      expect(bienArrondie(max), `${p.libelle} : ${max}`).toBe(true);
    }
  });

  it('gammes dans un ordre de prix cohérent (bornes basses)', () => {
    const bas = (g: keyof typeof BUDGET.lampes) => BUDGET.lampes[g].fourchette?.[0];
    const suite = [bas('petits'), bas('moyens'), bas('grands')].filter((v) => v !== undefined) as number[];
    expect([...suite].sort((a, b) => a - b)).toEqual(suite);
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

describe('arrondis', () => {
  it('à 5 € sous 50 €, à 10 € au-delà ; borne basse vers le bas, haute vers le haut', () => {
    expect(arrondirBas(48.99)).toBe(45);
    expect(arrondirBas(5.35)).toBe(5);
    expect(arrondirBas(69.99)).toBe(60);
    expect(arrondirBas(260.54)).toBe(260);
    expect(arrondirHaut(8.99)).toBe(10);
    expect(arrondirHaut(49.44)).toBe(50);
    expect(arrondirHaut(127.99)).toBe(130);
    expect(arrondirHaut(40)).toBe(40);
  });

  it('fourchette à partir de prix relevés', () => {
    expect(fourchetteDepuisPrix([69.99, 79.99])).toEqual([60, 80]);
    expect(fourchetteDepuisPrix([])).toBeNull();
  });
});

describe('calculs et textes', () => {
  it('somme : null dès qu’un poste n’a pas de prix', () => {
    const f: Fourchette[] = [[5, 10], [20, 30]];
    expect(sommeFourchettes(f)).toEqual([25, 40]);
    expect(sommeFourchettes([...f, null])).toBeNull();
    expect(multiplier([260, 430], 2)).toEqual([520, 860]);
    expect(multiplier(null, 2)).toBeNull();
  });

  it('texte : fourchette ou « prix en cours de relevé »', () => {
    expect(texteFourchette([45, 130])).toBe('45 à 130 €');
    expect(texteFourchette([1040, 1720])).toBe('1 040 à 1 720 €');
    expect(texteFourchette(null)).toBe(PRIX_EN_COURS);
  });

  it('gamme selon la puissance calculée', () => {
    expect(gammePourPuissance(21)).toEqual({ gamme: 'barres', nombre: 1 });
    expect(gammePourPuissance(83)).toEqual({ gamme: 'petits', nombre: 1 });
    expect(gammePourPuissance(148)).toEqual({ gamme: 'moyens', nombre: 1 });
    expect(gammePourPuissance(300)).toEqual({ gamme: 'grands', nombre: 1 });
    expect(gammePourPuissance(900)).toEqual({ gamme: 'grands', nombre: 2 });
  });

  it('dates en français', () => {
    expect(dateReleve('2026-09-29')).toBe('29 septembre 2026');
    expect(dateReleve('2026-10-01')).toBe('1er octobre 2026');
    expect(moisAnnee('2026-09-24')).toBe('septembre 2026');
  });
});
