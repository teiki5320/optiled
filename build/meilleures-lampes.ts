/**
 * Page « Les meilleures lampes LED de culture » (meilleures-lampes.html) : notre sélection, tirée
 * de src/data/lampes.json, sans aucun produit ajouté ni chiffre inventé.
 * - En tête, le choix recommandé pour chaque installation courante (mêmes règles que le
 *   calculateur : src/lampes.ts), avec une alternative.
 * - Puis toutes les lampes disponibles qui ont un chiffre de lumière (PPF) publié ou estimé,
 *   rangées de la plus petite installation à la plus grande, avec leurs chiffres réels.
 * - Un tableau comparatif, un guide en trois étapes et des questions fréquentes.
 * Le tri, le filtre par installation et la comparaison côte à côte sont ajoutés par
 * src/meilleures-lampes.ts ; sans JavaScript, la page reste complète.
 * Mois et année viennent de `verifie_le`. Aucun prix, aucune note Amazon.
 */
import { moisAnnee } from '../src/budget.ts';
import type { Legume, Stade } from '../src/data.ts';
import { LAMPES, LAMPES_VERIFIEES_LE, lampesConseillees, lienAmazon, MENTION_AFFILIATION, type Lampe, type Proposition } from '../src/lampes.ts';
import { chargerLegumes, echapper } from './fiches.ts';
import { COEF_UTILISATION } from './guides-achat.ts';
import { dateVerification } from './lampes.ts';

export const FICHIER_MEILLEURES_LAMPES = 'meilleures-lampes.html';

export type IdBesoin = 'semis' | 'etagere' | 'tente-60' | 'tente-80' | 'tente-100';

export interface Besoin {
  id: IdBesoin;
  titre: string;
  /** Libellé court (filtres, étiquettes, tableau). */
  court: string;
  intro: string;
  legume: string;
  stade: Stade;
  longueurM: number;
  largeurM: number;
}

/** Installations couvertes par la page (dans l'ordre d'affichage) ; l'id sert d'ancre et de filtre. */
export const BESOINS: Besoin[] = [
  { id: 'semis', titre: 'Semis et micro-pousses', court: 'Semis', intro: 'Un niveau d’étagère de 60 × 30 cm, au niveau de lumière des micro-pousses et des jeunes plants.', legume: 'micro-pousses', stade: 'croissance', longueurM: 0.6, largeurM: 0.3 },
  { id: 'etagere', titre: 'Étagère de salades et d’aromatiques', court: 'Étagère', intro: 'Un niveau d’étagère de 60 × 30 cm, au niveau de lumière des laitues (les aromatiques en demandent autant ou un peu plus).', legume: 'laitue', stade: 'croissance', longueurM: 0.6, largeurM: 0.3 },
  { id: 'tente-60', titre: 'Tente de 60 × 60 cm', court: 'Tente 60 cm', intro: 'Dimensionnée pour des tomates, poivrons ou piments en fruits, le stade le plus exigeant.', legume: 'tomate', stade: 'floraison', longueurM: 0.6, largeurM: 0.6 },
  { id: 'tente-80', titre: 'Tente de 80 × 80 cm', court: 'Tente 80 cm', intro: 'Dimensionnée pour des tomates, poivrons ou piments en fruits, le stade le plus exigeant.', legume: 'tomate', stade: 'floraison', longueurM: 0.8, largeurM: 0.8 },
  { id: 'tente-100', titre: 'Tente de 1 m² et plus', court: 'Tente 1 m² et +', intro: 'Pour 1 m² de légumes fruits ; au-delà, comptez une lampe de plus par tranche de surface ou passez par le calculateur.', legume: 'tomate', stade: 'floraison', longueurM: 1, largeurM: 1 },
];

/** « septembre 2026 », d'après la date de vérification de la sélection. */
export function moisLampes(): string {
  return moisAnnee(LAMPES_VERIFIEES_LE);
}

