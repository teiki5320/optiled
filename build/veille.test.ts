import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chargerLegumes } from './fiches.ts';
import { AUTRES_NOMS, DE_CULTURE, entitesVeille, rendreBlocActus } from './veille.ts';
import { NAVIGATION, sourcePage, toutesLesPages, transformerPage } from './site.ts';

const racine = resolve(import.meta.dirname, '..');
const page = (f: string) => transformerPage(sourcePage(racine, f), f);

describe('veille/entites.json', () => {
  const entites = entitesVeille();
  it('toutes les cultures sauf le chanvre CBD', () => {
    const attendus = chargerLegumes().filter((l) => l.id !== 'chanvre-cbd').map((l) => `legume:${l.id}`);
    expect(entites.map((e) => e.tag)).toEqual(attendus);
    expect(JSON.stringify(entites)).not.toMatch(/chanvre|cbd|cannabis|hemp/i);
  });
  it('chaque culture a un nom et des autres noms (anglais compris)', () => {
    for (const e of entites) {
      expect(e.nom.length).toBeGreaterThan(1);
      expect(e.autres_noms.length, e.tag).toBeGreaterThan(0);
    }
    expect(AUTRES_NOMS.tomate).toContain('tomato');
    expect(AUTRES_NOMS['micro-pousses']).toContain('microgreens');
  });
  it('chaque culture a son titre « L’actu de … »', () => {
    for (const e of entites) expect(DE_CULTURE[e.tag.slice('legume:'.length)], e.tag).toBeTruthy();
  });
});

describe('blocs d’actus', () => {
  it('section cachée, remplie par le navigateur', () => {
    const html = rendreBlocActus(4);
    expect(html).toMatch(/<section class="actus" data-actus data-limite="4" [^>]*hidden>/);
    expect(html).toContain('href="actus.html"');
    expect(rendreBlocActus(3, 'legume:tomate')).toContain("L'actu de la tomate");
    expect(rendreBlocActus(3, 'legume:tomate')).toContain('data-tag="legume:tomate"');
  });
  it('jamais de bloc pour le chanvre CBD', () => {
    expect(rendreBlocActus(3, 'legume:chanvre-cbd')).toBe('');
    expect(page('legume-chanvre-cbd.html')).not.toContain('data-actus');
  });
  it('accueil : 4 actus sous le calculateur et ses résultats', () => {
    const html = page('index.html');
    expect(html).toContain('data-limite="4"');
    expect(html.indexOf('data-actus ')).toBeGreaterThan(html.indexOf('id="resultats"'));
    expect(html.indexOf('data-actus ')).toBeGreaterThan(html.indexOf('</form>'));
  });
  it('page Actus : 20 actus, dans la navigation et le pied de page', () => {
    expect(Object.keys(toutesLesPages(racine))).toContain('actus');
    const html = page('actus.html');
    expect(html).toContain('data-limite="20"');
    expect(html).toContain('data-actus-maj');
    expect(NAVIGATION.some((n) => n.href === 'actus.html')).toBe(true);
    expect(html.match(/<footer[\s\S]*<\/footer>/)?.[0]).toContain('href="actus.html"');
  });
  it('chaque fiche culture (sauf le chanvre) a son bloc de 3 actus', () => {
    for (const l of chargerLegumes().filter((x) => x.id !== 'chanvre-cbd')) {
      expect(page(`legume-${l.id}.html`), l.id).toContain(`data-limite="3" data-tag="legume:${l.id}"`);
    }
  });
  it('aucun lien Amazon ni prix dans les blocs d’actus et sur la page Actus', () => {
    const html = page('actus.html');
    const main = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? '';
    expect(main).not.toMatch(/amazon\.|amzn\.|€/i);
    for (const b of [rendreBlocActus(4), rendreBlocActus(3, 'legume:basilic')]) expect(b).not.toMatch(/amazon|€/i);
  });
});
