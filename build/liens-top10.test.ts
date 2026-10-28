/** Liens vers les Top 10 depuis le contenu, encadrés produits des conseils et des fiches. */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conseilsPublies, DOSSIER_CONSEILS, MATERIEL_CONSEILS, PRODUITS_PAR_ENCADRE } from './conseils.ts';
import { footer, sourcePage, transformerPage } from './site.ts';
import { fichierSujet, pagesTop10, SUJETS, sujetsPublies } from './top-10.ts';
import { topDeLActu } from './articles.ts';
import { chargerLegumes } from './fiches.ts';
import { TOP10_LISTE } from '../src/liste.ts';
import { codeSuivi } from '../src/suivi-amazon.ts';

const racine = resolve(import.meta.dirname, '..');
const rendue = (p: string) => transformerPage(sourcePage(racine, p), p);
const liensAmazon = (html: string) => html.match(/href="https:\/\/www\.amazon\.fr\/dp\/[^"]+"/g) ?? [];

describe('conseils → Top 10', () => {
  it('table : chaque conseil existe, chaque Top 10 et chaque produit nommé aussi', () => {
    for (const [slug, choix] of Object.entries(MATERIEL_CONSEILS)) {
      expect(existsSync(resolve(DOSSIER_CONSEILS, `${slug}.html`)), slug).toBe(true);
      const sujet = SUJETS.find((s) => s.slug === choix.top);
      expect(sujet, slug).toBeDefined();
      for (const id of choix.produits ?? []) expect(sujet!.produits().some((p) => p.id === id), `${slug} : ${id} (disponible et dans le Top 10)`).toBe(true);
    }
    expect(Object.keys(MATERIEL_CONSEILS).length).toBeGreaterThanOrEqual(15);
  });

  it('chaque conseil publié de la table renvoie vers son Top 10, avec au plus 2 produits (code « conseil »)', () => {
    const publies = conseilsPublies().filter((c) => c.slug in MATERIEL_CONSEILS);
    expect(publies.length).toBeGreaterThanOrEqual(10);
    for (const c of publies) {
      const html = rendue(c.fichier);
      const sujet = sujetsPublies().find((s) => s.slug === MATERIEL_CONSEILS[c.slug].top)!;
      expect(html, c.slug).toContain(`<aside class="materiel" aria-label="Le matériel pour ça">`);
      expect(html, c.slug).toContain(`href="${fichierSujet(sujet)}"`);
      const liens = liensAmazon(html);
      expect(liens.length, c.slug).toBeLessThanOrEqual(PRODUITS_PAR_ENCADRE);
      for (const l of liens) expect(l, c.slug).toContain(`tag=${codeSuivi('conseil')}`);
      // L'encadré n'est jamais suivi directement d'une annonce.
      const fin = html.indexOf('</aside>', html.indexOf('class="materiel"'));
      expect(html.slice(fin, fin + 1500), c.slug).not.toContain('class="annonce"');
    }
  }, 120_000);
});

describe('fiches cultures : lampe conseillée juste après « Besoins en lumière »', () => {
  it('encadré avant l’exemple, lien vers la section complète, 3 produits au plus', () => {
    for (const l of chargerLegumes().filter((x) => !x.avertissement)) {
      const html = rendue(`legume-${l.id}.html`);
      const encadre = html.indexOf('class="materiel materiel--lampe"');
      expect(encadre, l.id).toBeGreaterThan(html.indexOf('id="lumiere"'));
      expect(encadre, l.id).toBeLessThan(html.indexOf('id="exemple"'));
      expect(liensAmazon(html).length, l.id).toBeLessThanOrEqual(3);
      expect(html, l.id).toContain('href="top-10-lampes-led-de-culture.html"');
    }
  }, 120_000);
});

describe('liens vers les Top 10 depuis les pages', () => {
  const pages = new Set(pagesTop10().keys());
  it('liste d’achat du calculateur : des pages Top 10 qui existent', () => {
    for (const t of Object.values(TOP10_LISTE)) expect(pages.has(t.href), t.href).toBe(true);
  });
  it('Tente, Débuter, Légumes, Conseils, accueil et pied de page', () => {
    for (const p of ['tente.html', 'debuter.html', 'legumes.html', 'conseils.html']) expect(rendue(p), p).toMatch(/class="tops-lies"[\s\S]*?href="top-10-[a-z-]+\.html"/);
    const accueil = rendue('index.html');
    const bloc = accueil.match(/<nav class="accueil__tops"[\s\S]*?<\/nav>/)?.[0] ?? '';
    expect(bloc).toContain('href="top-10.html"');
    expect(bloc).not.toMatch(/amazon/i);
    // Le bloc est dans le haut de l'accueil, avant le formulaire du calculateur.
    expect(accueil.indexOf('accueil__tops')).toBeLessThan(accueil.indexOf('id="formulaire"'));
    expect(footer()).toContain('href="top-10.html"');
  }, 60_000);
});

describe('actus → Top 10 lié au sujet', () => {
  it('par mot-clé du titre ou du chapô, sinon rien', () => {
    expect(topDeLActu({ titre: 'Un potager hydroponique dans une cuisine', chapo: '' })?.slug).toBe('kits-hydroponiques');
    expect(topDeLActu({ titre: 'Des LED plus efficaces pour les serres', chapo: '' })?.slug).toBe('lampes-led-de-culture');
    expect(topDeLActu({ titre: 'Un radis qui se cueille sur la tige', chapo: 'Une curiosité botanique.' })).toBeUndefined();
  });
});

describe('Top 10 complets', () => {
  it('tous les onglets ont 10 produits disponibles (sinon la page disparaîtrait et ses liens casseraient)', () => {
    expect(sujetsPublies().map((s) => s.slug)).toEqual(SUJETS.map((s) => s.slug));
  });
});