const nb = (n: number, decimales = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).replace(/ /g, ' ');
const m2 = (v: number) => nb(v, 2).replace(/,?0+$/, '');
const cm = (m: number) => nb(Math.round(m * 100));
const efficacite = (l: Lampe) => l.ppf! / l.puissance_w;
const lienPartenaire = (l: Lampe, classe = 'bouton bouton--plein', texte = 'Voir sur Amazon') =>
  `<span class="achat"><a class="${classe}" href="${lienAmazon(l)}" target="_blank" rel="sponsored noopener">${texte}</a><small>Lien partenaire</small></span>`;

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

/** Lumière moyenne reçue (µmol/m²/s) sur la surface annoncée, avec le coefficient du calculateur. */
export function ppfdMoyen(l: Lampe, stade: Stade): number {
  if (l.ppf === null || l.couverture_m2 === null) return 0;
  return Math.round((l.ppf * COEF_UTILISATION) / l.couverture_m2[stade] / 10) * 10;
}

interface Fiche {
  id: string;
  besoin: IdBesoin;
  /** Usage en quelques mots (étiquette de la carte). */
  usage: string;
  pourquoi: (l: Lampe) => string;
  pourQui: string;
}

/**
 * Textes de la sélection, dans l'ordre d'affichage : de la plus petite installation à la plus
 * grande (ce n'est pas un classement de qualité). Les chiffres des textes viennent des données.
 */
