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

  it('bloc floraison intitulé selon la culture, absent pour les feuilles', () => {
    const fiche = (id: string) => rendreFiche(legumes.find((l) => l.id === id)!);
    expect(fiche('tomate')).toContain('<h4>Lumière — floraison et fructification</h4>');
    // Safran et chanvre fleurissent sans donner de fruits.
    expect(fiche('safran')).toContain('<h4>Lumière — floraison</h4>');
    expect(fiche('safran')).not.toContain('fructification');
    expect(fiche('laitue')).not.toMatch(/Lumière — floraison/);
  });

  it('échappe le HTML', () => {
    expect(echapper('<a & "b">')).toBe('&#60;a &#38; &#34;b&#34;&#62;');
  });
});
