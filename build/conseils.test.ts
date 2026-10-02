import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aLireAussi, type Conseil, conseilsPublies, dateDuJour, lireConseil, pagesConseils, rendreListeConseils, sourcePageConseil, THEMES, tousLesConseils } from './conseils.ts';
import { chargerLegumes } from './fiches.ts';
import { FICHIER_FLUX, sourcePage, toutesLesPages, transformerPage } from './site.ts';

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
      expect(`${c.titrePage} — OptiLED`.length, 'balise <title>').toBeLessThanOrEqual(60);
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
          if (cible !== FICHIER_FLUX && !existsSync(resolve(racine, 'public', cible))) casses.push(href);
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
      slug, fichier: `conseil-${slug}.html`, titre: slug, titrePage: slug, description: '', publieLe, theme, photo: '', cultures: [], corps: '',
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

  it('apostrophes échappées une seule fois dans les balises de partage et le JSON-LD', () => {
    const c = tous.find((x) => x.slug === 'heures-de-lumiere-par-jour')!;
    expect(c.titre).toContain("'");
    const html = transformerPage(sourcePageConseil(c, tous), c.fichier);
    const partage = [...html.matchAll(/<meta (?:property="og:|name="twitter:)[^>]*>/g)].map((m) => m[0]).join('\n');
    const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
    expect(jsonLd).not.toBe('');
    for (const bloc of [partage, jsonLd]) {
      expect(bloc).not.toContain('&amp;#');
      expect(bloc).not.toContain('&#39;');
    }
    expect(partage).toContain(`<meta property="og:title" content="${c.titrePage} — OptiLED" />`);
    const donnees = jsonLd.split('\n').map((j) => JSON.parse(j));
    expect(donnees.find((d) => d['@type'] === 'Article').headline).toBe(c.titre);
    expect(donnees.find((d) => d['@type'] === 'Article').description).toBe(c.description);
    expect(donnees.find((d) => d['@type'] === 'BreadcrumbList').itemListElement[2].name).toBe(c.titre);
  });

  it('liste : trois premières photos chargées d’emblée, priorité réseau pour la première', () => {
    const images = [...rendreListeConseils('2999-01-01').matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    expect(images.length).toBeGreaterThanOrEqual(4);
    expect(images.slice(0, 3).every((img) => img.includes('loading="eager"'))).toBe(true);
    expect(images.slice(3).every((img) => img.includes('loading="lazy"'))).toBe(true);
    expect(images.filter((img) => img.includes('fetchpriority="high"'))).toHaveLength(1);
    expect(images[0]).toContain('fetchpriority="high"');
  });

  it('champ « cultures » : identifiants de legumes.json, liens vers les fiches sous l’article', () => {
    const ids = new Set(chargerLegumes().map((l) => l.id));
    for (const c of tous) for (const id of c.cultures) expect(ids.has(id), `${c.slug} → ${id}`).toBe(true);
    const tomates = tous.find((c) => c.slug === 'tomates-en-appartement')!;
    expect(tomates.cultures).toEqual(['tomate', 'tomate-naine']);
    const html = sourcePageConseil(tomates, tous);
    expect(html).toContain('<a class="bouton-lien" href="legume-tomate.html">Fiche : Tomate</a>');
    expect(html).toContain('href="legume-tomate-naine.html">Fiche : Tomate naine (micro-tomate)</a>');
    expect(html.indexOf('class="fiches-liees"')).toBeLessThan(html.indexOf('</article>'));
    // Sans champ : pas de bloc.
    const sans = lireConseil('x', '<!--\ntitre: T\ndescription: D\npublie_le: 2026-01-05\ntheme: lumiere\n-->\n<p class="chapo">x</p>');
    expect(sans.cultures).toEqual([]);
    expect(sourcePageConseil(sans, [sans])).not.toContain('fiches-liees');
  });

  it("l'en-tête incomplet est refusé", () => {
    expect(() => lireConseil('x', '<!--\ntitre: T\n-->\n<p>x</p>')).toThrow(/manquant/);
  });
});
