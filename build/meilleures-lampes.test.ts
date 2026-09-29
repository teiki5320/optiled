import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LAMPES, LAMPES_VERIFIEES_LE } from '../src/lampes.ts';
import { moisAnnee } from '../src/budget.ts';
import { BESOINS, choisir, FICHIER_MEILLEURES_LAMPES, rendreMeilleuresLampes } from './meilleures-lampes.ts';
import { header, footer, sitemap, transformerPage } from './site.ts';

const racine = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(racine, FICHIER_MEILLEURES_LAMPES), 'utf8');
const page = transformerPage(source, FICHIER_MEILLEURES_LAMPES);
const mois = moisAnnee(LAMPES_VERIFIEES_LE);

describe('page « Meilleures lampes »', () => {
  it('mois et année tirés de verifie_le : titre, h1, dateModified', () => {
    expect(page).toContain(`<title>Meilleures lampes LED horticoles (${mois}) — OptiLED</title>`);
    expect(page).toMatch(new RegExp(`<h1>Meilleures lampes LED horticoles \\(${mois}\\)</h1>`));
    expect(page).toContain(`"dateModified":"${LAMPES_VERIFIEES_LE}"`);
    expect(page).toContain(`<time datetime="${LAMPES_VERIFIEES_LE}">`);
    expect(page).not.toMatch(/<!--#(mois-lampes|lampes-verifiees-le|meilleures-lampes|mention-affiliation)-->/);
  });

  it('divulgation d’affiliation en haut de page, avant le premier lien Amazon', () => {
    const divulgation = page.indexOf('Liens sponsorisés.');
    expect(divulgation).toBeGreaterThan(0);
    expect(divulgation).toBeLessThan(page.indexOf('amazon.fr/dp/'));
    expect(page).toContain('En tant que Partenaire Amazon');
  });

  it('un choix recommandé et une alternative par besoin, jamais une lampe sans PPF ni indisponible', () => {
    for (const b of BESOINS) {
      const c = choisir(b);
      expect(c.choix.length, b.id).toBeGreaterThanOrEqual(1);
      expect(c.choix.length, b.id).toBeLessThanOrEqual(2);
      for (const p of c.choix) {
        expect(p.lampe.ppf, `${b.id} : ${p.lampe.id}`).not.toBeNull();
        expect(p.lampe.disponible, `${b.id} : ${p.lampe.id}`).not.toBe(false);
        expect(p.ppfTotal).toBeGreaterThanOrEqual(c.ppfNecessaire);
      }
      expect(page).toContain(`id="${b.id}"`);
    }
  });

  it('liens Amazon sponsorisés, ni prix par produit ni note', () => {
    const html = rendreMeilleuresLampes();
    for (const [lien] of html.matchAll(/<a [^>]*amazon\.fr[^>]*>/g)) expect(lien).toContain('rel="sponsored noopener"');
    // Aucun montant dans les cartes des lampes (les fourchettes par gamme sont dans une section à part, sans lien).
    for (const [carte] of html.matchAll(/<div class="choix-lampe">[\s\S]*?<\/div>/g)) expect(carte).not.toMatch(/€/);
    expect(html).not.toContain('★');
    expect(html).not.toMatch(/\d\s*avis\b/);
    expect(html).not.toMatch(/étoiles?/);
  });

  it('renvoie au comparatif et au calculateur', () => {
    expect(page).toContain('href="led-comparer.html"');
    expect(page).toContain('href="index.html#calculateur"');
  });

  it('dans le menu Lampes, le pied de page, le sitemap et les pages liées', () => {
    expect(header(FICHIER_MEILLEURES_LAMPES)).toContain('<a href="lampes.html" aria-current="page">Lampes</a>');
    expect(footer()).toContain(`href="${FICHIER_MEILLEURES_LAMPES}"`);
    expect(sitemap([FICHIER_MEILLEURES_LAMPES])).toContain(FICHIER_MEILLEURES_LAMPES);
    for (const f of ['lampes.html', 'tente.html', 'debuter.html', 'led-choisir.html']) {
      expect(readFileSync(resolve(racine, f), 'utf8'), f).toContain(`href="${FICHIER_MEILLEURES_LAMPES}`);
    }
  });

  it('toutes les lampes recommandées existent dans la sélection', () => {
    const ids = new Set(LAMPES.map((l) => l.id));
    for (const b of BESOINS) for (const p of choisir(b).choix) expect(ids.has(p.lampe.id)).toBe(true);
  });
});