export const FICHES: Fiche[] = [
  {
    id: 'sansi-pince-20w',
    besoin: 'semis',
    usage: 'Appoint pour quelques pots',
    pourquoi: (l) =>
      `Une lampe à pince à deux têtes orientables, qui s'installe en quelques secondes au bord d'une table ou d'une étagère. Avec ${nb(l.ppf!)} µmol/s pour ${nb(l.puissance_w)} W, elle produit peu de lumière : sur ${m2(l.couverture_m2!.croissance)} m², cela donne environ ${nb(ppfdMoyen(l, 'croissance'))} µmol/m²/s. C'est une lampe d'appoint, qui complète la lumière d'une fenêtre l'hiver ; elle ne suffit pas seule pour des salades ou des tomates.`,
    pourQui: "une ou deux plantes aromatiques près d'une fenêtre peu lumineuse",
  },
  {
    id: 'sansi-15w',
    besoin: 'semis',
    usage: 'Ampoule à visser',
    pourquoi: (l) =>
      `Une ampoule horticole à culot E27 qui se visse dans une lampe de bureau ou une suspension. Avec ${nb(l.ppf!)} µmol/s pour ${nb(l.puissance_w)} W, sur ${m2(l.couverture_m2!.croissance)} m² elle donne environ ${nb(ppfdMoyen(l, 'croissance'))} µmol/m²/s : de l'appoint pour un pot ou deux, placée tout près. Rien à monter, mais trop peu de lumière pour une étagère entière.`,
    pourQui: "un pot d'aromatiques ou quelques godets de semis sous une lampe existante",
  },
  {
    id: 'barrina-t5-29',
    besoin: 'semis',
    usage: 'Semis sur une petite étagère',
    pourquoi: (l) =>
      `Quatre réglettes courtes à poser sous une tablette, qu'on peut relier entre elles. Leur PPF est estimé à ${nb(l.ppf!)} µmol/s d'après l'efficacité annoncée, pour ${nb(l.puissance_w)} W en tout. Sur ${m2(l.couverture_m2!.croissance)} m² (environ 40 × 30 cm), cela fait près de ${nb(ppfdMoyen(l, 'croissance'))} µmol/m²/s : plus que les 150 dont ont besoin les semis et les micro-pousses. Les réglettes se placent près des plants, à 10 à 30 cm.`,
    pourQui: 'un plateau de semis ou de micro-pousses sur une étagère',
  },
  {
    id: 'spider-farmer-sf300',
    besoin: 'etagere',
    usage: 'Étagère de salades et aromatiques',
    pourquoi: (l) =>
      `Une barre de 60 cm avec réflecteur, pensée pour un niveau d'étagère. Son PPF est estimé à ${nb(l.ppf!)} µmol/s pour ${nb(l.puissance_w)} W, soit une bonne efficacité pour une si petite lampe. Sur environ 60 × 30 cm, elle donne près de ${nb(ppfdMoyen(l, 'croissance'))} µmol/m²/s, de quoi couvrir les 250 des salades et les 300 du basilic. Elle n'a pas de variateur : on règle l'intensité avec la hauteur.`,
    pourQui: "une étagère de salades, d'aromatiques ou de jeunes plants",
  },
  {
    id: 'mars-hydro-ts600',
    besoin: 'tente-60',
    usage: 'Tente de 60 cm, salades et aromatiques',
    pourquoi: (l) =>
      `Un petit panneau de ${nb(l.puissance_w)} W, avec un PPF publié par le fabricant de ${nb(l.ppf!)} µmol/s. Il couvre ${m2(l.couverture_m2!.croissance)} m² (60 × 60 cm) pour des cultures de feuilles, avec environ ${nb(ppfdMoyen(l, 'croissance'))} µmol/m²/s, mais seulement ${m2(l.couverture_m2!.floraison)} m² pour des légumes fruits. Variateur intégré.`,
    pourQui: 'une tente de 60 × 60 cm de salades, aromatiques ou jeunes plants',
  },
  {
    id: 'spider-farmer-sf1000',
    besoin: 'tente-60',
    usage: 'Petite tente de 60 × 60 cm',
    pourquoi: (l) =>
      `Un panneau compact de ${nb(l.puissance_w)} W, avec un PPF publié par le fabricant de ${nb(l.ppf!)} µmol/s. Il couvre ${m2(l.couverture_m2!.croissance)} m² pour des salades et ${m2(l.couverture_m2!.floraison)} m² (60 × 60 cm) pour des tomates ou des piments en fruits, avec environ ${nb(ppfdMoyen(l, 'floraison'))} µmol/m²/s sur cette surface. Le variateur permet de baisser la lumière pour les jeunes plants, puis de la monter à la floraison.`,
    pourQui: 'une première tente de 60 × 60 cm, salades ou légumes fruits',
  },
  {
    id: 'mars-hydro-fc-e1500',
    besoin: 'tente-60',
    usage: 'Tente de 60 × 60 cm, très efficace',
    pourquoi: (l) =>
      `Un panneau à barres de ${nb(l.puissance_w)} W, avec ${nb(l.ppf!)} µmol/s de PPF publié, soit ${nb(efficacite(l), 1)} µmol/J : il produit beaucoup de lumière pour l'électricité consommée. Il couvre ${m2(l.couverture_m2!.floraison)} m² en floraison, où il dépasse largement les 500 µmol/m²/s des tomates : on peut le régler plus bas au variateur. Les barres répartissent la lumière plus régulièrement qu'un petit panneau.`,
    pourQui: 'une tente de 60 × 60 cm de légumes fruits, en gardant de la marge',
  },
  {
    id: 'spider-farmer-se1500',
    besoin: 'tente-80',
    usage: 'Tente de 70 × 70 cm',
    pourquoi: (l) =>
      `Un panneau à barres de 41 × 41 cm, ${nb(l.puissance_w)} W, ${nb(l.ppf!)} µmol/s de PPF publié, soit ${nb(efficacite(l), 1)} µmol/J. Il couvre ${m2(l.couverture_m2!.floraison)} m² (environ 70 × 70 cm), en croissance comme en floraison, avec près de ${nb(ppfdMoyen(l, 'floraison'))} µmol/m²/s : assez pour des tomates en fruits. Variateur intégré pour les premiers stades.`,
    pourQui: 'une tente de 70 × 70 cm de tomates, poivrons ou piments',
  },
  {
    id: 'spider-farmer-sf2000',
    besoin: 'tente-80',
    usage: 'Tente de 80 × 80 cm ou bac allongé',
    pourquoi: (l) =>
      `Un panneau allongé de 65 × 27 cm et ${nb(l.puissance_w)} W. Le fabricant annonce un PPF qui ne colle pas avec l'efficacité qu'il publie : nous retenons la valeur prudente de ${nb(l.ppf!)} µmol/s, calculée d'après cette efficacité. Il couvre ${m2(l.couverture_m2!.floraison)} m² en floraison et ${m2(l.couverture_m2!.croissance)} m² en croissance. Sa forme convient bien à un bac ou une tente rectangulaire.`,
    pourQui: 'une tente de 80 × 80 cm ou un espace plus long que large',
  },
  {
    id: 'spider-farmer-se3000',
    besoin: 'tente-100',
    usage: 'Tente de 90 × 90 cm',
    pourquoi: (l) =>
      `Un panneau à barres de 60 × 58 cm et ${nb(l.puissance_w)} W, avec ${nb(l.ppf!)} µmol/s de PPF (valeur prudente de l'annonce). Il couvre ${m2(l.couverture_m2!.floraison)} m², environ 90 × 90 cm, avec près de ${nb(ppfdMoyen(l, 'floraison'))} µmol/m²/s : de la marge pour des légumes fruits, à baisser au variateur pour les salades. À cette puissance, une extraction d'air devient nécessaire dans la tente.`,
    pourQui: 'une tente de 80 × 80 ou 90 × 90 cm bien remplie',
  },
  {
    id: 'spider-farmer-sf4000',
    besoin: 'tente-100',
    usage: 'Grande tente de 120 × 120 cm',
    pourquoi: (l) =>
      `Un grand panneau de 65 × 54 cm et ${nb(l.puissance_w)} W, avec ${nb(l.ppf!)} µmol/s de PPF publié par le fabricant. Il couvre ${m2(l.couverture_m2!.floraison)} m² en floraison (120 × 120 cm) avec environ ${nb(ppfdMoyen(l, 'floraison'))} µmol/m²/s, et jusqu'à ${m2(l.couverture_m2!.croissance)} m² pour des cultures de feuilles. Une seule lampe à suspendre pour une grande tente, avec variateur.`,
    pourQui: 'une tente de 120 × 120 cm, légumes fruits ou grandes cultures de feuilles',
  },
  {
    id: 'mars-hydro-fc-e4800',
    besoin: 'tente-100',
    usage: 'Grande tente, lumière très régulière',
    pourquoi: (l) =>
      `Un cadre de barres de 86 × 85 cm, ${nb(l.puissance_w)} W, ${nb(l.ppf!)} µmol/s de PPF publié, soit ${nb(efficacite(l), 1)} µmol/J. Les barres sont réparties sur presque toute la largeur : la lumière tombe de façon plus égale qu'avec un seul panneau central. Il couvre ${m2(l.couverture_m2!.floraison)} m² avec près de ${nb(ppfdMoyen(l, 'floraison'))} µmol/m²/s. C'est la plus puissante de la sélection : réservée aux grands espaces bien ventilés.`,
    pourQui: 'une tente de 120 × 120 cm, quand on veut le moins de zones sombres possible',
  },
];

