import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error script Node en JavaScript, sans déclaration de types
import { adressesDuSitemap, CLE, HOTE } from '../scripts/indexnow.mjs';
import { SITE_URL } from './site.ts';

describe('IndexNow', () => {
  it('clé de 32 caractères hexadécimaux, publiée seule dans public/<clé>.txt', () => {
    expect(CLE).toMatch(/^[0-9a-f]{32}$/);
    const fichier = resolve(import.meta.dirname, '../public', `${CLE}.txt`);
    expect(existsSync(fichier)).toBe(true);
    expect(readFileSync(fichier, 'utf8')).toBe(CLE);
  });
  it("même hôte que l'adresse publique du site", () => {
    expect(`https://${HOTE}/`).toBe(SITE_URL);
  });
  it('extrait les adresses du sitemap', () => {
    expect(adressesDuSitemap('<url><loc>https://a.fr/</loc><lastmod>2026-10-01</lastmod></url><url><loc> https://a.fr/b.html </loc></url>')).toEqual(['https://a.fr/', 'https://a.fr/b.html']);
  });
});
