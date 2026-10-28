/** Coups de cœur de l'accueil : produits illustrés des Top 10, liens internes seulement. */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sourcePage, transformerPage } from './site.ts';
import { pagesTop10 } from './top-10.ts';

const racine = resolve(import.meta.dirname, '..');

describe('accueil : bloc « Nos coups de cœur »', () => {
  const accueil = transformerPage(sourcePage(racine, 'index.html'), 'index.html');
  const bloc = accueil.match(/<section class="produits-accueil"[\s\S]*?<\/section>/)?.[0] ?? '';
  const cartes = [...bloc.matchAll(/<a class="produits-accueil__carte" href="([^"]+)">[\s\S]*?<\/a>/g)];

  it('est dans le HTML, avant le formulaire du calculateur, avec 4 à 8 produits illustrés', () => {
    expect(bloc).not.toBe('');
    expect(accueil.indexOf('class="produits-accueil"')).toBeLessThan(accueil.indexOf('id="formulaire"'));
    expect(cartes.length).toBeGreaterThanOrEqual(4);
    expect(cartes.length).toBeLessThanOrEqual(8);
    for (const [carte] of cartes) {
      const src = carte.match(/<img src="([^"]+)"/)?.[1];
      expect(src, carte).toBeDefined();
      expect(existsSync(resolve(racine, 'public', src!)), src).toBe(true);
    }
  });

  it('chaque carte mène à un produit d’une page Top 10 du site, et le bloc n’a aucun lien Amazon ni prix', () => {
    const pages = pagesTop10();
    for (const [, href] of cartes) {
      const [page, ancre] = href.split('#');
      expect(pages.has(page), href).toBe(true);
      expect(pages.get(page), href).toContain(`id="${ancre}"`);
    }
    expect(bloc).toContain('href="top-10.html"');
    expect(bloc).not.toMatch(/amazon|amzn/i);
    expect(bloc).not.toMatch(/€|\bprix\b|acheter|promo/i);
  });
});
