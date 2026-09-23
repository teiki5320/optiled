/** Génère, au build, le HTML des fiches légumes à partir de src/data/legumes.json. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculerDli } from '../src/calc';
import type { Legume, ParametresStade } from '../src/data';
import { icone, type NomIcone } from './icones';

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
      ${ligne('DLI obtenu', `${dli.toFixed(1).replace('.', ',')} mol/m²/j`, 'Calcul : PPFD × heures × 3 600 / 1 000 000')}
      ${ligne('Hauteur des LED', `${plage(p.hauteur_cm.valeur, ' cm')}`, p.hauteur_cm.source)}
      ${ligne('Spectre', echapper(p.spectre.valeur), p.spectre.source)}
    </tbody></table>
  </div>`;
}

/** « Légumes fruits » → « legumes-fruits » */
export function slug(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const ICONES_FAMILLE: Record<string, NomIcone> = {
  'legumes-feuilles': 'feuille',
  aromatiques: 'herbe',
  'micro-pousses': 'graines',
  'legumes-fruits': 'fruit',
  chanvre: 'feuille',
};

export function iconeFamille(famille: string): string {
  return icone(ICONES_FAMILLE[slug(famille)] ?? 'pousse');
}

const DOSSIER_MINIATURES = resolve(__dirname, '../public/images/legumes');

/** Miniature photo du légume (public/images/legumes/<id>.webp), ou chaîne vide. */
export function miniature(l: Legume): string {
  if (!existsSync(resolve(DOSSIER_MINIATURES, `${l.id}.webp`))) return '';
  return `<img class="fiche__miniature" src="images/legumes/${l.id}.webp" alt="" width="96" height="96" loading="lazy" decoding="async" />`;
}

function kpi(libelle: string, valeur: string, unite = ''): string {
  return `<div><dt>${libelle}</dt><dd>${valeur}${unite ? `<small>${unite}</small>` : ''}</dd></div>`;
}

export function rendreFiche(l: Legume): string {
  const c = l.culture;
  const croissance = l.stades.croissance;
  const floraison = l.stades.floraison;
  const espacement = c.espacement_cm.valeur ? plage(c.espacement_cm.valeur, ' cm') : 'semis dense, à la volée';
  const ppfd = floraison ? `${croissance.ppfd.valeur} → ${floraison.ppfd.valeur}` : `${croissance.ppfd.valeur}`;
  const dli = (p: ParametresStade) => calculerDli(p.ppfd.valeur, p.photoperiode.valeur).toFixed(1).replace('.', ',');
  return `<article class="fiche fiche--${slug(l.famille)}" id="${l.id}">
  <header class="fiche__tete">
    ${miniature(l) || `<span class="fiche__icone">${iconeFamille(l.famille)}</span>`}
    <div><h3>${echapper(l.nom)}</h3><p class="fiche__famille">${echapper(l.famille)}</p></div>
  </header>
  <div class="fiche__corps">
    ${l.avertissement ? `<p class="encadre attention fiche__avertissement">${echapper(l.avertissement)}</p>` : ''}
    <p class="fiche__conseil">${echapper(c.conseils.valeur)}</p>
    <dl class="fiche__kpi">
      ${kpi('PPFD', ppfd, 'µmol/m²/s')}
      ${kpi('DLI', floraison ? `${dli(croissance)} → ${dli(floraison)}` : dli(croissance), 'mol/m²/j')}
      ${kpi('Lumière', floraison && floraison.photoperiode.valeur !== croissance.photoperiode.valeur ? `${nb(croissance.photoperiode.valeur)} → ${nb(floraison.photoperiode.valeur)}` : nb(croissance.photoperiode.valeur), 'h/jour')}
      ${kpi('Température', plage(c.temperature_c.valeur), '°C')}
      ${kpi('pH', plage(c.ph.valeur))}
      ${kpi('EC', plage(c.ec_ms_cm.valeur), 'mS/cm')}
      ${kpi('Récolte', plage(c.jours_recolte.valeur), 'jours')}
      ${kpi('Humidité', plage(c.humidite_pct.valeur), '%')}
    </dl>
    <details class="fiche__detail">
      <summary>Détail complet et sources</summary>
      <div class="fiche__stades">
        ${blocStade(floraison ? 'Lumière — croissance' : 'Lumière', croissance)}
        ${floraison ? blocStade('Lumière — floraison / fructification', floraison) : ''}
        <div class="fiche-stade">
          <h4>Conditions de culture</h4>
          <table class="fiche-table"><tbody>
            ${ligne('Température (jour)', plage(c.temperature_c.valeur, ' °C'), c.temperature_c.source)}
            ${ligne('Température (nuit)', plage(c.temperature_nuit_c.valeur, ' °C'), c.temperature_nuit_c.source)}
            ${ligne('Humidité relative', plage(c.humidite_pct.valeur, ' %'), c.humidite_pct.source)}
            ${ligne('pH de la solution', plage(c.ph.valeur), c.ph.source)}
            ${ligne('EC de la solution', plage(c.ec_ms_cm.valeur, ' mS/cm'), c.ec_ms_cm.source)}
            ${ligne('Délai de récolte', plage(c.jours_recolte.valeur, ' jours'), c.jours_recolte.source)}
            ${ligne('Espacement', espacement, c.espacement_cm.source)}
            ${ligne('Conseil', echapper(c.conseils.valeur), c.conseils.source)}
          </tbody></table>
        </div>
      </div>
    </details>
    <p class="fiche__action"><a class="bouton-lien plein" href="index.html?legume=${l.id}#calculateur">${icone('calcul')} Calculer l'éclairage</a></p>
  </div>
</article>`;
}

export function chargerLegumes(): Legume[] {
  return (JSON.parse(readFileSync(FICHIER, 'utf8')) as { legumes: Legume[] }).legumes;
}

export function rendreFiches(legumes: Legume[] = chargerLegumes()): string {
  const familles = new Map<string, Legume[]>();
  for (const l of legumes) familles.set(l.famille, [...(familles.get(l.famille) ?? []), l]);

  const filtres = [...familles.keys()]
    .map((f) => `<a class="pastille" href="#famille-${slug(f)}">${iconeFamille(f)} ${echapper(f)}</a>`)
    .join('');
  const sections = [...familles]
    .map(
      ([f, ls]) => `<section class="fiches-famille fiches-famille--${slug(f)}" id="famille-${slug(f)}">
  <h2>${iconeFamille(f)} ${echapper(f)}</h2>
  <div class="fiches-grille">${ls.map(rendreFiche).join('')}</div>
</section>`,
    )
    .join('');
  return `<nav class="filtres" aria-label="Familles de légumes">${filtres}</nav>${sections}`;
}

/** Tableau des températures jour / nuit du guide climat, généré depuis les fiches. */
export function rendreTableauClimat(legumes: Legume[] = chargerLegumes()): string {
  const lignes = legumes
    .map((l) => {
      const c = l.culture;
      return `<tr><td><a href="legumes.html#${l.id}">${echapper(l.nom)}</a></td><td>${plage(c.temperature_c.valeur)}</td><td>${plage(c.temperature_nuit_c.valeur)}</td><td>${echapper(c.temperature_a_eviter.valeur)}</td></tr>`;
    })
    .join('\n              ');
  return `<div class="tableau-defile">
          <table class="tableau">
            <thead><tr><th>Culture</th><th>Jour (°C)</th><th>Nuit (°C)</th><th>À éviter</th></tr></thead>
            <tbody>
              ${lignes}
            </tbody>
          </table>
        </div>`;
}
