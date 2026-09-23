/**
 * Visuels du calculateur (fonctions pures, renvoient du HTML/SVG) :
 * plan vu de dessus de la disposition des barres, et jauge du DLI.
 */
import { dimensionsZone, type ResultatBarres, type Surface } from './calc';
import { nombre } from './format';

const LARGEUR_SVG = 600;
const MARGE = { gauche: 46, haut: 34, droite: 14, bas: 14 };
const ALLEE_M = 0.3; // espace dessiné entre deux rangs
const HAUTEUR_MAX = 300; // hauteur maximale des zones dessinées, px

/** Plan vu de dessus : zones de culture et barres LED, à l'échelle. */
export function planBarres(surface: Surface, b: ResultatBarres, longueurBarreM: number): string {
  const { zones, longueurM, largeurM } = dimensionsZone(surface);
  // À l'échelle : la longueur occupe toute la largeur, sans dépasser HAUTEUR_MAX pour les zones.
  const echelleLargeur = (LARGEUR_SVG - MARGE.gauche - MARGE.droite) / Math.max(longueurM, b.barresParLigne * longueurBarreM);
  const echelleHauteur = HAUTEUR_MAX / (zones * largeurM + (zones - 1) * ALLEE_M);
  const echelle = Math.min(echelleLargeur, echelleHauteur);
  const hZone = largeurM * echelle;
  const hAllee = ALLEE_M * echelle;
  const hauteur = MARGE.haut + zones * hZone + (zones - 1) * hAllee + MARGE.bas;
  const lZone = longueurM * echelle;
  const epaisseur = Math.max(5, Math.min(12, 0.05 * echelle));
  const longueurLigne = b.barresParLigne * longueurBarreM * echelle;
  const debutLigne = MARGE.gauche + (lZone - longueurLigne) / 2;

  const elements: string[] = [];
  for (let z = 0; z < zones; z++) {
    const y0 = MARGE.haut + z * (hZone + hAllee);
    elements.push(`<rect class="plan-zone" x="${MARGE.gauche}" y="${y0}" width="${lZone}" height="${hZone}" rx="6"/>`);
    for (let l = 0; l < b.lignesParZone; l++) {
      const y = y0 + (b.margeBordM + l * b.espacementM) * echelle;
      elements.push(`<rect class="plan-halo" x="${debutLigne}" y="${y - epaisseur * 1.8}" width="${longueurLigne}" height="${epaisseur * 3.6}" rx="${epaisseur * 1.8}"/>`);
      for (let i = 0; i < b.barresParLigne; i++) {
        const x = debutLigne + i * longueurBarreM * echelle;
        elements.push(`<rect class="plan-barre" x="${x + 1.5}" y="${y - epaisseur / 2}" width="${longueurBarreM * echelle - 3}" height="${epaisseur}" rx="${epaisseur / 2}"/>`);
      }
    }
  }

  // Cotes : longueur en haut, largeur à gauche, entraxe sur le premier rang.
  const yCote = MARGE.haut - 14;
  const cotes = [
    `<path class="plan-cote" d="M${MARGE.gauche} ${yCote}h${lZone}M${MARGE.gauche} ${yCote - 5}v10M${MARGE.gauche + lZone} ${yCote - 5}v10"/>`,
    `<text class="plan-texte" x="${MARGE.gauche + lZone / 2}" y="${yCote - 6}" text-anchor="middle">${nombre(longueurM, 2)} m</text>`,
    `<path class="plan-cote" d="M${MARGE.gauche - 14} ${MARGE.haut}v${hZone}M${MARGE.gauche - 19} ${MARGE.haut}h10M${MARGE.gauche - 19} ${MARGE.haut + hZone}h10"/>`,
    `<text class="plan-texte" x="${MARGE.gauche - 20}" y="${MARGE.haut + hZone / 2}" text-anchor="middle" transform="rotate(-90 ${MARGE.gauche - 20} ${MARGE.haut + hZone / 2})" dy="-2">${nombre(largeurM, 2)} m</text>`,
  ];
  if (b.lignesParZone > 1) {
    const y1 = MARGE.haut + b.margeBordM * echelle;
    const y2 = y1 + b.espacementM * echelle;
    const x = MARGE.gauche + lZone - 10;
    cotes.push(
      `<path class="plan-cote plan-cote--entraxe" d="M${x} ${y1}V${y2}"/>`,
      `<text class="plan-texte plan-texte--entraxe" x="${x - 5}" y="${(y1 + y2) / 2 + 4}" text-anchor="end">${nombre(b.espacementM * 100)} cm</text>`,
    );
  }

  const largeur = Math.max(MARGE.gauche + Math.max(lZone, longueurLigne) + MARGE.droite, 260);
  return `<svg class="plan" viewBox="0 0 ${Math.round(largeur)} ${Math.round(hauteur)}" role="img" aria-label="Plan vu de dessus : ${b.total} barres LED, ${b.lignesParZone} ligne(s) de ${b.barresParLigne} barre(s) par zone, entraxe ${nombre(b.espacementM * 100)} cm">
  <defs><linearGradient id="plan-spectre" x1="0" x2="1"><stop offset="0" stop-color="#5b7cff"/><stop offset=".5" stop-color="#c26bff"/><stop offset="1" stop-color="#ff4d6d"/></linearGradient></defs>
  ${elements.join('')}
  ${cotes.join('')}
</svg>`;
}

/** Repères de DLI par type de culture (ordres de grandeur, voir le guide LED). */
export const REPERES_DLI = [
  { libelle: 'Micro-pousses', min: 6, max: 12 },
  { libelle: 'Feuilles', min: 12, max: 17 },
  { libelle: 'Aromatiques', min: 12, max: 20 },
  { libelle: 'Légumes fruits', min: 20, max: 30 },
];
export const DLI_MAX_JAUGE = 40;

/** Jauge horizontale du DLI avec les repères par type de culture. */
export function jaugeDli(dli: number): string {
  const pct = (v: number) => `${Math.min(100, (v / DLI_MAX_JAUGE) * 100).toFixed(2)}%`;
  const reperes = REPERES_DLI.map(
    (r, i) => `<span class="jauge__repere jauge__repere--${i}" style="left:${pct(r.min)};width:calc(${pct(r.max)} - ${pct(r.min)})" title="${r.libelle} : ${r.min}–${r.max} mol/m²/j"></span>`,
  ).join('');
  return `<div class="jauge" role="img" aria-label="DLI de ${nombre(dli, 1)} mol/m²/j sur une échelle de 0 à ${DLI_MAX_JAUGE}">
  <div class="jauge__piste">${reperes}<span class="jauge__curseur" style="left:${pct(dli)}"><b>${nombre(dli, 1)}</b></span></div>
  <div class="jauge__echelle">${[0, 10, 20, 30, 40].map((v) => `<span style="left:${pct(v)}">${v}</span>`).join('')}</div>
  <p class="jauge__unite">DLI en mol/m²/jour</p>
  <ul class="jauge__legende">${REPERES_DLI.map((r, i) => `<li class="jauge__legende--${i}">${r.libelle} <span>${r.min}–${r.max}</span></li>`).join('')}</ul>
</div>`;
}
