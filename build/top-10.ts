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
import brutKits from '../src/data/top-10/kits-complets.json' with { type: 'json' };
import brutHydro from '../src/data/top-10/kits-hydroponiques.json' with { type: 'json' };
import brutExtracteurs from '../src/data/top-10/extracteurs-ventilateurs.json' with { type: 'json' };
import brutMesure from '../src/data/top-10/minuteurs-thermometres.json' with { type: 'json' };
import brutSubstrats from '../src/data/top-10/terreaux-substrats.json' with { type: 'json' };
import brutSemis from '../src/data/top-10/lampes-semis.json' with { type: 'json' };
import brutPetitEspace from '../src/data/top-10/lampes-petit-espace.json' with { type: 'json' };
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
        pourquoi: f.pourquoi(lampe),
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
      pourquoi: `Une tente de ${l} × ${p} cm au sol et ${h} cm de haut, en ${toile}. La fiche du produit annonce : ${liste(t.annonce)}. ${hauteur} ${lampePourTente(t)}`.trim(),
      pourQui,
    };
  });
}

/** Fichier de produits d'un sujet (src/data/top-10/<slug>.json), déjà dans l'ordre du classement. */
export interface FichierProduits {
  verifie_le: string;
  classement_le: string;
  produits: {
    id: string;
    nom: string;
    asin: string;
    /** Illustration générée : public/images/top-10/<slug>/<illustration>-400.webp et -800.webp */
    illustration: string;
    chiffres: [string, string][];
    /** Une phrase factuelle tirée de la fiche du produit ou de nos données. */
    description: string;
    /** Éléments annoncés dans la fiche du produit. */
    annonce: string[];
    pour_qui: string;
  }[];
}

/** Produits d'un sujet décrit par un fichier de données (textes tirés des seules fiches). */
export function produitsDuFichier(slug: string, f: FichierProduits, type: string): Produit[] {
  return f.produits.slice(0, TAILLE).map((x, i) => ({
    rang: i + 1,
    id: x.id,
    nom: x.nom,
    lien: lienAmazonAsin(x.asin),
    image: `<figure class="lampe__image"><img src="images/top-10/${slug}/${x.illustration}-400.webp" srcset="images/top-10/${slug}/${x.illustration}-400.webp 400w, images/top-10/${slug}/${x.illustration}-800.webp 800w" sizes="(min-width: 760px) 360px, 92vw" width="800" height="600" alt="Illustration : ${echapper(type)}" loading="lazy" decoding="async" /><figcaption>Illustration</figcaption></figure>`,
    chiffres: x.chiffres,
    pourquoi: `${x.description} La fiche du produit annonce : ${liste(x.annonce)}.`,
    pourQui: x.pour_qui,
  }));
}

const KITS = brutKits as unknown as FichierProduits;
const HYDRO = brutHydro as unknown as FichierProduits;
const EXTRACTEURS = brutExtracteurs as unknown as FichierProduits;
const MESURE = brutMesure as unknown as FichierProduits;
const SUBSTRATS = brutSubstrats as unknown as FichierProduits;
const SEMIS = brutSemis as unknown as FichierProduits;
const PETIT_ESPACE = brutPetitEspace as unknown as FichierProduits;

