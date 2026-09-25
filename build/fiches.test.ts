import { describe, expect, it } from 'vitest';
import { chargerLegumes, echapper, rendreFiche, rendreFiches } from './fiches.ts';

describe('fiches légumes', () => {
  const legumes = chargerLegumes();

  it('une fiche par légume, avec ancre', () => {
    const html = rendreFiches();
    for (const l of legumes) expect(html).toContain(`id="${l.id}"`);
  });

  it('affiche le DLI calculé et le lien vers le calculateur', () => {
    const html = rendreFiche(legumes.find((l) => l.id === 'laitue')!);
    expect(html).toContain("14,4");
    expect(html).toContain('index.html?legume=laitue#calculateur');
  });

  it('les fruits ont un bloc floraison, pas les feuilles', () => {
    expect(rendreFiche(legumes.find((l) => l.id === 'tomate')!)).toContain('floraison / fructification');
    expect(rendreFiche(legumes.find((l) => l.id === 'laitue')!)).not.toContain('floraison / fructification');
  });

  it('échappe le HTML', () => {
    expect(echapper('<a & "b">')).toBe('&#60;a &#38; &#34;b&#34;&#62;');
  });
});
