import { describe, expect, it } from 'vitest';
import { chargerLegumes } from './fiches.ts';
import { descriptionLegume, exempleCalcul, fichierLegume, pagesLegumes } from './pages-legumes.ts';
import { transformerPage } from './site.ts';

const legumes = chargerLegumes();
const pages = pagesLegumes();

describe('pages détaillées des cultures', () => {
  it('une page par culture', () => {
    expect(pages.size).toBe(legumes.length);
    for (const l of legumes) expect(pages.has(fichierLegume(l.id)), l.id).toBe(true);
  });

  for (const l of legumes) {
    it(`${l.id} : contenu complet, sans valeur manquante`, () => {
      const html = transformerPage(pages.get(fichierLegume(l.id))!, fichierLegume(l.id));
      expect(html).not.toMatch(/NaN|undefined|null|Infinity/);
      expect(html).toContain('<h1');
      expect(html).toContain('href="index.html?legume=' + l.id + '#calculateur"');
      expect(html).toContain('"@type":"BreadcrumbList"');
      for (const id of ['lumiere', 'exemple', 'climat', 'nutrition', 'culture']) expect(html).toContain(`id="${id}"`);
      // Liens Amazon toujours signalés comme sponsorisés.
      for (const [lien] of html.matchAll(/<a [^>]*amazon\.fr[^>]*>/g)) expect(lien).toContain('rel="sponsored');
    });
  }

  it('description dans la limite habituelle des moteurs de recherche', () => {
    for (const l of legumes) expect(descriptionLegume(l).length, l.id).toBeLessThan(200);
  });

  it("l'exemple sur 1 m² reprend le calcul du calculateur", () => {
    const laitue = legumes.find((l) => l.id === 'laitue')!;
    const r = exempleCalcul(laitue.stades.croissance);
    expect(r.surfaceM2).toBe(1);
    expect(r.ppfNecessaire).toBeCloseTo(laitue.stades.croissance.ppfd.valeur / 0.8);
  });
});
