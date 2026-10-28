import { describe, expect, it } from 'vitest';
import { CODES_SUIVI, codeSuivi, TAG_AMAZON, type Emplacement } from './suivi-amazon.ts';
import { lienAmazonAsin } from './lampes.ts';

describe('codes de suivi Amazon', () => {
  it('chaque emplacement a un code au format Amazon (…-21)', () => {
    for (const [e, code] of Object.entries(CODES_SUIVI)) expect(code, e).toMatch(/^[a-z0-9]{1,20}-21$/);
  });
  it("pour l'instant, tous les emplacements gardent le code actuel du site", () => {
    expect(new Set(Object.values(CODES_SUIVI))).toEqual(new Set([TAG_AMAZON]));
  });
  it("le lien d'un produit porte le code de son emplacement", () => {
    for (const e of Object.keys(CODES_SUIVI) as Emplacement[]) {
      expect(lienAmazonAsin('B000000000', e)).toBe(`https://www.amazon.fr/dp/B000000000?tag=${codeSuivi(e)}`);
    }
  });
});
