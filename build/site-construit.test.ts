/**
 * Contrôles sur toutes les pages rendues (les mêmes que scripts/verifier-site.mjs sur dist/ après le build).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error module JavaScript sans types
import { MOTS_INTERDITS, problemesTexte, tagsConnus } from '../scripts/verifier-site.mjs';
import { entitesVeille } from './veille.ts';
import { fluxRss, sourcePage, toutesLesPages, transformerPage } from './site.ts';
import { CODES_SUIVI } from '../src/suivi-amazon.ts';

const racine = resolve(import.meta.dirname, '..');
const pages = Object.keys(toutesLesPages(racine)).map((n) => `${n}.html`);
const cache = new Map<string, string>();
const rendue = (p: string) => cache.get(p) ?? (cache.set(p, transformerPage(sourcePage(racine, p), p)), cache.get(p)!);

describe('site construit', () => {
  it('ni plante interdite ni drogue : pages, flux, liste des cultures, scripts et styles', () => {
    const textes: [string, string][] = [
      ...pages.map((p): [string, string] => [p, rendue(p)]),
      ['flux', fluxRss()],
      ['entites', JSON.stringify(entitesVeille())],
      ...readdirSync(resolve(racine, 'src'))
        .filter((f) => /\.(ts|css)$/.test(f) && !f.endsWith('.test.ts'))
        .map((f): [string, string] => [f, readFileSync(resolve(racine, 'src', f), 'utf8')]),
    ];
    for (const [nom, texte] of textes) expect(texte.match(MOTS_INTERDITS)?.[0], nom).toBeUndefined();
    expect(pages.some((p) => /legume-ch/.test(p))).toBe(false);
  }, 120_000);

  it('les mots interdits sont bien repérés', () => {
    for (const mot of ['Cannabis', 'CBD', 'chanvre', 'THC']) expect(MOTS_INTERDITS.test(`du ${mot} ici`), mot).toBe(true);
    expect(MOTS_INTERDITS.test('une fourchette, un abc')).toBe(false);
  });

  it('aucun lien interne vers une page qui n’existe plus', () => {
    for (const p of pages) expect(rendue(p), p).not.toMatch(/legume-ch[a]nvre/);
  }, 120_000);

  it('aucun montant en euros près d’un produit Amazon, aucun « prix relevé sur Amazon », chaque lien Amazon a un code de la table', () => {
    const tags = tagsConnus(racine);
    expect([...tags].sort()).toEqual([...new Set(Object.values(CODES_SUIVI))].sort());
    for (const p of pages) expect(problemesTexte(rendue(p), p, tags), p).toEqual([]);
  }, 120_000);

  it('le contrôle repère bien un prix près d’un bouton Amazon et un code inconnu', () => {
    const html = '<li><p>Environ 45 €</p><a href="https://www.amazon.fr/dp/B000000000?tag=autre-21">Voir sur Amazon</a></li>';
    const p = problemesTexte(html, 'x.html', ['kultiledfr-21']);
    expect(p.some((x: string) => x.includes('euros'))).toBe(true);
    expect(p.some((x: string) => x.includes('code de suivi'))).toBe(true);
  });
});
