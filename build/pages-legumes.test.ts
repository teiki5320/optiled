import { describe, expect, it } from 'vitest';
import { chargerLegumes } from './fiches.ts';
import { descriptionLegume, exempleCalcul, fichierLegume, pagesLegumes, stadeLePlusExigeant } from './pages-legumes.ts';
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

  it('description et titre dans les limites habituelles des moteurs de recherche', () => {
    for (const l of legumes) {
      expect(descriptionLegume(l).length, l.id).toBeLessThanOrEqual(158);
      const titre = pages.get(fichierLegume(l.id))!.match(/<title>([^<]+)<\/title>/)![1];
      expect(titre.length, l.id).toBeLessThanOrEqual(65);
    }
  });

  it('description : stades dans l’ordre du cycle et délai de récolte non trompeur', () => {
    const description = (id: string) => descriptionLegume(legumes.find((l) => l.id === id)!);
    // Safran : la floraison (100 µmol/m²/s, 10 h) précède le feuillage (200, 12 h).
    expect(description('safran')).toContain('100 µmol/m²/s et 10 h en floraison, puis 200 et 12 h pour le feuillage');
    expect(description('safran')).not.toContain('200 puis 100');
    // Wasabi : les feuilles se récoltent bien avant le rhizome.
    expect(description('wasabi')).toContain('rhizome en 365 à 540 jours');
    expect(description('wasabi')).not.toContain('première récolte');
    expect(description('tomate')).toContain('350 puis 500 µmol/m²/s');
  });

  it("pas de note ni de nombre d'avis Amazon", () => {
    for (const [fichier, html] of pages) expect(html, fichier).not.toMatch(/★|\bavis\)/);
  });

  it('on dimensionne pour le stade au PPFD le plus élevé', () => {
    for (const l of legumes) {
      const f = l.stades.floraison;
      expect(stadeLePlusExigeant(l), l.id).toBe(f && f.ppfd.valeur >= l.stades.croissance.ppfd.valeur ? 'floraison' : 'croissance');
    }
    const tomate = pages.get(fichierLegume('tomate'))!;
    expect(tomate).toContain('une phase de floraison et de fructification, plus gourmande en lumière');
    expect(tomate).toContain('On dimensionne l’installation pour la floraison et la fructification, le stade le plus exigeant');
    // Safran : la floraison (100 µmol/m²/s) demande moins que la croissance (200), et ne donne pas de fruits.
    const safran = pages.get(fichierLegume('safran'))!;
    expect(stadeLePlusExigeant(legumes.find((l) => l.id === 'safran')!)).toBe('croissance');
    expect(safran).toContain('C’est la croissance qui demande le plus de lumière');
    expect(safran).toContain('On dimensionne l’installation pour la croissance');
    expect(safran).not.toMatch(/fructification|plus gourmande en lumière/);
  });

  it("l'exemple sur 1 m² reprend le calcul du calculateur", () => {
    const laitue = legumes.find((l) => l.id === 'laitue')!;
    const r = exempleCalcul(laitue.stades.croissance);
    expect(r.surfaceM2).toBe(1);
    expect(r.ppfNecessaire).toBeCloseTo(laitue.stades.croissance.ppfd.valeur / 0.8);
  });
});