/** Lampes retenues : disponibles et avec un chiffre de lumière ; ni rupture, ni lampe sans PPF. */
export function lampeRetenue(l: Lampe): boolean {
  return l.ppf !== null && l.couverture_m2 !== null && l.disponible !== false;
}

export interface Entree {
  rang: number;
  fiche: Fiche;
  lampe: Lampe;
  besoin: Besoin;
}

/** La sélection affichée, numérotée dans l'ordre des fiches. */
export function selection(): Entree[] {
  return FICHES.flatMap((fiche) => {
    const lampe = LAMPES.find((l) => l.id === fiche.id);
    return lampe && lampeRetenue(lampe) ? [{ fiche, lampe, besoin: BESOINS.find((b) => b.id === fiche.besoin)! }] : [];
  }).map((e, i) => ({ ...e, rang: i + 1 }));
}

/** Points forts et points à savoir, déduits des seules données de la lampe. */
export function points(l: Lampe, toutes: Lampe[]): { forts: string[]; aSavoir: string[] } {
  const effs = toutes.map(efficacite).sort((a, b) => b - a);
  const e = efficacite(l);
  const forts: string[] = [];
  const aSavoir: string[] = [];
  if (e >= effs[Math.min(2, effs.length - 1)]) forts.push(`Parmi les 3 plus efficaces de la sélection (${nb(e, 2)} µmol/J)`);
  if (l.variateur) forts.push('Variateur : intensité réglable selon le stade');
  if (l.type === 'appoint') forts.push('Aucun montage');
  if (l.couverture_m2!.croissance === l.couverture_m2!.floraison && l.type === 'panneau') forts.push('Même surface couverte en croissance et en floraison');
  if (e <= effs[effs.length - 1]) aSavoir.push(`Efficacité la plus basse de la sélection (${nb(e, 2)} µmol/J)`);
  if (!l.variateur) aSavoir.push('Pas de variateur : on règle la lumière avec la hauteur');
  if (l.ppf_estime) aSavoir.push('PPF estimé d’après l’efficacité annoncée, pas publié tel quel');
  if (l.type === 'appoint') aSavoir.push('Lumière d’appoint, insuffisante seule pour des salades');
  if (l.puissance_w >= 300) aSavoir.push('Forte chaleur : prévoir une extraction d’air');
  if (l.couverture_m2!.floraison < l.couverture_m2!.croissance / 1.5) aSavoir.push(`En légumes fruits, ne couvre que ${m2(l.couverture_m2!.floraison)} m²`);
  return { forts, aSavoir };
}