/** Intro commune des sujets classés selon la note des acheteurs. */
const introNote = (quoi: string, f: FichierProduits, feminin = false) =>
  `Notre sélection de ${quoi} ${feminin ? 'vendues' : 'vendus'} sur Amazon.fr, ${feminin ? 'classées' : 'classés'} selon la note moyenne des acheteurs relevée le ${dateLongue(f.classement_le)} ; à égalité, ${feminin ? 'la plus évaluée' : 'le plus évalué'} passe d’abord, et seuls les produits disponibles avec au moins 10 évaluations sont retenus. Les notes servent à classer mais ne sont pas affichées. Nous n’avons pas testé ces produits nous-mêmes.`;

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
  {
    slug: 'kits-complets',
    onglet: 'Kits complets',
    titre: 'Top 10 des kits complets pour débuter',
    titrePage: 'Top 10 des kits de culture complets',
    description: 'Notre sélection de 10 kits de culture d’intérieur tout compris (tente, lampe LED, extraction d’air), avec leurs vrais chiffres : taille, puissance et contenu.',
    intro: introNote('kits complets (tente, lampe et ventilation)', KITS),
    verifieLe: KITS.verifie_le,
    produits: () => produitsDuFichier('kits-complets', KITS, 'tente de culture équipée d’une lampe LED et d’une extraction d’air'),
    choisir: `<ol class="top10__etapes">
          <li><strong>Choisissez d'abord la taille de la tente</strong> : 60 × 60 cm pour des salades et des aromatiques, 80 × 80 à 100 × 100 cm pour quelques pieds de tomates. C'est elle qui fixe la lampe à prévoir.</li>
          <li><strong>Regardez la lampe du kit</strong> : sa puissance réelle en watts, et si possible sa lumière émise (PPF, en µmol/s). Un kit dont la fiche ne publie pas le PPF est plus difficile à juger ; le <a href="index.html#calculateur">calculateur</a> dit combien il en faut pour votre culture.</li>
          <li><strong>Vérifiez la ventilation</strong> : un extracteur avec filtre à charbon renouvelle l'air et limite les odeurs ; un ventilateur à pince brasse l'air entre les plants.</li>
        </ol>
        <p>Pour composer votre kit vous-même, voir le <a href="top-10-tentes-de-culture.html">Top 10 des tentes</a> et le <a href="top-10-lampes-led-de-culture.html">Top 10 des lampes</a>.</p>`,
    questions: [
      {
        q: 'Un kit complet vaut-il mieux que des éléments achetés séparément ?',
        r: 'Un kit évite d’oublier une pièce et garantit que tout s’assemble. Acheter séparément permet de choisir une lampe dont les chiffres sont publiés et bien adaptée à la surface. Les deux se valent si la lampe du kit couvre bien la tente.',
      },
      {
        q: 'Le filtre à charbon est-il indispensable ?',
        r: 'Il retient les odeurs de l’air extrait, utile dans un logement. Pour des salades ou des aromatiques, l’extracteur seul suffit souvent ; le filtre se branche sur l’extracteur, à l’intérieur de la tente.',
      },
      {
        q: 'Quelle consommation d’électricité prévoir ?',
        r: 'Surtout celle de la lampe : une lampe de 150 W allumée 16 heures par jour consomme environ 880 kWh par an. L’extracteur ajoute peu. Le calculateur donne le coût avec votre prix du kWh.',
      },
    ],
  },
  {
    slug: 'kits-hydroponiques',
    onglet: 'Hydroponie',
    titre: 'Top 10 des kits hydroponiques',
    titrePage: 'Top 10 des kits hydroponiques d’intérieur',
    description: 'Notre sélection de 10 kits hydroponiques pour l’intérieur, du potager de table aux systèmes à seaux, avec leurs vrais chiffres : emplacements, lampe, réservoir.',
    intro: introNote('kits hydroponiques', HYDRO),
    verifieLe: HYDRO.verifie_le,
    produits: () => produitsDuFichier('kits-hydroponiques', HYDRO, 'kit de culture hydroponique'),
    choisir: `<ol class="top10__etapes">
          <li><strong>Potager de table ou système à seaux ?</strong> Un potager de table, avec sa lampe intégrée, convient aux aromatiques et aux salades. Un système à seaux (DWC) accueille de grosses plantes, mais demande une tente ou une lampe à part.</li>
          <li><strong>Regardez le réservoir</strong> : plus il est grand, moins il faut remettre de l'eau et de l'engrais. Un indicateur de niveau évite que la pompe tourne à sec.</li>
          <li><strong>Vérifiez la lampe</strong> : une lampe réglable en hauteur suit la pousse des plantes, et une minuterie l'allume chaque jour à la même heure.</li>
        </ol>
        <p>Pour le pH et la conductivité de la solution, voir le guide <a href="culture-nutriments.html">Arrosage, nutriments, pH et EC</a>.</p>`,
    questions: [
      {
        q: 'Qu’est-ce que la culture hydroponique ?',
        r: 'Les racines poussent dans de l’eau enrichie en engrais au lieu de la terre. La plante trouve tout ce qu’il lui faut dans la solution ; il faut seulement surveiller le niveau d’eau, l’engrais et l’éclairage.',
      },
      {
        q: 'Quelles plantes cultiver dans un potager de table ?',
        r: 'Surtout des aromatiques (basilic, persil, ciboulette, menthe) et des salades à couper. Les tomates naines sont possibles dans les modèles hauts, mais les grandes plantes demandent un système à seaux.',
      },
      {
        q: 'Faut-il changer l’eau ?',
        r: 'Oui : on complète le réservoir au fil des jours, et on le vide et le nettoie toutes les deux à trois semaines pour repartir avec une solution neuve. Suivez la notice et la dose d’engrais du fabricant.',
      },
    ],
  },
  {
    slug: 'extracteurs-ventilateurs',
    onglet: 'Extracteurs et ventilateurs',
    titre: 'Top 10 des extracteurs d’air et ventilateurs',
    titrePage: 'Top 10 des extracteurs d’air et ventilateurs',
    description: 'Notre sélection de 10 extracteurs d’air, kits de ventilation et ventilateurs à pince pour tente de culture, avec leurs vrais chiffres : diamètre, débit, moteur.',
    intro: introNote('extracteurs d’air, kits de ventilation et ventilateurs', EXTRACTEURS),
    verifieLe: EXTRACTEURS.verifie_le,
    produits: () => produitsDuFichier('extracteurs-ventilateurs', EXTRACTEURS, 'extracteur d’air ou ventilateur pour tente de culture'),
    choisir: `<ol class="top10__etapes">
          <li><strong>Un extracteur et un ventilateur ne font pas le même travail</strong> : l'extracteur renouvelle l'air de la tente (il sort l'air chaud et humide), le ventilateur à pince brasse l'air entre les plants. Une tente de légumes fruits a besoin des deux.</li>
          <li><strong>Choisissez le diamètre selon la tente</strong> : 100 mm pour une tente de 60 × 60 à 80 × 80 cm, 150 mm pour 100 × 100 à 120 × 120 cm. Le diamètre doit correspondre au filtre et à la gaine.</li>
          <li><strong>Préférez un régulateur de vitesse</strong> : un extracteur réglé à mi-vitesse fait moins de bruit et suffit souvent. Un moteur EC consomme moins et se règle plus finement.</li>
        </ol>
        <p>Pour la température et l'humidité à viser, voir le guide <a href="culture-climat.html">Température, humidité et ventilation</a>.</p>`,
    questions: [
      {
        q: 'Quel débit d’extracteur faut-il pour ma tente ?',
        r: 'Repère courant : de quoi renouveler tout l’air de la tente au moins une fois par minute. Une tente de 120 × 120 × 200 cm contient environ 2,9 m³, soit au moins 175 m³/h ; on prend de la marge pour le filtre et la gaine, qui freinent l’air.',
      },
      {
        q: 'Le filtre à charbon se met-il avant ou après l’extracteur ?',
        r: 'En général à l’intérieur de la tente, en haut, avant l’extracteur : l’air traverse le filtre, puis l’extracteur le rejette par la gaine. Le diamètre du filtre doit être le même que celui de l’extracteur.',
      },
      {
        q: 'Un ventilateur à pince suffit-il sans extracteur ?',
        r: 'Pour une petite tente de salades qu’on ouvre souvent, parfois. Mais il ne fait que brasser l’air : il ne sort ni la chaleur ni l’humidité. Dès que la lampe chauffe ou que les plants sont nombreux, il faut un extracteur.',
      },
    ],
  },
  {
    slug: 'minuteurs-thermometres',
    onglet: 'Minuteurs et thermomètres',
    titre: 'Top 10 des minuteurs, thermomètres et hygromètres',
    titrePage: 'Top 10 minuteurs et thermo-hygromètres',
    description: 'Notre sélection de 10 minuteries et thermo-hygromètres pour cultiver en intérieur, avec leurs vrais chiffres : mesure, précision, puissance maximale.',
    intro: introNote('minuteries et thermo-hygromètres', MESURE),
    verifieLe: MESURE.verifie_le,
    produits: () => produitsDuFichier('minuteurs-thermometres', MESURE, 'minuterie ou thermo-hygromètre'),
    choisir: `<ol class="top10__etapes">
          <li><strong>Une minuterie pour la lampe</strong> : les plantes ont besoin d'heures de lumière régulières et d'une vraie nuit. Une minuterie mécanique suffit ; une numérique permet des horaires différents selon les jours.</li>
          <li><strong>Vérifiez la puissance maximale</strong> : elle doit dépasser celle de la lampe (et de tout ce qui est branché dessus). Les modèles de cette sélection acceptent 3 600 à 3 680 W.</li>
          <li><strong>Un thermo-hygromètre dans la tente</strong> : placé à hauteur des feuilles, il dit si l'air est trop chaud ou trop humide. La mémoire des maximums et minimums montre ce qui se passe la nuit.</li>
        </ol>
        <p>Pour les heures de lumière par culture, voir <a href="conseil-heures-de-lumiere-par-jour.html">Combien d'heures de lumière par jour ?</a> et les <a href="legumes.html">fiches légumes</a>.</p>`,
    questions: [
      {
        q: 'Combien d’heures programmer pour la lampe ?',
        r: 'Pour la plupart des légumes cultivés en intérieur, 14 à 16 heures par jour, avec une vraie période de nuit. Les fiches légumes donnent la durée conseillée pour chaque culture.',
      },
      {
        q: 'Quelle température et quelle humidité viser ?',
        r: 'Le jour, environ 15 à 22 °C pour les légumes feuilles et 20 à 29 °C pour les légumes fruits ; 50 à 70 % d’humidité pendant la croissance. Le guide Température, humidité et ventilation détaille ces repères stade par stade.',
      },
      {
        q: 'Où placer le thermo-hygromètre ?',
        r: 'À hauteur des feuilles, à l’ombre de la lampe et loin de l’extracteur : c’est là que l’air compte pour les plantes. Évitez de le poser au sol ou collé à la paroi.',
      },
    ],
  },
  {
    slug: 'terreaux-substrats',
    onglet: 'Terreaux et substrats',
    titre: 'Top 10 des terreaux et substrats',
    titrePage: 'Top 10 des terreaux et substrats d’intérieur',
    description: 'Notre sélection de 10 terreaux et substrats pour cultiver en intérieur : terreaux, fibre de coco, billes d’argile et perlite, avec volume et composition.',
    intro: introNote('terreaux et substrats', SUBSTRATS),
    verifieLe: SUBSTRATS.verifie_le,
    produits: () => produitsDuFichier('terreaux-substrats', SUBSTRATS, 'terreau ou substrat de culture'),
    choisir: `<ol class="top10__etapes">
          <li><strong>Terreau ou fibre de coco ?</strong> Un terreau enrichi nourrit les plantes au début et pardonne les oublis. La fibre de coco est très aérée et se travaille avec un engrais adapté, apporté à chaque arrosage.</li>
          <li><strong>Pensez au drainage</strong> : des billes d'argile au fond du pot, ou de la perlite mélangée au terreau, évitent que les racines baignent dans l'eau.</li>
          <li><strong>Prévoyez le bon volume</strong> : additionnez le volume de chaque pot et gardez un peu de marge ; les légumes fruits demandent des pots bien plus grands que les aromatiques.</li>
        </ol>
        <p>Pour aller plus loin, voir le guide <a href="culture-substrats.html">Substrats et hydroponie</a>.</p>`,
    questions: [
      {
        q: 'Peut-on utiliser un terreau de jardin en intérieur ?',
        r: 'Mieux vaut un terreau pour pots, plus léger et plus aéré. Un terreau de jardin se tasse en pot, sèche mal et peut apporter des moucherons.',
      },
      {
        q: 'Quelle différence entre billes d’argile et perlite ?',
        r: 'Les billes d’argile sont grosses et lourdes : on les met au fond du pot ou on les utilise seules en hydroponie. La perlite est fine et légère : on la mélange au terreau pour l’aérer.',
      },
      {
        q: 'Faut-il changer le terreau à chaque culture ?',
        r: 'Pour des légumes, c’est préférable : le terreau s’épuise et peut garder des maladies. On peut réutiliser la fibre de coco après l’avoir rincée, en surveillant l’apparition de moisissures.',
      },
    ],
  },
  {
    slug: 'lampes-semis',
    onglet: 'Lampes pour semis',
    titre: 'Top 10 des lampes pour semis',
    titrePage: 'Top 10 des lampes LED pour semis',
    description: 'Notre sélection de 10 lampes LED pour semis et jeunes plants : lampes à pince, barres d’étagère et lampes sur pied, avec leurs vrais chiffres.',
    intro: introNote('lampes pour semis', SEMIS, true),
    verifieLe: SEMIS.verifie_le,
    produits: () => produitsDuFichier('lampes-semis', SEMIS, 'lampe LED pour semis'),
    choisir: `<ol class="top10__etapes">
          <li><strong>Les semis demandent peu de lumière, mais tout près</strong> : environ 150 µmol/m²/s pendant 14 à 16 heures. Une petite lampe placée à 10 à 30 cm suffit ; trop loin, les tiges filent.</li>
          <li><strong>Couvrez tout le plateau</strong> : une lampe à une tête éclaire quelques godets ; pour un plateau entier, prenez plusieurs têtes ou des barres.</li>
          <li><strong>Une minuterie intégrée</strong> évite d'oublier d'allumer ou d'éteindre. Méfiez-vous des fiches sans aucun chiffre de lumière : le nombre de LED ne dit pas la lumière émise.</li>
        </ol>
        <p>Pour aller plus loin, voir le guide <a href="led-semis.html">LED pour semis et boutures</a> et le parcours <a href="debuter.html">Je débute</a>.</p>`,
    questions: [
      {
        q: 'Pourquoi mes semis s’allongent-ils et tombent-ils ?',
        r: 'Ils cherchent la lumière : la lampe est trop loin, trop faible ou allumée trop peu d’heures. Rapprochez-la à 10 à 30 cm et allumez-la 14 à 16 heures par jour.',
      },
      {
        q: 'Faut-il une lampe différente pour les semis et pour la suite ?',
        r: 'Pas forcément : une lampe réglable en hauteur ou en luminosité suit les plants. Mais les légumes fruits adultes demandent bien plus de lumière qu’une petite lampe de semis ; il faut alors un panneau horticole.',
      },
      {
        q: 'Une lampe de bureau ordinaire peut-elle servir ?',
        r: 'Pour un ou deux godets placés tout près, en appoint, parfois. Une lampe horticole, même petite, apporte plus de lumière utile sur toute la surface du plateau.',
      },
    ],
  },
  {
    slug: 'lampes-petit-espace',
    onglet: 'Lampes pour placard',
    titre: 'Top 10 des lampes LED pour petit espace ou placard',
    titrePage: 'Top 10 des lampes LED pour placard',
    description: 'Notre sélection de 10 lampes LED pour cultiver dans un placard, un meuble ou une petite tente, avec leur puissance réelle et leurs chiffres de lumière publiés.',
    intro: introNote('lampes pour petit espace', PETIT_ESPACE, true),
    verifieLe: PETIT_ESPACE.verifie_le,
    produits: () => produitsDuFichier('lampes-petit-espace', PETIT_ESPACE, 'lampe LED de culture pour petit espace'),
    choisir: `<ol class="top10__etapes">
          <li><strong>Regardez la puissance réelle, pas les « watts équivalents »</strong> : une lampe vendue « 600 W » peut n'en consommer que 65. Seule la puissance réelle dit la chaleur dégagée, ce qui compte dans un espace fermé.</li>
          <li><strong>Préférez une lampe qui publie sa lumière</strong> (PPF en µmol/s, ou efficacité en µmol/J) : c'est elle qui dit si les plantes auront assez de lumière.</li>
          <li><strong>Aérez le placard</strong> : même une petite lampe chauffe un espace clos. Laissez la porte entrouverte ou ajoutez un petit ventilateur.</li>
        </ol>
        <p>Pour la puissance à prévoir selon la surface, voir <a href="led-puissance.html">Quelle puissance pour ma surface ?</a>, ou le <a href="index.html#calculateur">calculateur</a>.</p>`,
    questions: [
      {
        q: 'Peut-on vraiment cultiver dans un placard ?',
        r: 'Oui, des aromatiques, des salades ou des micro-pousses. Il faut une lampe adaptée à la surface, une minuterie, et de l’air : sans aération, la chaleur et l’humidité montent vite.',
      },
      {
        q: 'Que veut dire « 100 W équivalent » ?',
        r: 'C’est une comparaison commerciale avec une ancienne ampoule, pas la consommation de la lampe. La puissance réelle est souvent dix fois plus faible ; c’est elle qu’il faut comparer, avec la lumière émise.',
      },
      {
        q: 'Une petite lampe suffit-elle pour des tomates ?',
        r: 'Non, sauf variété naine et lampe placée tout près. Les légumes fruits demandent environ 500 µmol/m²/s en floraison : il faut une lampe de 100 à 150 W réels pour 60 × 60 cm.',
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
            <p><strong>Pourquoi dans le top.</strong> ${p.pourquoi}</p>
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
