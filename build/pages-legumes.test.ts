import { describe, expect, it } from 'vitest';
import { chargerLegumes } from './fiches.ts';
import { tousLesConseils } from './conseils.ts';
import { COEF_UTILISATION as COEF_GUIDES, EFFICACITE as EFFICACITE_GUIDES } from './guides-achat.ts';
import { COEF_UTILISATION, descriptionLegume, EFFICACITE, exempleCalcul, fichierLegume, lienCalculateur, pagesLegumes, stadeLePlusExigeant, surfaceExemple } from './pages-legumes.ts';
import { transformerPage } from './site.ts';

const legumes = chargerLegumes();
const pages = pagesLegumes();

describe('pages détaillées des cultures', () => {
  it('une page par culture', () => {
    expect(pages.size).toBe(legumes.length);
    for (const l of legumes) expect(pages.has(fichierLegume(l.id)), l.id).toBe(true);
  });

  for (const l of legumes) {
    it(`${l.id} : contenu complet, sans valeur manquante`, () => {
      const html = transformerPage(pages.get(fichierLegume(l.id))!, fichierLegume(l.id));
      expect(html).not.toMatch(/NaN|undefined|null|Infinity/);
      expect(html).toContain('<h1');
      expect(html).toContain(`href="${lienCalculateur(l)}"`);
      expect(html).toContain('id="en-bref"');
      expect(html).toContain('"@type":"BreadcrumbList"');
      for (const id of ['lumiere', 'exemple', 'climat', 'nutrition', 'culture']) expect(html).toContain(`id="${id}"`);
      // Liens Amazon toujours signalés comme sponsorisés.
      for (const [lien] of html.matchAll(/<a [^>]*amazon\.fr[^>]*>/g)) expect(lien).toContain('rel="sponsored');
    });
  }

  it('description et titre dans les limites habituelles des moteurs de recherche', () => {
    for (const l of legumes) {
      expect(descriptionLegume(l).length, l.id).toBeLessThanOrEqual(158);
      const titre = pages.get(fichierLegume(l.id))!.match(/<title>([^<]+)<\/title>/)![1];
      expect(titre.length, l.id).toBeLessThanOrEqual(65);
    }
  });

  it('description : stades dans l’ordre du cycle et délai de récolte non trompeur', () => {
    const description = (id: string) => descriptionLegume(legumes.find((l) => l.id === id)!);
    // Safran : la floraison (100 µmol/m²/s, 10 h) précède le feuillage (200, 12 h).
    expect(description('safran')).toContain('100 µmol/m²/s et 10 h en floraison, puis 200 et 12 h pour le feuillage');
    expect(description('safran')).not.toContain('200 puis 100');
    // Wasabi : les feuilles se récoltent bien avant le rhizome.
    expect(description('wasabi')).toContain('rhizome en 365 à 540 jours');
    expect(description('wasabi')).not.toContain('première récolte');
    expect(description('tomate')).toContain('350 puis 500 µmol/m²/s');
  });

  it("pas de note ni de nombre d'avis Amazon", () => {
    for (const [fichier, html] of pages) expect(html, fichier).not.toMatch(/★|\bavis\)/);
  });

  it('on dimensionne pour le stade au PPFD le plus élevé', () => {
    for (const l of legumes) {
      const f = l.stades.floraison;
      expect(stadeLePlusExigeant(l), l.id).toBe(f && f.ppfd.valeur >= l.stades.croissance.ppfd.valeur ? 'floraison' : 'croissance');
    }
    const tomate = pages.get(fichierLegume('tomate'))!;
    expect(tomate).toContain('une phase de floraison et de fructification, plus gourmande en lumière');
    expect(tomate).toContain('On dimensionne l’installation pour la floraison et la fructification, le stade le plus exigeant');
    // Safran : la floraison (100 µmol/m²/s) demande moins que la croissance (200), et ne donne pas de fruits.
    const safran = pages.get(fichierLegume('safran'))!;
    expect(stadeLePlusExigeant(legumes.find((l) => l.id === 'safran')!)).toBe('croissance');
    expect(safran).toContain('C’est la croissance qui demande le plus de lumière');
    expect(safran).toContain('On dimensionne l’installation pour la croissance');
    expect(safran).not.toMatch(/fructification|plus gourmande en lumière/);
  });

  it("l'exemple reprend le calcul du calculateur, sur une surface à l'échelle de la culture", () => {
    expect([EFFICACITE, COEF_UTILISATION]).toEqual([EFFICACITE_GUIDES, COEF_GUIDES]);
    const laitue = legumes.find((l) => l.id === 'laitue')!;
    const r = exempleCalcul(laitue.stades.croissance, surfaceExemple(laitue));
    expect(r.surfaceM2).toBeCloseTo(0.18);
    expect(r.ppfNecessaire).toBeCloseTo((laitue.stades.croissance.ppfd.valeur * 0.18) / 0.8);
    const surface = (id: string) => surfaceExemple(legumes.find((l) => l.id === id)!).nom;
    for (const id of ['basilic', 'laitue', 'micro-pousses', 'radis', 'fraise', 'safran', 'wasabi']) expect(surface(id), id).toBe('une étagère de 60 × 30 cm');
    expect(surface('tomate')).toBe('une tente de 80 × 80 cm');
    expect(surface('poivron')).toBe('une tente de 60 × 60 cm');
    expect(pages.get(fichierLegume('basilic'))).toContain('<h2 id="exemple">Exemple : une étagère de 60 × 30 cm</h2>');
    // Renvoi vers le guide des puissances pour les autres surfaces.
    for (const l of legumes) expect(pages.get(fichierLegume(l.id)), l.id).toContain('href="led-puissance.html"');
  });

  it('lampes à la mesure de la surface : pas de panneau de 200 W pour quelques pots', () => {
    const basilic = pages.get(fichierLegume('basilic'))!;
    expect(basilic).not.toMatch(/SF2000|SF1000|TS1000|SE3000|SF4000|FC-E/);
    const watts = [...basilic.matchAll(/· (\d+) W au maximum/g)].map((m) => Number(m[1]));
    expect(watts.length).toBeGreaterThan(0);
    for (const w of watts) expect(w).toBeLessThanOrEqual(60);
  });

  it('le lien du calculateur présélectionne la culture, le stade dimensionnant et les dimensions', () => {
    const lien = (id: string) => lienCalculateur(legumes.find((l) => l.id === id)!);
    expect(lien('basilic')).toBe('index.html?l=basilic&amp;m=rectangle&amp;L=0%2C6&amp;W=0%2C3#calculateur');
    expect(lien('tomate')).toBe('index.html?l=tomate&amp;s=floraison&amp;m=rectangle&amp;L=0%2C8&amp;W=0%2C8#calculateur');
  });

  it('« En bref » : lumière du stade principal, heures, température, récolte et difficulté', () => {
    const tomate = pages.get(fichierLegume('tomate'))!;
    const bref = tomate.slice(tomate.indexOf('class="en-bref"'), tomate.indexOf('</section>', tomate.indexOf('class="en-bref"')));
    expect(bref).toContain('500 µmol/m²/s <small>en fructification</small>');
    expect(bref).toContain('16 h par jour');
    expect(bref).toContain('20 à 26 °C');
    expect(bref).toContain('90 à 120 jours après semis');
    expect(bref).toContain('badge-difficulte--exigeant');
    // Placé juste après le chapô.
    expect(tomate.indexOf('class="en-bref"')).toBeGreaterThan(tomate.indexOf('class="chapo"'));
    expect(tomate.indexOf('class="en-bref"')).toBeLessThan(tomate.indexOf('class="sommaire"'));
  });

  it('« Questions fréquentes » : seulement les conseils publiés qui citent la culture', () => {
    const tous = tousLesConseils();
    const jaunit = tous.find((c) => c.slug === 'basilic-qui-jaunit')!;
    expect(jaunit.cultures).toContain('basilic');
    const veille = new Date(Date.parse(jaunit.publieLe) - 86_400_000).toISOString().slice(0, 10);
    const avant = pagesLegumes(veille).get(fichierLegume('basilic'))!;
    const apres = pagesLegumes(jaunit.publieLe).get(fichierLegume('basilic'))!;
    expect(avant).not.toContain(jaunit.fichier);
    expect(apres).toContain(`href="${jaunit.fichier}"`);
    expect(apres).toContain('<h2 id="questions">Questions fréquentes</h2>');
    // Aucune question publiée : pas de section vide.
    const aucune = pagesLegumes('2000-01-01').get(fichierLegume('basilic'))!;
    expect(aucune).not.toContain('id="questions"');
  });
});
