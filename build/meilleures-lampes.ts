/**
 * Page « Meilleures lampes LED horticoles (<mois année>) » : pour chaque besoin courant, le choix
 * recommandé et une alternative, calculés depuis lampes.json et legumes.json (mêmes règles que le
 * calculateur : src/lampes.ts). Mois et année viennent de `verifie_le` : la page change de titre
 * à chaque vérification mensuelle. Aucun prix par produit, aucune note chiffrée.
 */
import { moisAnnee } from '../src/budget.ts';
import type { Legume, Stade } from '../src/data.ts';
import { LAMPES_VERIFIEES_LE, lampesConseillees, lienAmazon, MENTION_AFFILIATION, type Proposition } from '../src/lampes.ts';
import { rendreFourchettesGammes } from './budget.ts';
import { chargerLegumes, echapper } from './fiches.ts';
import { COEF_UTILISATION } from './guides-achat.ts';
import { dateVerification } from './lampes.ts';

export const FICHIER_MEILLEURES_LAMPES = 'meilleures-lampes.html';

export interface Besoin {
  id: string;
  titre: string;
  intro: string;
  legume: string;
  stade: Stade;
  longueurM: number;
  largeurM: number;
}

/** Besoins couverts par la page (dans l'ordre d'affichage) ; l'id sert d'ancre. */
export const BESOINS: Besoin[] = [
  { id: 'semis', titre: 'Semis et micro-pousses sur étagère', intro: 'Un niveau d’étagère de 60 × 30 cm, au niveau de lumière des micro-pousses et des jeunes plants.', legume: 'micro-pousses', stade: 'croissance', longueurM: 0.6, largeurM: 0.3 },
  { id: 'etagere', titre: 'Étagère de salades et d’aromatiques', intro: 'Un niveau d’étagère de 60 × 30 cm, au niveau de lumière des laitues (les aromatiques en demandent autant ou un peu plus).', legume: 'laitue', stade: 'croissance', longueurM: 0.6, largeurM: 0.3 },
  { id: 'tente-60', titre: 'Tente de 60 × 60 cm', intro: 'Dimensionnée pour des tomates, poivrons ou piments en fruits, le stade le plus exigeant.', legume: 'tomate', stade: 'floraison', longueurM: 0.6, largeurM: 0.6 },
  { id: 'tente-80', titre: 'Tente de 80 × 80 cm', intro: 'Dimensionnée pour des tomates, poivrons ou piments en fruits, le stade le plus exigeant.', legume: 'tomate', stade: 'floraison', longueurM: 0.8, largeurM: 0.8 },
  { id: 'tente-100', titre: 'Tente de 100 × 100 cm et plus', intro: 'Pour 1 m² de légumes fruits ; au-delà, comptez une lampe de plus par tranche de surface ou passez par le calculateur.', legume: 'tomate', stade: 'floraison', longueurM: 1, largeurM: 1 },
];

/** « septembre 2026 », d'après la date de vérification de la sélection. */
export function moisLampes(): string {
  return moisAnnee(LAMPES_VERIFIEES_LE);
}

const nb = (n: number, decimales = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).replace(/ /g, ' ');
const cm = (m: number) => nb(Math.round(m * 100));

export interface ChoixBesoin {
  besoin: Besoin;
  ppfd: number;
  photoperiodeH: number;
  ppfNecessaire: number;
  surfaceM2: number;
  choix: Proposition[];
}

/** Choix recommandé puis alternative (au plus 2), avec les règles du calculateur. */
export function choisir(besoin: Besoin, legumes: Legume[] = chargerLegumes()): ChoixBesoin {
  const stade = legumes.find((l) => l.id === besoin.legume)?.stades[besoin.stade];
  if (!stade) throw new Error(`Besoin ${besoin.id} : culture ou stade inconnu`);
  const surfaceM2 = besoin.longueurM * besoin.largeurM;
  const ppfd = stade.ppfd.valeur;
  const ppfNecessaire = (ppfd * surfaceM2) / COEF_UTILISATION;
  // lampesConseillees écarte déjà les lampes sans PPF et les indisponibles.
  const choix = lampesConseillees(ppfNecessaire, surfaceM2, besoin.stade, 2).filter((p) => p.lampe.ppf !== null);
  return { besoin, ppfd, photoperiodeH: stade.photoperiode.valeur, ppfNecessaire, surfaceM2, choix };
}

