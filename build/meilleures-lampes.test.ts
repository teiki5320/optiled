import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LAMPES, LAMPES_VERIFIEES_LE } from '../src/lampes.ts';
import { moisAnnee } from '../src/budget.ts';
import { BESOINS, choisir, FICHES, FICHIER_MEILLEURES_LAMPES, lampeRetenue, rendreMeilleuresLampes, selection } from './meilleures-lampes.ts';
import { header, footer, sitemap, transformerPage } from './site.ts';

const racine = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(racine, FICHIER_MEILLEURES_LAMPES), 'utf8');
const page = transformerPage(source, FICHIER_MEILLEURES_LAMPES);
const mois = moisAnnee(LAMPES_VERIFIEES_LE);

describe('page « Les meilleures lampes LED de culture »', () => {
  it('mois et année tirés de verifie_le : titre, h1, dateModified', () => {
    expect(page).toContain(`<title>Meilleures lampes LED de culture (${mois}) — Kultiled</title>`);
    expect(page).toContain('<h1>Les meilleures lampes LED de culture</h1>');
    expect(page).toContain(`Notre sélection de ${mois}`);
    expect(page).toContain(`"dateModified":"${LAMPES_VERIFIEES_LE}"`);
    expect(page).toContain(`<time datetime="${LAMPES_VERIFIEES_LE}">`);
    expect(page).not.toMatch(/<!--#[a-z-]+-->/);
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

  it('liens Amazon sponsorisés avec l’identifiant, « Lien partenaire » à côté, ni prix ni note', () => {
    const html = rendreMeilleuresLampes();
    const liens = [...html.matchAll(/<a [^>]*amazon\.fr[^>]*>/g)].map(([l]) => l);
    expect(liens.length).toBeGreaterThan(0);
    for (const lien of liens) {
      expect(lien).toContain('rel="sponsored noopener"');
      expect(lien).toContain('tag=kultiledfr-21');
    }
    expect(html.match(/<span class="achat">/g)?.length).toBe(liens.length);
    for (const [achat] of html.matchAll(/<span class="achat">[\s\S]*?<\/span>/g)) expect(achat).toContain('<small>Lien partenaire</small>');
    expect(html).not.toMatch(/€/);
    expect(html).not.toContain('★');
    expect(html).not.toMatch(/\d\s*avis\b/);
    expect(html).not.toMatch(/étoiles?/);
    expect(page).not.toMatch(/testée?s? par nous|nous avons testé/i);
  });

  it('sélection : seulement des lampes disponibles avec un chiffre de lumière, toutes présentes', () => {
    const ids = selection().map((e) => e.lampe.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of selection()) expect(lampeRetenue(e.lampe), e.lampe.id).toBe(true);
    // Toute lampe retenue a sa fiche : aucune n'est oubliée en silence.
    for (const l of LAMPES.filter(lampeRetenue)) expect(FICHES.map((f) => f.id), l.id).toContain(l.id);
    for (const l of LAMPES.filter((x) => !lampeRetenue(x))) expect(page, l.id).not.toContain(`id="${l.id}"`);
    for (const e of selection()) expect(page).toContain(`id="${e.lampe.id}"`);
  });

  it('chaque choix par installation renvoie vers une lampe de la sélection', () => {
    const ids = new Set(selection().map((e) => e.lampe.id));
    for (const b of BESOINS) for (const p of choisir(b).choix) expect(ids.has(p.lampe.id), `${b.id} : ${p.lampe.id}`).toBe(true);
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
