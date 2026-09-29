import { describe, expect, it } from 'vitest';
import { chargerLegumes, DIFFICULTES, echapper, rendreFiche, rendreFiches } from './fiches.ts';
import { tousLesConseils } from './conseils.ts';

describe('fiches légumes', () => {
  const legumes = chargerLegumes();

  it('une fiche par légume, avec ancre', () => {
    const html = rendreFiches();
    for (const l of legumes) expect(html).toContain(`id="${l.id}"`);
  });

  it('affiche le DLI calculé et le lien vers le calculateur', () => {
    const html = rendreFiche(legumes.find((l) => l.id === 'laitue')!);
    expect(html).toContain("14,4");
    expect(html).toContain('index.html?legume=laitue#calculateur');
  });

  it('bloc floraison intitulé selon la culture, absent pour les feuilles', () => {
    const fiche = (id: string) => rendreFiche(legumes.find((l) => l.id === id)!);
    expect(fiche('tomate')).toContain('<h4>Lumière — floraison et fructification</h4>');
    // Safran et chanvre fleurissent sans donner de fruits.
    expect(fiche('safran')).toContain('<h4>Lumière — floraison</h4>');
    expect(fiche('safran')).not.toContain('fructification');
    expect(fiche('laitue')).not.toMatch(/Lumière — floraison/);
  });

  it('chaque culture a une difficulté justifiée', () => {
    for (const l of legumes) {
      expect(l.difficulte, l.id).toBeDefined();
      expect(Object.keys(DIFFICULTES), l.id).toContain(l.difficulte!.valeur);
      expect(l.difficulte!.source.length, l.id).toBeGreaterThan(40);
    }
  });

  it('cultures faciles = celles de l’article « légumes faciles pour débuter »', () => {
    const article = tousLesConseils().find((c) => c.slug === 'legumes-faciles-debutant')!;
    const faciles = legumes.filter((l) => l.difficulte?.valeur === 'facile').map((l) => l.id);
    expect([...faciles].sort()).toEqual([...article.cultures].sort());
    // Étape suivante conseillée par l'article : ni facile ni exigeant.
    for (const id of ['tomate-naine', 'fraise']) expect(legumes.find((l) => l.id === id)!.difficulte!.valeur, id).toBe('intermediaire');
  });

  it('carte : badge de difficulté et délai de récolte mis en évidence', () => {
    const html = rendreFiche(legumes.find((l) => l.id === 'basilic')!);
    expect(html).toContain('data-difficulte="facile"');
    expect(html).toContain('<span class="badge-difficulte badge-difficulte--facile">Facile</span>');
    expect(html).toContain('Récolte : <strong>40–60 jours après semis</strong>');
    expect(rendreFiche(legumes.find((l) => l.id === 'chanvre-cbd')!)).toContain('90–130 jours jusqu');
  });

  it('filtre « Pour débuter » avant les familles, avec retour à toutes les cultures', () => {
    const html = rendreFiches();
    expect(html.indexOf('id="pour-debuter"')).toBeLessThan(html.indexOf('class="fiches-famille'));
    expect(html).toContain('href="#pour-debuter"');
    expect(html).toContain('id="filtres"');
    expect(html).toContain('href="#filtres"');
  });

  it('échappe le HTML', () => {
    expect(echapper('<a & "b">')).toBe('&#60;a &#38; &#34;b&#34;&#62;');
  });
});
