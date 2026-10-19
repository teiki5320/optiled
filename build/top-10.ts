/**
 * Pages « Top 10 » à onglets : un onglet par sujet, chacun publié comme une vraie page
 * (top-10-<sujet>.html) avec son titre, sa description et ses 10 produits dans le HTML.
 * top-10.html est la porte d'entrée : elle affiche le premier onglet et déclare sa page comme
 * adresse canonique. Un sujet n'est publié que s'il a au moins 10 vrais produits.
 * Uniquement des produits et des chiffres de src/data/lampes.json ; ni prix, ni note.
 * Pas de filtre, de tri ni de comparateur : une liste numérotée, c'est tout.
 */
import { imageLampe, LAMPES, LAMPES_VERIFIEES_LE, lampesConseillees, lienAmazon, lienAmazonAsin, MENTION_AFFILIATION, type Lampe } from '../src/lampes.ts';
import brutTentes from '../src/data/tentes.json' with { type: 'json' };
import { echapper } from './fiches.ts';
import { COEF_UTILISATION } from './guides-achat.ts';

export const FICHIER_TOP_10 = 'top-10.html';
export const PREFIXE_TOP_10 = 'top-10';
const TAILLE = 10;

const nb = (n: number, decimales = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).replace(/ /g, ' ');
const m2 = (v: number) => nb(v, 2).replace(/,?0+$/, '');
const efficacite = (l: Lampe) => l.ppf! / l.puissance_w;

/** Lumière moyenne reçue (µmol/m²/s) sur la surface annoncée, avec le coefficient du calculateur. */
function ppfdMoyen(l: Lampe, stade: 'croissance' | 'floraison'): number {
  return Math.round((l.ppf! * COEF_UTILISATION) / l.couverture_m2![stade] / 10) * 10;
}

interface Fiche {
  id: string;
  pourquoi: (l: Lampe) => string;
  pourQui: string;
}

