import { describe, expect, it } from 'vitest';
import { articleValide, autresSources, fichesLiees, idDepuisRecherche, minutesLecture, nomDomaine, type ArticleVeille } from './article.ts';
import { lienCarte, type Actu } from './veille.ts';

const ID = 'a'.repeat(40);
const image = { url: 'https://teiki5320.github.io/veille/images/kultiled/x.webp', source: 'wikimedia' as const, credit: 'Jane Doe', licence: 'CC BY-SA 4.0', page: null, alt: 'Des radis', largeur: 1600, hauteur: 900 };
const article = (x: Partial<ArticleVeille> = {}): ArticleVeille => ({
  version: 1,
  site: 'kultiled',
  id: ID,
  slug: 'un-radis-a2fa10',
  titre: 'Un radis qui se cueille sur la tige',
  chapo: 'Le radis serpent se récolte sur la tige : une curiosité facile à cultiver.',
  blocs: [{ intertitre: null, paragraphes: ['Un paragraphe.'] }, { intertitre: 'Titre', paragraphes: ['Un autre paragraphe.'] }],
  mots: 320,
  lecture_min: 2,
  source_nom: 'Futura',
  source_url: 'https://www.futura-sciences.com/x',
  publie_le: '2026-10-25T10:00:00Z',
  redige_le: '2026-10-28T00:30:00Z',
  image,
  ...x,
});
const actu = (x: Partial<Actu> = {}): Actu => ({
  id: ID,
  titre: 'Un radis',
  resume: 'Résumé.',
  source_nom: 'Futura',
  source_url: 'https://www.futura-sciences.com/x',
  publie_le: '2026-10-25T10:00:00Z',
  image,
  ...x,
});

describe('choix du lien d’une carte d’actu', () => {
  it('page construite actus/<slug>/ si elle existe', () => {
    expect(lienCarte(actu({ slug: 'un-radis', article_url: 'https://x' }), new Set(['un-radis']), '')).toEqual({ href: 'actus/un-radis/', interne: true });
    expect(lienCarte(actu({ slug: 'un-radis' }), new Set(['un-radis']), 'https://www.kultiled.com/')).toEqual({ href: 'https://www.kultiled.com/actus/un-radis/', interne: true });
  });
  it('sinon page de secours si la veille a écrit l’article', () => {
    expect(lienCarte(actu({ slug: 'un-radis', article_url: 'https://x' }), new Set(), '')).toEqual({ href: `actus/article/?id=${ID}`, interne: true });
  });
  it('sinon la source, comme avant', () => {
    expect(lienCarte(actu(), new Set(['un-radis']), '')).toEqual({ href: 'https://www.futura-sciences.com/x', interne: false });
    expect(lienCarte(actu({ slug: 'un-radis' }), new Set(), '')).toEqual({ href: 'https://www.futura-sciences.com/x', interne: false });
  });
  it('jamais un slug douteux ni le slug réservé de la page de secours', () => {
    expect(lienCarte(actu({ slug: '../../x' }), new Set(['../../x']), '').interne).toBe(false);
    expect(lienCarte(actu({ slug: 'article' }), new Set(['article']), '').interne).toBe(false);
    expect(lienCarte(actu({ id: 'pas-un-id', article_url: 'https://x' }), new Set(), '').interne).toBe(false);
  });
});

describe('page de secours', () => {
  it('lit un identifiant propre dans l’adresse', () => {
    expect(idDepuisRecherche(`?id=${ID}`)).toBe(ID);
    expect(idDepuisRecherche(`?id=${ID.toUpperCase()}`)).toBe(ID);
    expect(idDepuisRecherche('?id=../../secret')).toBeNull();
    expect(idDepuisRecherche('')).toBeNull();
  });
  it('accepte un article complet, refuse un article abîmé ou dangereux', () => {
    expect(articleValide(article())).toBe(true);
    expect(articleValide(article(), ID)).toBe(true);
    expect(articleValide(article(), 'b'.repeat(40))).toBe(false);
    expect(articleValide(article({ source_url: 'javascript:alert(1)' }))).toBe(false);
    expect(articleValide(article({ source_url: 'https://amzn.to/x' }))).toBe(false);
    expect(articleValide(article({ image: { ...image, url: 'https://ailleurs.fr/x.webp' } }))).toBe(false);
    expect(articleValide(article({ blocs: [] }))).toBe(false);
    expect(articleValide(article({ blocs: [{ paragraphes: [] }] }))).toBe(false);
    expect(articleValide(article({ chapo: 'Du cannabis sous LED, une culture comme une autre selon certains.' }))).toBe(false);
    expect(articleValide(article({ slug: 'Pas Un Slug' }))).toBe(false);
    expect(articleValide(null)).toBe(false);
  });
  it('autres sources sûres et nom court', () => {
    const a = article({ autres_sources: ['https://www.example.org/x', 'https://www.amazon.fr/dp/B0', 'ftp://x', 'https://www.futura-sciences.com/x'] });
    expect(autresSources(a)).toEqual(['https://www.example.org/x']);
    expect(nomDomaine('https://www.example.org/x')).toBe('example.org');
  });
  it('durée de lecture et fiches liées (tags inconnus ignorés)', () => {
    expect(minutesLecture({ lecture_min: 2, mots: 400 })).toBe(2);
    expect(minutesLecture({ lecture_min: 0, mots: 400 })).toBe(2);
    const fiches = { 'legume:radis': { href: 'legume-radis.html', nom: 'Radis' } };
    expect(fichesLiees(['legume:radis', 'legume:inconnu', 'legume:radis', 'toString'], fiches)).toEqual([{ href: 'legume-radis.html', nom: 'Radis' }]);
  });
});
