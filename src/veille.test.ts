import { describe, expect, it } from 'vitest';
import { actuValide, ageActu, filtrerParTag, imageCarree, nettoyerFichier, texteCredit, URL_VEILLE, type Actu } from './veille.ts';

const actu = (x: Partial<Actu> = {}): Actu => ({
  id: 'a'.repeat(40),
  titre: 'Une ferme verticale sous LED',
  resume: 'Un résumé réécrit de deux phrases. Avec sa source.',
  source_nom: 'Phys.org',
  source_url: 'https://phys.org/news/x.html',
  publie_le: '2026-10-26T12:00:00Z',
  image: { url: 'https://teiki5320.github.io/veille/images/kultiled/x.webp', source: 'wikimedia', credit: 'Jane Doe', licence: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:X.jpg', alt: 'Des laitues sous LED', largeur: 1600, hauteur: 900 },
  ...x,
});

describe('veille (navigateur)', () => {
  it('lit le fichier de Kultiled', () => {
    expect(URL_VEILLE).toBe('https://teiki5320.github.io/veille/actus/kultiled.json');
  });
  it('écarte les actus incomplètes, les liens Amazon, les images d’ailleurs et le cannabis', () => {
    expect(actuValide(actu())).toBe(true);
    expect(actuValide(actu({ source_url: 'javascript:alert(1)' }))).toBe(false);
    expect(actuValide(actu({ source_url: 'https://www.amazon.fr/dp/B0' }))).toBe(false);
    expect(actuValide(actu({ image: { ...actu().image, url: 'https://exemple.com/x.webp' } }))).toBe(false);
    expect(actuValide(actu({ titre: 'Le cannabis en intérieur' }))).toBe(false);
    expect(actuValide(actu({ tags: ['legume:chanvre-cbd'] }))).toBe(false);
    expect(actuValide(null)).toBe(false);
  });
  it('trie de la plus récente à la plus ancienne et tolère un fichier abîmé', () => {
    const f = nettoyerFichier({ version: 3, site: 'kultiled', genere_le: '2026-10-27T08:00:00Z', actus: [actu({ id: '1', publie_le: '2026-10-20T00:00:00Z' }), actu({ id: '2' }), { n: 1 }] });
    expect(f?.actus.map((a) => a.id)).toEqual(['2', '1']);
    expect(nettoyerFichier('n’importe quoi')).toBeNull();
    expect(nettoyerFichier({ actus: 'non' })).toBeNull();
  });
  it('filtre par culture', () => {
    const liste = [actu({ id: '1', tags: ['legume:tomate'] }), actu({ id: '2' })];
    expect(filtrerParTag(liste, 'legume:tomate').map((a) => a.id)).toEqual(['1']);
    expect(filtrerParTag(liste)).toHaveLength(2);
  });
  it('vignette carrée et crédit', () => {
    expect(imageCarree(actu().image)).toMatch(/x-carre\.webp$/);
    const carte = { ...actu().image, url: 'https://teiki5320.github.io/veille/cartes/kultiled/x.svg', source: 'carte' as const, licence: null, page: null };
    expect(imageCarree(carte)).toBe(carte.url);
    expect(texteCredit(actu().image)).toBe('Photo : Jane Doe · CC BY-SA 4.0');
    expect(texteCredit(carte)).toBe('Illustration : Kultiled');
  });
  it('âge lisible', () => {
    const t = Date.parse('2026-10-27T12:00:00Z');
    expect(ageActu('2026-10-27T09:00:00Z', t)).toBe('il y a 3 h');
    expect(ageActu('2026-10-26T09:00:00Z', t)).toBe('hier');
    expect(ageActu('2026-10-24T09:00:00Z', t)).toBe('il y a 3 jours');
    expect(ageActu('pas une date', t)).toBe('');
  });
});
