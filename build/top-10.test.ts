import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { header, sitemap, transformerPage } from './site.ts';
import { LAMPES } from '../src/lampes.ts';
import tentes from '../src/data/tentes.json' with { type: 'json' };
import { classementLampes, classementTentes, FICHIER_TOP_10, fichierSujet, lampeRetenue, pagesTop10, sujetsPublies } from './top-10.ts';

const racine = resolve(import.meta.dirname, '..');
const pages = pagesTop10();
const publiee = (f: string) => transformerPage(pages.get(f)!, f);

describe('Top 10 à onglets', () => {
  it('top-10.html ouvre le premier onglet, qui a sa propre page', () => {
    const premier = sujetsPublies()[0];
    expect(premier).toBeDefined();
    expect(pages.has(FICHIER_TOP_10)).toBe(true);
    for (const s of sujetsPublies()) expect(pages.has(fichierSujet(s)), s.slug).toBe(true);
    // La porte d'entrée désigne la page du premier onglet comme adresse canonique, et n'est pas dans le sitemap.
    expect(publiee(FICHIER_TOP_10)).toContain(`<link rel="canonical" href="https://www.kultiled.com/${fichierSujet(premier)}" />`);
  });

  it('exactement 10 produits numérotés de 1 à 10, avec un lien partenaire chacun', () => {
    for (const s of sujetsPublies()) {
      const html = publiee(fichierSujet(s));
      const rangs = [...html.matchAll(/<span class="top10__rang" aria-hidden="true">(\d+)<\/span>/g)].map((m) => Number(m[1]));
      expect(rangs, s.slug).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const liens = [...html.matchAll(/<a [^>]*amazon\.fr[^>]*>/g)].map(([l]) => l);
      expect(liens.length, s.slug).toBe(10);
      for (const l of liens) {
        expect(l).toContain('tag=kultiledfr-21');
        expect(l).toContain('rel="sponsored noopener"');
      }
      expect(html.match(/<small>Lien partenaire<\/small>/g)?.length).toBe(10);
      expect(html).toContain('En tant que Partenaire Amazon');
      expect(html.indexOf('En tant que Partenaire Amazon')).toBeLessThan(html.indexOf('amazon.fr/dp/'));
      expect(html).toContain('<h2>Comment choisir</h2>');
      expect(html.match(/<details>/g)?.length).toBe(3);
    }
  });

  it('onglet actif en surbrillance, page bien rangée dans le menu', () => {
    for (const s of sujetsPublies()) {
      expect(publiee(fichierSujet(s))).toContain(`<a href="${fichierSujet(s)}" aria-current="page">`);
      expect(header(fichierSujet(s))).toContain('<a href="top-10.html" aria-current="page">Top 10</a>');
    }
  });

  it('lampes : vraies lampes retenues, classées de la plus efficace à la moins efficace', () => {
    const top = classementLampes().map((p) => LAMPES.find((l) => l.id === p.id)!);
    expect(top).toHaveLength(10);
    for (const l of top) expect(lampeRetenue(l), l.id).toBe(true);
    const eff = top.map((l) => l.ppf! / l.puissance_w);
    for (let i = 1; i < eff.length; i++) expect(eff[i]).toBeLessThanOrEqual(eff[i - 1]);
  });

  it('tentes : les 10 de tentes.json, dans l’ordre du classement, sans aucune note enregistrée', () => {
    const top = classementTentes();
    expect(top.map((p) => p.id)).toEqual(tentes.tentes.slice(0, 10).map((t) => t.id));
    expect(new Set(tentes.tentes.map((t) => t.asin)).size).toBe(tentes.tentes.length);
    expect(JSON.stringify(tentes.tentes)).not.toMatch(/"(note|etoiles|avis|prix)"/);
    expect(sujetsPublies().map((s) => s.slug)).toContain('tentes-de-culture');
  });

  it('fichiers de produits : 10 produits par onglet, un même produit dans un seul onglet, aucune note enregistrée', () => {
    const dossier = resolve(racine, 'src/data/top-10');
    const asins: string[] = [];
    for (const f of readdirSync(dossier)) {
      const texte = readFileSync(resolve(dossier, f), 'utf8');
      expect(texte, f).not.toMatch(/"(note|etoiles|avis|prix)"/);
      const produits = (JSON.parse(texte) as { produits: { asin: string; illustration: string }[] }).produits;
      expect(produits.length, f).toBeGreaterThanOrEqual(10);
      for (const p of produits) {
        asins.push(p.asin);
        expect(existsSync(resolve(racine, 'public/images/top-10', f.replace('.json', ''), `${p.illustration}-800.webp`)), `${f} : ${p.illustration}`).toBe(true);
      }
    }
    asins.push(...tentes.tentes.map((t) => t.asin), ...LAMPES.map((l) => l.asin));
    expect(new Set(asins).size).toBe(asins.length);
  });

  it('ni prix, ni note, ni filtre, ni tri, ni comparateur, ni tableau ; jamais « testé par nous »', () => {
    for (const [f] of pages) {
      const html = publiee(f);
      expect(html, f).not.toMatch(/€|★|étoiles?|\d\s*avis\b/);
      expect(html, f).not.toMatch(/<table|<select|data-filtre|data-tri|data-comparateur|\+ Comparer/);
      expect(html, f).not.toMatch(/testée?s? par nous|nous avons testé/i);
    }
  });

  it('titres et descriptions dans les limites des moteurs de recherche', () => {
    for (const [f] of pages) {
      const html = publiee(f);
      expect(html.match(/<title>([^<]*)<\/title>/)![1].length, f).toBeLessThanOrEqual(60);
      const d = html.match(/<meta name="description" content="([^"]*)"/)![1].replace(/&#39;/g, "'");
      expect(d.length, f).toBeGreaterThanOrEqual(70);
      expect(d.length, f).toBeLessThanOrEqual(160);
    }
  });

  it('la page des meilleures lampes renvoie vers l’onglet des lampes', () => {
    expect(readFileSync(resolve(racine, 'meilleures-lampes.html'), 'utf8')).toContain('href="top-10-lampes-led-de-culture.html"');
    expect(sitemap(['top-10-lampes-led-de-culture.html'])).toContain('top-10-lampes-led-de-culture.html');
  });
});