function surface(l: Lampe): string {
  const c = l.couverture_m2!;
  return c.croissance === c.floraison ? `${m2(c.croissance)} m²` : `${m2(c.croissance)} m² (${m2(c.floraison)} en fruits)`;
}

/** Vignette : illustration générée d'après la description (signalée en bas de page), ou rien. */
function vignette(l: Lampe): string {
  if (!l.illustration) return '<span class="selection__vignette"></span>';
  const base = `images/lampes/${l.illustration}`;
  return `<span class="selection__vignette"><img src="${base}-400.webp" width="400" height="300" alt="Illustration : ${echapper(l.dimensions)}" loading="lazy" decoding="async" /></span>`;
}

const pct = (v: number, max: number) => `${Math.max(4, Math.round((v / max) * 100))}%`;

function jauge(libelle: string, valeur: string, largeur: string, classe = ''): string {
  return `<div class="jauge${classe}"><p><span>${libelle}</span><strong>${valeur}</strong></p><span class="jauge__fond"><span style="width:${largeur}"></span></span></div>`;
}

function carteChoix(c: ChoixBesoin): string {
  const b = c.besoin;
  const lien = `index.html?l=${b.legume}${b.stade === 'floraison' ? '&amp;s=floraison' : ''}&amp;L=${String(b.longueurM).replace('.', ',')}&amp;W=${String(b.largeurM).replace('.', ',')}`;
  const [p, alt] = c.choix;
  if (!p) {
    return `<article class="choix" id="${b.id}"><p class="choix__besoin">${b.titre}</p><p>Aucune lampe de la sélection ne convient ce mois-ci : utilisez le <a href="${lien}">calculateur</a> pour dimensionner des barres LED.</p></article>`;
  }
  const l = p.lampe;
  const ppfd = (p.ppfTotal * COEF_UTILISATION) / c.surfaceM2;
  const nombre = p.nombre > 1 ? `${p.nombre} × ` : '';
  return `<article class="choix" id="${b.id}">
          <p class="choix__tete"><span class="choix__besoin">${b.titre}</span></p>
          <div class="choix__lampe">${vignette(l)}<div><h3>${nombre}${echapper(l.nom)}</h3><p>${cm(b.longueurM)} × ${cm(b.largeurM)} cm, cible ${nb(c.ppfd)} µmol/m²/s</p></div></div>
          <dl class="choix__chiffres">
            <div><dt>µmol/J</dt><dd>${nb(efficacite(l), 2)}</dd></div>
            <div><dt>puissance</dt><dd>${nb(p.puissanceW)} W</dd></div>
            <div><dt>µmol/m²/s</dt><dd>≈ ${nb(Math.round(ppfd))}</dd></div>
          </dl>
          <p class="choix__texte">${b.intro} ${nombre ? `${p.nombre} lampes donnent` : 'Elle donne'} ${nb(p.ppfTotal)} µmol/s pour ${nb(Math.round(c.ppfNecessaire))} nécessaires.${alt ? ` Alternative : <a href="#${alt.lampe.id}">${alt.nombre > 1 ? `${alt.nombre} × ` : ''}${echapper(alt.lampe.nom)}</a>.` : ''}</p>
          <p class="choix__actions">${lienPartenaire(l)}<a href="${lien}">Refaire le calcul</a></p>
        </article>`;
}

