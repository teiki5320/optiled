import { describe, expect, it } from 'vitest';
import { LAMPES, lampesConseillees, lienAmazon, TAG_AMAZON } from './lampes';

describe('sélection de lampes', () => {
  it('données cohérentes', () => {
    for (const l of LAMPES) {
      expect(l.asin).toMatch(/^B0[0-9A-Z]{8}$/);
      expect(l.note).toBeGreaterThanOrEqual(4);
      expect(l.puissance_w).toBeGreaterThan(0);
      if (l.ppf !== null) {
        expect(l.couverture_m2).not.toBeNull();
        // Efficacité plausible (µmol/J)
        expect(l.ppf / l.puissance_w).toBeGreaterThan(1);
        expect(l.ppf / l.puissance_w).toBeLessThan(3.3);
      }
    }
    expect(new Set(LAMPES.map((l) => l.id)).size).toBe(LAMPES.length);
  });

  it('lien Amazon avec identifiant partenaire', () => {
    expect(lienAmazon(LAMPES[0])).toBe(`https://www.amazon.fr/dp/${LAMPES[0].asin}?tag=${TAG_AMAZON}`);
  });

  it('laitue sur 1,2 × 0,6 m : un petit panneau suffit', () => {
    const p = lampesConseillees(225, 0.72, 'croissance');
    expect(p.length).toBeGreaterThan(0);
    expect(p.length).toBeLessThanOrEqual(3);
    for (const x of p) expect(x.ppfTotal).toBeGreaterThanOrEqual(225);
    expect(p[0].nombre).toBe(1);
  });

  it('grande surface : pas de lampes minuscules en grand nombre', () => {
    const p = lampesConseillees(1500, 1.44, 'floraison');
    for (const x of p) expect(x.nombre).toBeLessThanOrEqual(6);
    expect(p.every((x) => x.lampe.type !== 'appoint')).toBe(true);
  });

  it('besoin nul : aucune proposition', () => {
    expect(lampesConseillees(0, 1, 'croissance')).toEqual([]);
  });
});