/** Textes des lampes : description tirée des données (les chiffres suivent les mises à jour). */
const FICHES: Fiche[] = [
  {
    id: 'sansi-pince-20w',
    pourquoi: (l) =>
      `Une lampe à pince à deux têtes orientables, qui s'installe en quelques secondes au bord d'une table ou d'une étagère. Avec ${nb(l.ppf!)} µmol/s pour ${nb(l.puissance_w)} W, elle produit peu de lumière : sur ${m2(l.couverture_m2!.croissance)} m², cela donne environ ${nb(ppfdMoyen(l, 'croissance'))} µmol/m²/s. C'est une lampe d'appoint, qui complète la lumière d'une fenêtre l'hiver ; elle ne suffit pas seule pour des salades ou des tomates.`,
    pourQui: "une ou deux plantes aromatiques près d'une fenêtre peu lumineuse",
  },
  {
    id: 'sansi-15w',
    pourquoi: (l) =>
      `Une ampoule horticole à culot E27 qui se visse dans une lampe de bureau ou une suspension. Avec ${nb(l.ppf!)} µmol/s pour ${nb(l.puissance_w)} W, sur ${m2(l.couverture_m2!.croissance)} m² elle donne environ ${nb(ppfdMoyen(l, 'croissance'))} µmol/m²/s : de l'appoint pour un pot ou deux, placée tout près. Rien à monter, mais trop peu de lumière pour une étagère entière.`,
    pourQui: "un pot d'aromatiques ou quelques godets de semis sous une lampe existante",
  },
  {
    id: 'barrina-t5-29',
    pourquoi: (l) =>
      `Quatre réglettes courtes à poser sous une tablette, qu'on peut relier entre elles. Leur PPF est estimé à ${nb(l.ppf!)} µmol/s d'après l'efficacité annoncée, pour ${nb(l.puissance_w)} W en tout. Sur ${m2(l.couverture_m2!.croissance)} m² (environ 40 × 30 cm), cela fait près de ${nb(ppfdMoyen(l, 'croissance'))} µmol/m²/s : plus que les 150 dont ont besoin les semis et les micro-pousses. Les réglettes se placent près des plants, à 10 à 30 cm.`,
    pourQui: 'un plateau de semis ou de micro-pousses sur une étagère',
  },
  {
    id: 'spider-farmer-sf300',
    pourquoi: (l) =>
      `Une barre de 60 cm avec réflecteur, pensée pour un niveau d'étagère. Son PPF est estimé à ${nb(l.ppf!)} µmol/s pour ${nb(l.puissance_w)} W, soit une bonne efficacité pour une si petite lampe. Sur environ 60 × 30 cm, elle donne près de ${nb(ppfdMoyen(l, 'croissance'))} µmol/m²/s, de quoi couvrir les 250 des salades et les 300 du basilic. Elle n'a pas de variateur : on règle l'intensité avec la hauteur.`,
    pourQui: "une étagère de salades, d'aromatiques ou de jeunes plants",
  },
  {
    id: 'mars-hydro-ts600',
    pourquoi: (l) =>
      `Un petit panneau de ${nb(l.puissance_w)} W, avec un PPF publié par le fabricant de ${nb(l.ppf!)} µmol/s. Il couvre ${m2(l.couverture_m2!.croissance)} m² (60 × 60 cm) pour des cultures de feuilles, avec environ ${nb(ppfdMoyen(l, 'croissance'))} µmol/m²/s, mais seulement ${m2(l.couverture_m2!.floraison)} m² pour des légumes fruits. Variateur intégré.`,
    pourQui: 'une tente de 60 × 60 cm de salades, aromatiques ou jeunes plants',
  },
  {
    id: 'spider-farmer-sf1000',
    pourquoi: (l) =>
      `Un panneau compact de ${nb(l.puissance_w)} W, avec un PPF publié par le fabricant de ${nb(l.ppf!)} µmol/s. Il couvre ${m2(l.couverture_m2!.croissance)} m² pour des salades et ${m2(l.couverture_m2!.floraison)} m² (60 × 60 cm) pour des tomates ou des piments en fruits, avec environ ${nb(ppfdMoyen(l, 'floraison'))} µmol/m²/s sur cette surface. Le variateur permet de baisser la lumière pour les jeunes plants, puis de la monter à la floraison.`,
    pourQui: 'une première tente de 60 × 60 cm, salades ou légumes fruits',
  },
  {
    id: 'mars-hydro-fc-e1500',
    pourquoi: (l) =>
      `Un panneau à barres de ${nb(l.puissance_w)} W, avec ${nb(l.ppf!)} µmol/s de PPF publié, soit ${nb(efficacite(l), 2)} µmol/J : il produit beaucoup de lumière pour l'électricité consommée. Il couvre ${m2(l.couverture_m2!.floraison)} m² en floraison, où il dépasse largement les 500 µmol/m²/s des tomates : on peut le régler plus bas au variateur. Les barres répartissent la lumière plus régulièrement qu'un petit panneau.`,
    pourQui: 'une tente de 60 × 60 cm de légumes fruits, en gardant de la marge',
  },
  {
    id: 'spider-farmer-se1500',
    pourquoi: (l) =>
      `Un panneau à barres de 41 × 41 cm, ${nb(l.puissance_w)} W, ${nb(l.ppf!)} µmol/s de PPF publié, soit ${nb(efficacite(l), 2)} µmol/J. Il couvre ${m2(l.couverture_m2!.floraison)} m² (environ 70 × 70 cm), en croissance comme en floraison, avec près de ${nb(ppfdMoyen(l, 'floraison'))} µmol/m²/s : assez pour des tomates en fruits. Variateur intégré pour les premiers stades.`,
    pourQui: 'une tente de 70 × 70 cm de tomates, poivrons ou piments',
  },
  {
    id: 'spider-farmer-sf2000',
    pourquoi: (l) =>
      `Un panneau allongé de 65 × 27 cm et ${nb(l.puissance_w)} W. Le fabricant annonce un PPF qui ne colle pas avec l'efficacité qu'il publie : nous retenons la valeur prudente de ${nb(l.ppf!)} µmol/s, calculée d'après cette efficacité. Il couvre ${m2(l.couverture_m2!.floraison)} m² en floraison et ${m2(l.couverture_m2!.croissance)} m² en croissance. Sa forme convient bien à un bac ou une tente rectangulaire.`,
    pourQui: 'une tente de 80 × 80 cm ou un espace plus long que large',
  },
  {
    id: 'spider-farmer-se3000',
    pourquoi: (l) =>
      `Un panneau à barres de 60 × 58 cm et ${nb(l.puissance_w)} W, avec ${nb(l.ppf!)} µmol/s de PPF (valeur prudente de l'annonce). Il couvre ${m2(l.couverture_m2!.floraison)} m², environ 90 × 90 cm, avec près de ${nb(ppfdMoyen(l, 'floraison'))} µmol/m²/s : de la marge pour des légumes fruits, à baisser au variateur pour les salades. À cette puissance, une extraction d'air devient nécessaire dans la tente.`,
    pourQui: 'une tente de 80 × 80 ou 90 × 90 cm bien remplie',
  },
  {
    id: 'spider-farmer-sf4000',
    pourquoi: (l) =>
      `Un grand panneau de 65 × 54 cm et ${nb(l.puissance_w)} W, avec ${nb(l.ppf!)} µmol/s de PPF publié par le fabricant. Il couvre ${m2(l.couverture_m2!.floraison)} m² en floraison (120 × 120 cm) avec environ ${nb(ppfdMoyen(l, 'floraison'))} µmol/m²/s, et jusqu'à ${m2(l.couverture_m2!.croissance)} m² pour des cultures de feuilles. Une seule lampe à suspendre pour une grande tente, avec variateur.`,
    pourQui: 'une tente de 120 × 120 cm, légumes fruits ou grandes cultures de feuilles',
  },
  {
    id: 'mars-hydro-fc-e4800',
    pourquoi: (l) =>
      `Un cadre de barres de 86 × 85 cm, ${nb(l.puissance_w)} W, ${nb(l.ppf!)} µmol/s de PPF publié, soit ${nb(efficacite(l), 2)} µmol/J. Les barres sont réparties sur presque toute la largeur : la lumière tombe de façon plus égale qu'avec un seul panneau central. Il couvre ${m2(l.couverture_m2!.floraison)} m² avec près de ${nb(ppfdMoyen(l, 'floraison'))} µmol/m²/s. C'est la plus puissante de la sélection : réservée aux grands espaces bien ventilés.`,
    pourQui: 'une tente de 120 × 120 cm, quand on veut le moins de zones sombres possible',
  },
];