function carteLampe(e: Entree, max: { e: number; p: number; w: number; s: number }, toutes: Lampe[]): string {
  const l = e.lampe;
  const { forts, aSavoir } = points(l, toutes);
  const liste = (items: string[]) => items.map((x) => `<li>${x}</li>`).join('');
  return `<article class="lampe-sel" id="${l.id}" data-besoin="${e.besoin.id}" data-rang="${e.rang}" data-eff="${efficacite(l).toFixed(3)}" data-ppf="${l.ppf}" data-w="${l.puissance_w}" data-nom="${echapper(l.nom)}">
          <div class="lampe-sel__tete">
            <span class="lampe-sel__rang">${e.rang}</span>
            ${vignette(l)}
            <div>
              <p class="lampe-sel__etiquettes"><span>${e.fiche.usage}</span><span>${e.besoin.court}</span></p>
              <h3>${echapper(l.nom)}</h3>
            </div>
          </div>
          <div class="lampe-sel__jauges">
            ${jauge('Efficacité', `${nb(efficacite(l), 2)} µmol/J`, pct(efficacite(l), max.e), ' jauge--accent')}
            ${jauge('Lumière émise', `${nb(l.ppf!)} µmol/s${l.ppf_estime ? ' (estimé)' : ''}`, pct(l.ppf!, max.p), ' jauge--corail')}
            ${jauge('Puissance', `${nb(l.puissance_w)} W`, pct(l.puissance_w, max.w))}
            ${jauge('Surface couverte', surface(l), pct(l.couverture_m2!.croissance, max.s))}
          </div>
          <p><strong>Pourquoi elle est là.</strong> ${e.fiche.pourquoi(l)}</p>
          <div class="lampe-sel__points">
            ${forts.length ? `<div><p class="lampe-sel__plus">Points forts</p><ul class="plus">${liste(forts)}</ul></div>` : ''}
            ${aSavoir.length ? `<div><p class="lampe-sel__moins">À savoir</p><ul class="moins">${liste(aSavoir)}</ul></div>` : ''}
          </div>
          <p class="lampe-sel__ideal"><strong>Idéale pour</strong> ${e.fiche.pourQui}. Format : ${echapper(l.dimensions)}, ${l.variateur ? 'avec' : 'sans'} variateur.</p>
          <p class="lampe-sel__actions">${lienPartenaire(l)}<button type="button" class="bouton lampe-sel__comparer" aria-pressed="false" hidden>+ Comparer</button></p>
        </article>`;
}

function tableau(entrees: Entree[]): string {
  const lignes = entrees
    .map(({ lampe: l, besoin, rang }) => `<tr data-rang="${rang}" data-eff="${efficacite(l).toFixed(3)}" data-ppf="${l.ppf}" data-w="${l.puissance_w}">
              <th scope="row"><span class="selection__num">${rang}</span> <a href="#${l.id}">${echapper(l.nom)}</a></th>
              <td>${besoin.court}</td>
              <td class="nombre">${nb(efficacite(l), 2)}</td>
              <td class="nombre">${nb(l.ppf!)}${l.ppf_estime ? '*' : ''}</td>
              <td class="nombre">${nb(l.puissance_w)} W</td>
              <td>${surface(l)}</td>
              <td>${l.variateur ? 'Oui' : 'Non'}</td>
              <td>${lienPartenaire(l, 'lien-amazon', 'Voir sur Amazon')}</td>
            </tr>`)
    .join('\n            ');
  const th = (cle: string, texte: string) => `<th scope="col" class="nombre" data-tri="${cle}"><button type="button" class="tri" hidden>${texte} ↕</button><span class="tri-texte">${texte}</span></th>`;
  return `<div class="tableau-defile">
          <table class="tableau tableau--selection">
            <caption class="visuellement-cache">Comparatif des lampes de la sélection</caption>
            <thead><tr><th scope="col">Lampe</th><th scope="col">Installation</th>${th('eff', 'µmol/J')}${th('ppf', 'µmol/s')}${th('w', 'Puissance')}<th scope="col">Surface</th><th scope="col">Variateur</th><th scope="col"><span class="visuellement-cache">Lien</span></th></tr></thead>
            <tbody>
            ${lignes}
            </tbody>
          </table>
        </div>
        <p class="aide">* PPF estimé d'après l'efficacité annoncée par la marque.</p>`;
}