function carte(c: ChoixBesoin, p: Proposition, role: string): string {
  const l = p.lampe;
  const ppfdMoyen = (p.ppfTotal * COEF_UTILISATION) / c.surfaceM2;
  const kwhAn = (p.puissanceW * c.photoperiodeH * 365) / 1000;
  const exces = Math.round((p.ppfTotal / c.ppfNecessaire - 1) * 100);
  const nombre = p.nombre > 1 ? `${p.nombre} × ` : '';
  return `<div class="choix-lampe">
          <p class="choix-lampe__role">${role}</p>
          <h3>${nombre}${echapper(l.nom)}</h3>
          <ul>
            <li>Efficacité : <strong>${nb(l.ppf! / l.puissance_w, 2)} µmol/J</strong>${l.ppf_estime ? ' (PPF estimé d’après l’efficacité annoncée)' : ''}</li>
            <li>PPF : <strong>${nb(p.ppfTotal)} µmol/s</strong>${p.nombre > 1 ? ` (${nb(l.ppf!)} par lampe)` : ''} pour ${nb(Math.round(c.ppfNecessaire))} nécessaires, soit ${exces} % de marge</li>
            <li>PPFD moyen sur ${cm(c.besoin.longueurM)} × ${cm(c.besoin.largeurM)} cm : <strong>≈ ${nb(Math.round(ppfdMoyen))} µmol/m²/s</strong> (cible : ${nb(c.ppfd)})${l.variateur ? ', réglable au variateur' : ''}</li>
            <li>Consommation : <strong>${nb(p.puissanceW)} W</strong> au maximum, ≈ ${nb(Math.round(kwhAn))} kWh par an à ${nb(c.photoperiodeH)} h par jour</li>
          </ul>
          <a class="bouton" href="${lienAmazon(l)}" target="_blank" rel="sponsored noopener">Voir sur Amazon</a>
        </div>`;
}

function section(c: ChoixBesoin): string {
  const b = c.besoin;
  const corps =
    c.choix.length === 0
      ? '<p>Aucune lampe de la sélection ne convient ce mois-ci : utilisez le calculateur pour dimensionner des barres LED.</p>'
      : `<div class="choix-lampes">${c.choix.map((p, i) => carte(c, p, i === 0 ? 'Choix recommandé' : 'Alternative')).join('\n        ')}</div>`;
  const lien = `index.html?l=${b.legume}${b.stade === 'floraison' ? '&amp;s=floraison' : ''}&amp;L=${String(b.longueurM).replace('.', ',')}&amp;W=${String(b.largeurM).replace('.', ',')}`;
  return `<h2 id="${b.id}">${b.titre}</h2>
        <p>${b.intro} Besoin : ${nb(c.ppfd)} µmol/m²/s, soit ${nb(Math.round(c.ppfNecessaire))} µmol/s de lumière à émettre.</p>
        ${corps}
        <p><a href="${lien}">Refaire le calcul avec vos dimensions</a></p>`;
}

/** Contenu généré de la page (marqueur <!--#meilleures-lampes-->). */
export function rendreMeilleuresLampes(legumes: Legume[] = chargerLegumes()): string {
  const sections = BESOINS.map((b) => section(choisir(b, legumes))).join('\n\n        ');
  return `${sections}

        <h2 id="budget">Budget par gamme</h2>
        <p>Pour situer ces lampes, voici les fourchettes de prix de chaque gamme. Le budget d'une installation complète (lampe, accessoires, électricité) est détaillé dans <a href="debuter.html#budget">Débuter</a> et <a href="tente.html#budget">Cultiver dans une tente</a>.</p>
        ${rendreFourchettesGammes()}
        <p class="aide">Sélection vérifiée sur Amazon.fr le ${dateVerification()}. ${MENTION_AFFILIATION}</p>`;
}