export interface Produit {
  rang: number;
  id: string;
  nom: string;
  lien: string;
  /** Illustration générée (figure signalée « Illustration »). */
  image: string;
  chiffres: [string, string][];
  pourquoi: string;
  pourQui: string;
}

/** Date au format « 19 octobre 2026 ». */
function dateLongue(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export interface Sujet {
  /** Partie de l'adresse : top-10-<slug>.html */
  slug: string;
  onglet: string;
  /** « Top 10 des … » (h1) */
  titre: string;
  /** <title>, sans « — Kultiled » (60 caractères au plus en tout) */
  titrePage: string;
  description: string;
  intro: string;
  /** Date de vérification des produits (AAAA-MM-JJ). */
  verifieLe: string;
  produits: () => Produit[];
  choisir: string;
  questions: { q: string; r: string }[];
}

/** Lampes publiables : disponibles, avec un PPF et une surface couverte. */
export function lampeRetenue(l: Lampe): boolean {
  return l.ppf !== null && l.couverture_m2 !== null && l.disponible !== false;
}

function chiffresLampe(l: Lampe): [string, string][] {
  const c = l.couverture_m2!;
  const surface = c.croissance === c.floraison ? `${m2(c.croissance)} m²` : `${m2(c.croissance)} m² (${m2(c.floraison)} en fruits)`;
  return [
    ['Efficacité', `${nb(efficacite(l), 2)} µmol/J`],
    ['Lumière émise', `${nb(l.ppf!)} µmol/s${l.ppf_estime ? ' (estimé)' : ''}`],
    ['Puissance', `${nb(l.puissance_w)} W`],
    ['Surface couverte', surface],
  ];
}

/** Les 10 lampes les plus efficaces (µmol/J), à égalité la plus lumineuse d'abord. */
export function classementLampes(): Produit[] {
  return LAMPES.filter((l) => lampeRetenue(l) && FICHES.some((f) => f.id === l.id))
    .sort((a, b) => efficacite(b) - efficacite(a) || b.ppf! - a.ppf!)
    .slice(0, TAILLE)
    .map((lampe, i) => {
      const f = FICHES.find((x) => x.id === lampe.id)!;
      return {
        rang: i + 1,
        id: lampe.id,
        nom: lampe.nom,
        lien: lienAmazon(lampe),
        image: imageLampe(lampe, '(min-width: 760px) 360px, 92vw'),
        chiffres: chiffresLampe(lampe),
        pourquoi: `N° ${i + 1} de la sélection pour l’efficacité. ${f.pourquoi(lampe)}`,
        pourQui: f.pourQui,
      };
    });
}

export interface Tente {
  id: string;
  nom: string;
  marque: string;
  asin: string;
  dimensions_cm: [number, number, number];
  toile_d: number;
  illustration: string;
  annonce: string[];
}
const TENTES = brutTentes as unknown as { verifie_le: string; classement_le: string; tentes: Tente[] };

const liste = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}` : items[0] ?? '');

/** Lampe de notre sélection que le calculateur propose pour des tomates en fruits sur cette surface. */
function lampePourTente(t: Tente): string {
  const surface = (t.dimensions_cm[0] * t.dimensions_cm[1]) / 10000;
  // Tente basse : niveau de lumière des salades (250) ; sinon celui des tomates en fruits (500).
  const h = t.dimensions_cm[2];
  const fruits = h >= 150;
  const culture = h >= 180 ? 'des tomates en fruits' : fruits ? 'des piments en fruits' : 'des salades';
  const [p] = lampesConseillees(((fruits ? 500 : 250) * surface) / COEF_UTILISATION, surface, fruits ? 'floraison' : 'croissance', 1);
  return p ? `Pour ${culture} sur cette surface, le calculateur propose par exemple ${p.nombre > 1 ? `${p.nombre} × ` : ''}${echapper(p.lampe.nom)}.` : '';
}

/** Les tentes dans l'ordre du classement (tentes.json), avec des textes tirés des seules données. */
export function classementTentes(): Produit[] {
  return TENTES.tentes.slice(0, TAILLE).map((t, i) => {
    const [l, p, h] = t.dimensions_cm;
    const surface = (l * p) / 10000;
    const toile = t.toile_d >= 1000 ? `toile épaisse de ${t.toile_d}D, parmi les plus solides de la sélection` : `toile de ${t.toile_d}D, plus légère`;
    const hauteur =
      h >= 180
        ? 'Sa hauteur laisse la place à des légumes fruits comme la tomate, avec la lampe suspendue au-dessus.'
        : h >= 150
          ? 'Sa hauteur convient aux salades, aux aromatiques et aux légumes fruits compacts, comme les piments.'
          : 'Sa hauteur convient aux salades, aux aromatiques et aux jeunes plants, moins aux tomates.';
    const pourQui =
      l !== p
        ? 'un espace long et étroit, le long d’un mur, pour des salades ou des légumes fruits compacts'
        : surface <= 0.36
          ? 'une première tente de salades, d’aromatiques ou de semis'
          : surface < 1.2
            ? 'quelques pieds de tomates, poivrons ou piments, ou une grande culture de salades'
            : 'une grande culture de légumes fruits, plusieurs pieds de tomates ou de poivrons à la fois';
    return {
      rang: i + 1,
      id: t.id,
      nom: t.nom,
      lien: lienAmazonAsin(t.asin),
      image: `<figure class="lampe__image"><img src="images/tentes/${t.illustration}-400.webp" srcset="images/tentes/${t.illustration}-400.webp 400w, images/tentes/${t.illustration}-800.webp 800w" sizes="(min-width: 760px) 360px, 92vw" width="800" height="600" alt="Illustration : tente de culture de ${l} × ${p} × ${h} cm" loading="lazy" decoding="async" /><figcaption>Illustration</figcaption></figure>`,
      chiffres: [
        ['Dimensions', `${l} × ${p} × ${h} cm`],
        ['Surface au sol', `${m2(surface)} m²`],
        ['Hauteur', `${h} cm`],
        ['Toile', `${t.toile_d}D`],
      ],
      pourquoi: `N° ${i + 1} de la sélection selon la note des acheteurs sur Amazon.fr. Une tente de ${l} × ${p} cm au sol et ${h} cm de haut, en ${toile}. La fiche du produit annonce : ${liste(t.annonce)}. ${hauteur} ${lampePourTente(t)}`.trim(),
      pourQui,
    };
  });
}

/** Sujets, dans l'ordre des onglets. On n'ajoute un sujet que s'il a 10 vrais produits. */
export const SUJETS: Sujet[] = [
  {
    slug: 'lampes-led-de-culture',
    onglet: 'Lampes LED de culture',
    titre: 'Top 10 des lampes LED de culture',
    titrePage: 'Top 10 des lampes LED de culture',
    description: 'Notre sélection des 10 lampes LED de culture les plus efficaces, classées en µmol/J d’après les chiffres publiés : lumière émise, puissance et surface couverte.',
    intro:
      'Notre sélection de lampes vendues sur Amazon.fr, classée de la plus efficace à la moins efficace : l’efficacité (en µmol/J) dit combien de lumière utile la lampe produit pour chaque watt consommé. Les chiffres sont ceux publiés par les fabricants ; une lampe en rupture ou sans chiffre de lumière n’entre pas dans le classement. Nous n’avons pas testé ces lampes nous-mêmes.',
    verifieLe: LAMPES_VERIFIEES_LE,
    produits: classementLampes,
    choisir: `<ol class="top10__etapes">
          <li><strong>Mesurez la surface à éclairer</strong> : étagère, bac ou tente. La lampe doit la couvrir en entier, sinon les bords restent dans l'ombre.</li>
          <li><strong>Visez le bon niveau de lumière</strong> : environ 150 µmol/m²/s pour des semis, 250 pour des salades, 500 pour des tomates en fruits. Une lampe à variateur s'adapte à tous les stades.</li>
          <li><strong>Comparez en µmol/J, pas en watts</strong> : à puissance égale, une lampe à 2,7 µmol/J donne près de deux fois plus de lumière utile qu'une lampe à 1,5.</li>
        </ol>
        <p>Pour une surface ou une culture précise, le <a href="index.html#calculateur">calculateur</a> choisit la lampe avec vos dimensions.</p>`,
    questions: [
      {
        q: 'Pourquoi classer par efficacité et pas par puissance ?',
        r: 'Les watts disent ce que la lampe consomme, pas la lumière qu’elle produit. Deux lampes de 100 W de cette sélection émettent 190 et 249 µmol/s : la plus efficace éclaire davantage pour la même facture.',
      },
      {
        q: 'La lampe n° 1 convient-elle à tout le monde ?',
        r: 'Non : le classement dit quelle lampe éclaire le mieux pour l’électricité consommée, pas laquelle correspond à votre espace. Choisissez d’abord une lampe qui couvre votre surface (voir « Idéale pour »), puis la plus efficace parmi celles-là.',
      },
      {
        q: 'À quelle hauteur placer la lampe ?',
        r: 'Suivez d’abord la notice du fabricant. Repères habituels : 10 à 30 cm pour les réglettes, 20 à 30 cm pour une petite barre, 30 à 60 cm pour un panneau de 100 à 300 W. Si les feuilles pâlissent, remontez la lampe ou baissez le variateur.',
      },
    ],
  },
  {
    slug: 'tentes-de-culture',
    onglet: 'Tentes de culture',
    titre: 'Top 10 des tentes de culture',
    titrePage: 'Top 10 des tentes de culture',
    description: 'Notre sélection de 10 tentes de culture d’intérieur, de 60 × 60 à 120 × 120 cm, avec leurs vrais chiffres : dimensions, surface au sol et épaisseur de toile.',
    intro: `Notre sélection de tentes vendues sur Amazon.fr, classée selon la note moyenne des acheteurs relevée le ${dateLongue(TENTES.classement_le)} ; à égalité, la plus évaluée passe d’abord. Les notes servent à classer mais ne sont pas affichées : elles sont sur la page de chaque produit. Les chiffres sont ceux des fiches ; nous n’avons pas testé ces tentes nous-mêmes.`,
    verifieLe: TENTES.verifie_le,
    produits: classementTentes,
    choisir: `<ol class="top10__etapes">
          <li><strong>Partez de la surface à cultiver</strong> : 60 × 60 cm pour des salades et des aromatiques, 80 × 80 à 100 × 100 cm pour quelques pieds de tomates, 120 × 120 cm pour une grande culture. La lampe doit couvrir tout le sol de la tente.</li>
          <li><strong>Vérifiez la hauteur</strong> : il faut la place de la lampe, de ses suspentes, des plantes adultes et d'une trentaine de centimètres entre les feuilles et la lampe. Comptez au moins 160 à 180 cm pour des tomates.</li>
          <li><strong>Regardez la toile</strong> : le chiffre en D (denier) dit son épaisseur. Une toile de 1680D est plus solide et plus opaque qu'une toile de 600D ; les fermetures éclair doivent bien fermer pour que la lumière ne s'échappe pas.</li>
        </ol>
        <p>Pour la lampe qui va dans la tente, voir le <a href="top-10-lampes-led-de-culture.html">Top 10 des lampes LED de culture</a> et le parcours <a href="tente.html">J'ai une tente de culture</a>.</p>`,
    questions: [
      {
        q: 'Quelle taille de tente choisir pour commencer ?',
        r: 'Pour des salades, des aromatiques ou des semis, une tente de 60 × 60 cm suffit et se place dans un coin de pièce. Pour des tomates, des poivrons ou des piments, visez 80 × 80 cm ou plus, et au moins 160 cm de haut.',
      },
      {
        q: 'Faut-il ajouter une extraction d’air ?',
        r: 'Oui, dès que la lampe chauffe ou que les plantes sont nombreuses : l’air renouvelé évite la chaleur et l’humidité excessives, et limite les moisissures. Une petite tente de salades peut se contenter d’ouvrir régulièrement ; une tente de légumes fruits a besoin d’un extracteur.',
      },
      {
        q: 'Que veulent dire 600D et 1680D ?',
        r: 'C’est l’épaisseur des fils de la toile, en deniers. Plus le chiffre est élevé, plus la toile est épaisse, solide et opaque. Une toile de 600D convient pour débuter ; une toile de 1680D résiste mieux aux déchirures et aux manipulations répétées.',
      },
    ],
  },
];

