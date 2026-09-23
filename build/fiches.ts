/** Génère, au build, le HTML des fiches légumes à partir de src/data/legumes.json. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculerDli } from '../src/calc';
import type { Legume, ParametresStade } from '../src/data';

const FICHIER = resolve(__dirname, '../src/data/legumes.json');

export function echapper(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const nb = (n: number) => String(n).replace('.', ',');
const plage = ([a, b]: [number, number], unite = '') => (a === b ? `${nb(a)}${unite}` : `${nb(a)}–${nb(b)}${unite}`);

function ligne(libelle: string, valeur: string, source: string): string {
  return `<tr><th scope="row">${libelle}</th><td>${valeur}<span class="source-ligne">${echapper(source)}</span></td></tr>`;
}

function blocStade(titre: string, p: ParametresStade): string {
  const dli = calculerDli(p.ppfd.valeur, p.photoperiode.valeur);
  return `<div class="fiche-stade">
    <h4>${titre}</h4>
    <table class="fiche-table"><tbody>
      ${ligne('PPFD', `${p.ppfd.valeur} µmol/m²/s`, p.ppfd.source)}
      ${ligne('Photopériode', `${nb(p.photoperiode.valeur)} h/jour`, p.photoperiode.source)}
      ${ligne('DLI obtenu', `${dli.toFixed(1).replace('.', ',')} mol/m²/j`, 'Calcul : PPFD × heures × 3600 / 1 000 000')}
      ${ligne('Hauteur des LED', `${plage(p.hauteur_cm.valeur, ' cm')}`, p.hauteur_cm.source)}
      ${ligne('Spectre', echapper(p.spectre.valeur), p.spectre.source)}
    </tbody></table>
  </div>`;
}

export function rendreFiche(l: Legume): string {
  const c = l.culture;
  const espacement = c.espacement_cm.valeur ? plage(c.espacement_cm.valeur, ' cm') : 'semis dense, à la volée';
  return `<article class="fiche" id="${l.id}">
  <h3>${echapper(l.nom)} <span class="fiche-famille">${echapper(l.famille)}</span></h3>
  <p class="fiche-conseil">${echapper(c.conseils.valeur)}</p>
  <div class="fiche-grille">
    ${blocStade(l.stades.floraison ? 'Lumière — croissance' : 'Lumière', l.stades.croissance)}
    ${l.stades.floraison ? blocStade('Lumière — floraison / fructification', l.stades.floraison) : ''}
    <div class="fiche-stade">
      <h4>Conditions de culture</h4>
      <table class="fiche-table"><tbody>
        ${ligne('Température (jour)', plage(c.temperature_c.valeur, ' °C'), c.temperature_c.source)}
        ${ligne('Humidité relative', plage(c.humidite_pct.valeur, ' %'), c.humidite_pct.source)}
        ${ligne('pH de la solution', plage(c.ph.valeur), c.ph.source)}
        ${ligne('EC de la solution', plage(c.ec_ms_cm.valeur, ' mS/cm'), c.ec_ms_cm.source)}
        ${ligne('Première récolte', plage(c.jours_recolte.valeur, ' jours'), c.jours_recolte.source)}
        ${ligne('Espacement', espacement, c.espacement_cm.source)}
      </tbody></table>
    </div>
  </div>
  <details class="fiche-sources"><summary>Afficher les sources de chaque valeur</summary></details>
  <p><a class="bouton-lien" href="calculateur.html?legume=${l.id}">Calculer l'éclairage pour : ${echapper(l.nom.toLowerCase())} →</a></p>
</article>`;
}

export function chargerLegumes(): Legume[] {
  return (JSON.parse(readFileSync(FICHIER, 'utf8')) as { legumes: Legume[] }).legumes;
}

export function rendreFiches(legumes: Legume[] = chargerLegumes()): string {
  const familles = new Map<string, Legume[]>();
  for (const l of legumes) familles.set(l.famille, [...(familles.get(l.famille) ?? []), l]);

  const sommaire = [...familles]
    .map(([f, ls]) => `<li><strong>${echapper(f)}</strong> : ${ls.map((l) => `<a href="#${l.id}">${echapper(l.nom)}</a>`).join(', ')}</li>`)
    .join('');
  const sections = [...familles]
    .map(([f, ls]) => `<section class="fiches-famille"><h2>${echapper(f)}</h2>${ls.map(rendreFiche).join('')}</section>`)
    .join('');
  return `<nav class="sommaire" aria-label="Légumes"><ul>${sommaire}</ul></nav>${sections}`;
}