/** Nombre de lampes de la sélection (chapô). */
export function nombreSelection(): number {
  return selection().length;
}

/** Contenu généré de la page (marqueur <!--#meilleures-lampes-->). */
export function rendreMeilleuresLampes(legumes: Legume[] = chargerLegumes()): string {
  const entrees = selection();
  const toutes = entrees.map((e) => e.lampe);
  const max = {
    e: Math.max(...toutes.map(efficacite)),
    p: Math.max(...toutes.map((l) => l.ppf!)),
    w: Math.max(...toutes.map((l) => l.puissance_w)),
    s: Math.max(...toutes.map((l) => l.couverture_m2!.croissance)),
  };
  const filtres = [`<button type="button" class="puce" aria-pressed="true" data-filtre="">Toutes</button>`, ...BESOINS.map((b) => `<button type="button" class="puce" aria-pressed="false" data-filtre="${b.id}">${b.court}</button>`)].join('');
  return `<section class="selection__section" id="par-installation">
        <h2>Notre choix par installation</h2>
        <p class="selection__intro">Pour chaque installation courante, la lampe de la sélection qui donne assez de lumière avec le moins de gaspillage, calculée comme le <a href="index.html#calculateur">calculateur</a>.</p>
        <div class="choix-grille">
        ${BESOINS.map((b) => carteChoix(choisir(b, legumes))).join('\n        ')}
        </div>
      </section>

      <section class="selection__section" id="selection">
        <div class="selection__tete">
          <div>
            <h2>Toute la sélection</h2>
            <p class="selection__intro"><span data-compte>${entrees.length} lampes</span>, de la plus petite installation à la plus grande. <span class="selection__astuce" hidden>Touchez « Comparer » sur 2 ou 3 lampes pour les voir côte à côte.</span></p>
          </div>
          <label class="selection__tri" hidden>Trier par
            <select data-tri-liste>
              <option value="rang">Installation</option>
              <option value="eff">Efficacité (µmol/J)</option>
              <option value="ppf">Lumière émise (µmol/s)</option>
              <option value="w">Puissance</option>
            </select>
          </label>
        </div>
        <div class="selection__filtres" role="group" aria-label="Filtrer par installation" hidden>${filtres}</div>
        <div class="selection__liste" data-liste>
        ${entrees.map((e) => carteLampe(e, max, toutes)).join('\n        ')}
        </div>
      </section>

      <section class="selection__section" id="tableau">
        <h2>Tableau comparatif</h2>
        <p class="selection__intro">Les chiffres de toutes les lampes, sur une ligne chacune.</p>
        ${tableau(entrees)}
      </section>

      <div class="comparateur" data-comparateur hidden>
        <p><strong data-comparateur-compte></strong><span data-comparateur-noms></span></p>
        <p><button type="button" class="bouton" data-comparateur-vider>Vider</button><button type="button" class="bouton bouton--plein" data-comparateur-ouvrir>Comparer</button></p>
      </div>
      <dialog class="comparaison" data-comparaison aria-labelledby="comparaison-titre">
        <div class="comparaison__tete"><h2 id="comparaison-titre">Côte à côte</h2><button type="button" class="comparaison__fermer" data-comparaison-fermer aria-label="Fermer">×</button></div>
        <div class="comparaison__grille" data-comparaison-grille></div>
      </dialog>`;
}

/** Note de bas de page : date de vérification, illustrations, mention Amazon. */
export function noteMeilleuresLampes(): string {
  return `<p class="aide">Sélection vérifiée sur Amazon.fr et chez les fabricants le ${dateVerification()}. Les chiffres sont ceux publiés par les fabricants ; vérifiez au PAR-mètre. Les illustrations sont générées d'après la description des produits ; ce ne sont pas des photos. ${MENTION_AFFILIATION}</p>`;
}