/** Sujets publiés : seulement ceux qui ont exactement 10 produits. */
export function sujetsPublies(): Sujet[] {
  return SUJETS.filter((s) => s.produits().length === TAILLE);
}

export const fichierSujet = (s: Sujet) => `${PREFIXE_TOP_10}-${s.slug}.html`;

/** Adresse canonique des pages qui reprennent une autre page (top-10.html → premier onglet). */
export function canoniquesTop10(): Record<string, string> {
  const premier = sujetsPublies()[0];
  return premier ? { [FICHIER_TOP_10]: fichierSujet(premier) } : {};
}

function onglets(actif: Sujet): string {
  const liens = sujetsPublies()
    .map((s) => `<li><a href="${fichierSujet(s)}"${s === actif ? ' aria-current="page"' : ''}>${s.onglet}</a></li>`)
    .join('');
  return `<nav class="top10__onglets" aria-label="Top 10 par sujet"><ul>${liens}</ul></nav>`;
}

function carte(p: Produit): string {
  const chiffres = p.chiffres.map(([libelle, valeur]) => `<div><dt>${libelle}</dt><dd>${valeur}</dd></div>`).join('');
  return `<li class="top10__produit" id="${p.id}">
          <span class="top10__rang" aria-hidden="true">${p.rang}</span>
          ${p.image}
          <div class="top10__texte">
            <h2><span class="visuellement-cache">N° ${p.rang} : </span>${echapper(p.nom)}</h2>
            <dl class="top10__chiffres">${chiffres}</dl>
            <p><strong>Pourquoi elle est dans le top.</strong> ${p.pourquoi}</p>
            <p><strong>Idéale pour</strong> ${p.pourQui}.</p>
            <p class="top10__achat"><a class="bouton bouton--plein" href="${p.lien}" target="_blank" rel="sponsored noopener">Voir sur Amazon</a><small>Lien partenaire</small></p>
          </div>
        </li>`;
}

