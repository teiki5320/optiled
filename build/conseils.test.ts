import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conseilsPublies, dateDuJour, lireConseil, pagesConseils, sourcePageConseil, THEMES, tousLesConseils } from './conseils.ts';
import { sourcePage, toutesLesPages, transformerPage } from './site.ts';

const racine = resolve(import.meta.dirname, '..');
const tous = tousLesConseils();

describe('articles de conseil', () => {
  it('au moins un article, slugs uniques', () => {
    expect(tous.length).toBeGreaterThan(0);
    expect(new Set(tous.map((c) => c.slug)).size).toBe(tous.length);
  });

  for (const c of tous) {
    it(`${c.slug} : en-tête et structure valides`, () => {
      expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(c.publieLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(c.publieLe))).toBe(false);
      expect(c.theme in THEMES).toBe(true);
      expect(c.titre.length).toBeLessThanOrEqual(90);
      expect(c.description.length, 'description').toBeGreaterThanOrEqual(70);
      expect(c.description.length, 'description').toBeLessThanOrEqual(180);
      expect(c.corps).toMatch(/^<p class="chapo">/);
      const ids = [...c.corps.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size, 'identifiants uniques').toBe(ids.length);
      expect(ids.length, 'au moins deux sections').toBeGreaterThanOrEqual(2);
    });

    // Les articles programmés seront publiés sans relecture : leurs liens sont vérifiés dès maintenant,
    // en simulant le site tel qu'il sera à leur date de publication.
    it(`${c.slug} : liens internes valides à sa date de publication`, () => {
      const publiesAlors = conseilsPublies(c.publieLe, tous);
      const pagesAlors = new Set([
        ...Object.keys(toutesLesPages(racine)).map((n) => `${n}.html`).filter((p) => !p.startsWith('conseil-')),
        ...publiesAlors.map((p) => p.fichier),
      ]);
      const html = transformerPage(sourcePageConseil(c, publiesAlors), c.fichier);
      const casses: string[] = [];
      for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
        if (/^(https?:|mailto:|data:|\/src\/|#)/.test(href)) continue;
        const [chemin, ancre] = href.split('#');
        const cible = chemin.split('?')[0];
        if (!cible.endsWith('.html')) {
          if (!existsSync(resolve(racine, 'public', cible))) casses.push(href);
          continue;
        }
        if (!pagesAlors.has(cible)) casses.push(href);
        else if (ancre && !cible.startsWith('conseil-') && !new RegExp(`\\sid="${ancre}"`).test(transformerPage(sourcePage(racine, cible), cible))) casses.push(href);
      }
      expect(casses).toEqual([]);
    });
  }

  it('les articles programmés ne sont pas publiés avant leur date', () => {
    const futur = tous.filter((c) => c.publieLe > dateDuJour());
    const pages = pagesConseils();
    for (const c of futur) expect(pages.has(c.fichier), c.slug).toBe(false);
  });

  it("l'en-tête incomplet est refusé", () => {
    expect(() => lireConseil('x', '<!--\ntitre: T\n-->\n<p>x</p>')).toThrow(/manquant/);
  });
});
