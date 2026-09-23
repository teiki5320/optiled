import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pagesHtml, transformerPage } from './site';

const racine = resolve(__dirname, '..');
const pages = Object.keys(pagesHtml(racine)).map((n) => `${n}.html`);

/** HTML d'une page tel que publié (parties communes incluses). */
function contenu(page: string): string {
  return transformerPage(readFileSync(resolve(racine, page), 'utf8'), page);
}

const ids = (html: string) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

describe('liens internes', () => {
  for (const page of pages) {
    it(`${page} : tous les liens internes pointent vers une page et une ancre existantes`, () => {
      const html = contenu(page);
      const casses: string[] = [];
      for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
        if (/^(https?:|mailto:|data:|\/src\/)/.test(href)) continue;
        const [chemin, ancre] = href.split('#');
        const cible = (chemin.split('?')[0] || page);
        if (!pages.includes(cible)) {
          casses.push(href);
          continue;
        }
        if (ancre && !ids(contenu(cible)).has(ancre)) casses.push(href);
      }
      expect(casses).toEqual([]);
    });

    it(`${page} : titre, description et marqueurs communs`, () => {
      const html = readFileSync(resolve(racine, page), 'utf8');
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      expect(html).toContain('<!--#header-->');
      expect(html).toContain('<!--#footer-->');
      if (page !== '404.html') expect(html).toMatch(/<meta name="description" content="[^"]{30,}"/);
    });
  }
});
