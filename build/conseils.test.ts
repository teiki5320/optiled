import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aLireAussi, type Conseil, conseilsPublies, dateDuJour, lireConseil, pagesConseils, sourcePageConseil, THEMES, tousLesConseils } from './conseils.ts';
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
      expect(`${c.titrePage} — OptiLED`.length, 'balise <title>').toBeLessThanOrEqual(70);
      expect(c.description.length, 'description').toBeGreaterThanOrEqual(70);
      expect(c.description.length, 'description').toBeLessThanOrEqual(160);
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

  it('titre court dans la balise <title>, titre complet dans le h1', () => {
    const c = lireConseil('x', '<!--\ntitre: Un titre complet et long\ntitre_court: Titre court\ndescription: D\npublie_le: 2026-01-05\ntheme: lumiere\n-->\n<p class="chapo">x</p>');
    const html = sourcePageConseil(c, [c]);
    expect(html).toContain('<title>Titre court — OptiLED</title>');
    expect(html).toContain('<h1>Un titre complet et long</h1>');
  });

  it('« À lire aussi » : même thème, les plus proches en date, avant comme après', () => {
    const faux = (slug: string, publieLe: string, theme: Conseil['theme']): Conseil => ({
      slug, fichier: `conseil-${slug}.html`, titre: slug, titrePage: slug, description: '', publieLe, theme, photo: '', corps: '',
    });
    const liste = [
      faux('a', '2026-01-05', 'lumiere'),
      faux('b', '2026-01-12', 'lumiere'),
      faux('c', '2026-01-19', 'lumiere'),
      faux('d', '2026-01-26', 'lumiere'),
      faux('e', '2026-02-02', 'lumiere'),
      faux('f', '2026-02-09', 'lumiere'),
      faux('g', '2026-01-20', 'eau'),
    ];
    const slugs = (c: Conseil) => aLireAussi(c, liste).map((v) => v.slug);
    // Article du milieu : voisins d'avant et d'après, pas les trois plus récents.
    expect(slugs(liste[2])).toEqual(['b', 'd', 'a']);
    // Dernier article : les précédents du même thème.
    expect(slugs(liste[5])).toEqual(['e', 'd', 'c']);
    // Thème peu fourni : complété par les autres thèmes, eux aussi par proximité.
    expect(slugs(liste[6])).toEqual(['c', 'd', 'b']);
  });

  it('les guides ne renvoient qu’à des articles déjà publiés', () => {
    const publies = new Set(conseilsPublies().map((c) => c.fichier));
    for (const page of Object.keys(toutesLesPages(racine)).map((n) => `${n}.html`)) {
      if (page.startsWith('conseil-')) continue;
      for (const [, cible] of sourcePage(racine, page).matchAll(/href="(conseil-[^"#?]+\.html)/g)) expect(publies.has(cible), `${page} → ${cible}`).toBe(true);
    }
  });

  it("l'en-tête incomplet est refusé", () => {
    expect(() => lireConseil('x', '<!--\ntitre: T\n-->\n<p>x</p>')).toThrow(/manquant/);
  });
});
