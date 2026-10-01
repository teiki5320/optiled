import { describe, expect, it } from 'vitest';
import { avecIntegre, estIntegre, sansIntegre } from './integre.ts';

describe('mode intégré du calculateur', () => {
  it('détecte le paramètre', () => {
    expect(estIntegre('?integre=1')).toBe(true);
    expect(estIntegre('?l=tomate&integre')).toBe(true);
    expect(estIntegre('?l=tomate')).toBe(false);
    expect(estIntegre('')).toBe(false);
  });
  it('garde le paramètre avec les réglages', () => {
    expect(avecIntegre('')).toBe('integre=1');
    expect(avecIntegre('l=tomate')).toBe('l=tomate&integre=1');
  });
  it("le retire de l'adresse publique", () => {
    expect(sansIntegre('https://www.optiled.fr/?l=tomate&integre=1#resultats')).toBe('https://www.optiled.fr/?l=tomate#resultats');
    expect(sansIntegre('https://www.optiled.fr/?integre=1')).toBe('https://www.optiled.fr/');
  });
});
