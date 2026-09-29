import { describe, expect, it } from 'vitest';
import { dimensionsTexte, resumeCalculPartage } from './partage.ts';

describe('bandeau « Calcul partagé »', () => {
  it('dimensions à la française', () => {
    expect(dimensionsTexte({ mode: 'rectangle', longueurM: 0.6, largeurM: 0.3 })).toBe('0,6 × 0,3 m');
    expect(dimensionsTexte({ mode: 'rectangle', longueurM: 1, largeurM: 1.25 })).toBe('1 × 1,25 m');
    expect(dimensionsTexte({ mode: 'rangs', nbRangs: 3, longueurM: 2.4, largeurRangM: 0.4 })).toBe('3 rangs de 2,4 × 0,4 m');
    expect(dimensionsTexte({ mode: 'rangs', nbRangs: 1, longueurM: 2, largeurRangM: 0.4 })).toBe('1 rang de 2 × 0,4 m');
  });

  it('résumé : culture, dimensions, puissance et barres (singulier ou pluriel)', () => {
    expect(resumeCalculPartage('Laitue', { mode: 'rectangle', longueurM: 0.6, largeurM: 0.3 }, 20.8, 1)).toBe('Laitue, 0,6 × 0,3 m → 21 W, 1 barre');
    expect(resumeCalculPartage('Tomate', { mode: 'rectangle', longueurM: 0.8, largeurM: 0.8 }, 148.1, 3)).toBe('Tomate, 0,8 × 0,8 m → 148 W, 3 barres');
  });
});
