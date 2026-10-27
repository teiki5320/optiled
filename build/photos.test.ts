import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chargerPhotosLibres, DOSSIER_PHOTOS, legendePhoto, texteCreditPhoto } from './photos.ts';
import { PARCOURS, RUBRIQUES, sourcePage, transformerPage } from './site.ts';

const racine = resolve(import.meta.dirname, '..');
const photos = chargerPhotosLibres();
const LICENCES = /^(CC0|Domaine public|Public domain|CC BY( |-SA )\d\.\d|CC BY \d\.\d)/;

describe('photos libres de droits', () => {
  it('chaque photo a son fichier, son texte alternatif, son auteur, sa licence et sa page d’origine', () => {
    for (const [page, p] of Object.entries(photos)) {
      for (const l of [800, 1600]) expect(existsSync(resolve(DOSSIER_PHOTOS, `${page}-${l}.webp`)), `${page}-${l}`).toBe(true);
      expect(p.alt.length, page).toBeGreaterThan(10);
      if (p.source === 'carte') {
        expect(texteCreditPhoto(p)).toBe('Illustration : Kultiled');
        continue;
      }
      expect(['wikimedia', 'openverse']).toContain(p.source);
      expect(p.credit, page).toBeTruthy();
      expect(p.credit, page).not.toMatch(/unknown|inconnu|anonym/i);
      expect(p.licence, page).toMatch(LICENCES);
      expect(p.licence, page).not.toMatch(/NC|ND/);
      expect(p.page, page).toMatch(/^https:\/\//);
      expect(texteCreditPhoto(p)).toBe(`Photo : ${p.credit} · ${p.licence}`);
    }
  });

  it('jamais de cannabis ni de chanvre', () => {
    expect(JSON.stringify(photos)).not.toMatch(/cannabis|chanvre|hemp|marijuana|\bcbd\b|\bweed\b/i);
  });

  it('seuls les guides et parcours sans image en ont reçu une (les autres gardent la leur)', () => {
    const pages = [...RUBRIQUES.led.guides, ...RUBRIQUES.culture.guides].map((g) => g.fichier).concat(PARCOURS.map((p) => p.fichier));
    for (const page of Object.keys(photos)) expect(pages, page).toContain(`${page}.html`);
    for (const g of [...RUBRIQUES.led.guides, ...RUBRIQUES.culture.guides]) {
      if (g.photo) expect(Object.keys(photos), g.fichier).not.toContain(g.fichier.replace(/\.html$/, ''));
    }
  });

  it('jamais deux fois la même image sur le site', () => {
    const empreintes = new Map<string, string>();
    for (const f of readdirSync(DOSSIER_PHOTOS).filter((x) => x.endsWith('-1600.webp'))) {
      const h = createHash('sha1').update(readFileSync(resolve(DOSSIER_PHOTOS, f))).digest('hex');
      expect(empreintes.get(h), `${f} = ${empreintes.get(h)}`).toBeUndefined();
      empreintes.set(h, f);
    }
    const origines = Object.values(photos).map((p) => p.page).filter(Boolean);
    expect(new Set(origines).size).toBe(origines.length);
  });

  it('le crédit est affiché sous la couverture, avec le lien vers la page d’origine', () => {
    for (const [page, p] of Object.entries(photos)) {
      const html = transformerPage(sourcePage(racine, `${page}.html`), `${page}.html`);
      expect(legendePhoto(page)).toContain(p.credit);
      // Texte typographié au build (espaces insécables) : on compare sans elles.
      const credit = html.replace(/\u00a0|\u202f/g, ' ').match(/<figcaption class="credit-photo">[\s\S]*?<\/figcaption>/)?.[0] ?? '';
      expect(credit, page).toContain(texteCreditPhoto(p));
      if (p.page) expect(html, page).toContain(`href="${p.page.replace(/&/g, '&amp;')}" target="_blank" rel="noopener nofollow"`);
      expect(html, page).toContain(`alt="${p.alt.replace(/"/g, '&quot;')}"`);
    }
  });
});