/** Page HTML (avec marqueurs) d'un onglet ; `fichier` est l'adresse publiée. */
export function sourcePageTop10(s: Sujet): string {
  const produits = s.produits();
  const questions = s.questions.map((x) => `<details><summary>${x.q}</summary><p>${x.r}</p></details>`).join('\n        ');
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${echapper(s.description)}" />
    <meta name="date-modification" content="${s.verifieLe}" />
    <title>${s.titrePage} — Kultiled</title>
    <!--#head-->
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="top10">
      <div class="conteneur">
        <p class="fil"><a href="index.html">Accueil</a> › Top 10</p>
        ${onglets(s)}
        <header class="top10__tete">
          <h1>${s.titre}</h1>
          <p class="top10__intro">${s.intro}</p>
          <p class="top10__mention"><strong>Liens sponsorisés.</strong> ${MENTION_AFFILIATION} Ni prix ni note ne sont affichés : ils sont sur la page de chaque produit. Sélection vérifiée le <time datetime="${s.verifieLe}">${dateLongue(s.verifieLe)}</time>.</p>
        </header>
        <ol class="top10__liste">
        ${produits.map(carte).join('\n        ')}
        </ol>
        <section class="top10__bloc" id="choisir">
          <h2>Comment choisir</h2>
          ${s.choisir}
        </section>
        <section class="top10__bloc top10__questions" id="questions">
          <h2>Questions fréquentes</h2>
        ${questions}
        </section>
        <p class="top10__note">Les illustrations sont générées d'après la description des produits ; ce ne sont pas des photos. ${s.slug === 'lampes-led-de-culture' ? 'Voir aussi <a href="meilleures-lampes.html">les meilleures lampes par installation</a>.' : ''}</p>
      </div>
    </main>
    <!--#footer-->
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

/** Pages générées : top-10.html (premier onglet) et une page par sujet publié. */
export function pagesTop10(): Map<string, string> {
  const sujets = sujetsPublies();
  const pages = new Map(sujets.map((s) => [fichierSujet(s), sourcePageTop10(s)]));
  if (sujets[0]) pages.set(FICHIER_TOP_10, sourcePageTop10(sujets[0]));
  return pages;
}
