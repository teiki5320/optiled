import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pagesHtml, transformerPage } from './site.ts';

const racine = resolve(import.meta.dirname, '..');
const pages = Object.keys(pagesHtml(racine)).map((n) => `${n}.html`);
/** Pages de redirection (ancienne adresse du calculateur) : pas de contenu propre. */
const estRedirection = (page: string) => readFileSync(resolve(racine, page), 'utf8').includes('http-equiv="refresh"');

/** HTML d'une page tel que publié (parties communes incluses). */
function contenu(page: string): string {
  return transformerPage(readFileSync(resolve(racine, page), 'utf8'), page);
}

const ids = (html: string) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

describe('images', () => {
  for (const page of pages) {
    it(`${page} : chaque image locale existe et a un texte alternatif`, () => {
      const html = contenu(page);
      for (const [balise] of html.matchAll(/<img\b[^>]*>/g)) {
        expect(balise, balise).toMatch(/\salt="/);
        const src = balise.match(/\ssrc="([^"]+)"/)?.[1] ?? '';
        if (src.startsWith('images/')) expect(existsSync(resolve(racine, 'public', src)), src).toBe(true);
        for (const [, f] of (balise.match(/srcset="([^"]+)"/)?.[1] ?? '').matchAll(/(images\/\S+)/g)) {
          expect(existsSync(resolve(racine, 'public', f)), f).toBe(true);
        }
      }
    });
  }
});

describe('liens internes', () => {
  for (const page of pages) {
    it(`${page} : tous les liens internes pointent vers une page et une ancre existantes`, () => {
      const html = contenu(page);
      const casses: string[] = [];
      for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
        if (/^(https?:|mailto:|data:|\/src\/)/.test(href)) continue;
        const [chemin, ancre] = href.split('#');
        const cible = (chemin.split('?')[0] || page);
        // Fichier statique (manifeste, icônes…) : il doit exister dans public/.
        if (!cible.endsWith('.html') && existsSync(resolve(racine, 'public', cible))) continue;
        if (!pages.includes(cible)) {
          casses.push(href);
          continue;
        }
        if (ancre && !ids(contenu(cible)).has(ancre)) casses.push(href);
      }
      expect(casses).toEqual([]);
    });

    if (estRedirection(page)) continue;
    it(`${page} : titre, description et marqueurs communs`, () => {
      const html = readFileSync(resolve(racine, page), 'utf8');
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      expect(html).toContain('<!--#header-->');
      expect(html).toContain('<!--#footer-->');
      if (page !== '404.html') expect(html).toMatch(/<meta name="description" content="[^"]{30,}"/);
    });
  }
});
