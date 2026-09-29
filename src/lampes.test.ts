import { describe, expect, it } from 'vitest';
import { LAMPES, lampesConseillees, lienAmazon, TAG_AMAZON } from './lampes.ts';

describe('sélection de lampes', () => {
  // La note Amazon (≥ 4 étoiles) n'est plus enregistrée ni publiée : ce critère de sélection est
  // vérifié à la main chaque mois sur la page du produit (date dans `verifie_le`).
  it('données cohérentes', () => {
    for (const l of LAMPES) {
      expect(l.asin).toMatch(/^B0[0-9A-Z]{8}$/);
      expect(l.puissance_w).toBeGreaterThan(0);
      if (l.ppf !== null) {
        expect(l.couverture_m2).not.toBeNull();
        // Efficacité plausible (µmol/J)
        expect(l.ppf / l.puissance_w).toBeGreaterThan(1);
        expect(l.ppf / l.puissance_w).toBeLessThan(3.3);
      }
    }
    expect(new Set(LAMPES.map((l) => l.id)).size).toBe(LAMPES.length);
    expect(LAMPES.every((l) => !('note' in l) && !('avis' in l)), 'ni note ni nombre d’avis dans les données').toBe(true);
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
