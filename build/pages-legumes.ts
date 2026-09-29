/**
 * Pages détaillées des cultures (legume-<id>.html), générées au build depuis src/data/legumes.json.
 * Elles n'existent pas sur le disque : le plugin du site les fournit à Vite (voir build/site.ts).
 * Chaque page suit le modèle d'article (fil d'Ariane, h1, chapô, sommaire) pour recevoir
 * la même mise en page que les guides.
 */
import { calculer, calculerDli, longueurBarreConseillee, nombrePlants, type ResultatCalcul, type Surface } from '../src/calc.ts';
import type { Legume, ParametresStade } from '../src/data.ts';
import { arrondiPuissance } from '../src/liste.ts';
import { imageLampe, lampesConseillees, lienAmazon, MENTION_AFFILIATION, type Proposition } from '../src/lampes.ts';
import { conseilsDeLaCulture, dateDuJour, THEMES } from './conseils.ts';
import { badgeDifficulte, chargerLegumes, DEPART_RECOLTE, delaiRecolte, echapper, libellesFloraison, miniature, slug, stadeLePlusExigeant } from './fiches.ts';

export { libellesFloraison, stadeLePlusExigeant };

export const PREFIXE_PAGE_LEGUME = 'legume-';

/** Doit rester identique au lien des fiches (build/fiches.ts, pageDetaillee). */
export function fichierLegume(id: string): string {
  return `${PREFIXE_PAGE_LEGUME}${id}.html`;
}

const nb = (n: number, decimales = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).replace(/ /g, ' ');
const plage = ([a, b]: [number, number], unite = '') => (a === b ? `${nb(a, a % 1 ? 1 : 0)}${unite}` : `${nb(a, a % 1 ? 1 : 0)} à ${nb(b, b % 1 ? 1 : 0)}${unite}`);

/** Réglages par défaut du calculateur, identiques à ceux de build/guides-achat.ts (vérifié par les tests ; pas d'import, qui serait circulaire). */
export const EFFICACITE = 2.7;
export const COEF_UTILISATION = 0.8;
const PRIX_KWH = 0.2;

/** Surface d'exemple d'une fiche : une installation du commerce à l'échelle de la culture. */
export interface SurfaceExemple {
  /** « une étagère de 60 × 30 cm » */
  nom: string;
  longueurM: number;
  largeurM: number;
  /** Pourquoi cette surface, quand ce n'est pas évident (phrase complète, facultative). */
  raison?: string;
}

const ETAGERE: SurfaceExemple = { nom: 'une étagère de 60 × 30 cm', longueurM: 0.6, largeurM: 0.3 };
const TENTE_60: SurfaceExemple = { nom: 'une tente de 60 × 60 cm', longueurM: 0.6, largeurM: 0.6 };
const TENTE_80: SurfaceExemple = { nom: 'une tente de 80 × 80 cm', longueurM: 0.8, largeurM: 0.8 };

/**
 * Surfaces d'exemple (mêmes formats que le guide led-puissance.html) :
 * - étagère de 60 × 30 cm (un niveau, quelques pots ou un plateau) pour les salades, aromatiques,
 *   micro-pousses, radis, et les plantes à fruits compactes (fraise, tomate naine) ;
 * - tente de 60 × 60 cm pour le poivron et le piment, dont un plant tient dans 45 cm environ ;
 * - tente de 80 × 80 cm pour les grands plants (tomate, concombre, aubergine, chanvre), plus hauts
 *   et plus larges, espacés de 50 cm ou plus ;
 * - safran et wasabi : plantes basses et peu gourmandes en lumière, cultivées en petite quantité
 *   (voir `raison`).
 */
const SURFACES_EXEMPLE: Record<string, SurfaceExemple> = {
  poivron: TENTE_60,
  piment: TENTE_60,
  tomate: TENTE_80,
  concombre: TENTE_80,
  aubergine: TENTE_80,
  'chanvre-cbd': TENTE_80,
  safran: {
    ...ETAGERE,
    raison: 'Le safran reste bas et ses cormes se plantent serrés : une jardinière posée sur une étagère suffit pour une première culture.',
  },
  wasabi: {
    ...ETAGERE,
    raison: 'Le wasabi demande peu de lumière et se cultive en petite quantité, dans une pièce fraîche : une étagère suffit pour quelques plants.',
  },
};

export function surfaceExemple(l: Legume): SurfaceExemple {
  return SURFACES_EXEMPLE[l.id] ?? ETAGERE;
}

function surfaceCalcul(s: SurfaceExemple): Surface {
  return { mode: 'rectangle', longueurM: s.longueurM, largeurM: s.largeurM };
}

/** Calcul de l'exemple, avec les réglages par défaut du calculateur (build/guides-achat.ts). */
export function exempleCalcul(p: ParametresStade, s: SurfaceExemple = ETAGERE): ResultatCalcul {
  return calculer({
    ppfd: p.ppfd.valeur,
    photoperiodeH: p.photoperiode.valeur,
    surface: surfaceCalcul(s),
    efficaciteUmolJ: EFFICACITE,
    coefUtilisation: COEF_UTILISATION,
    hauteurCm: p.hauteur_cm.valeur,
    longueurBarreM: longueurBarreConseillee(s.longueurM),
    prixKwh: PRIX_KWH,
    joursParAn: 365,
  });
}

/** Lien vers le calculateur, culture, stade dimensionnant et dimensions de l'exemple présélectionnés (voir src/etat.ts). */
export function lienCalculateur(l: Legume): string {
  const s = surfaceExemple(l);
  const p = new URLSearchParams({ l: l.id });
  if (stadeLePlusExigeant(l) === 'floraison') p.set('s', 'floraison');
  p.set('m', 'rectangle');
  p.set('L', String(s.longueurM).replace('.', ','));
  p.set('W', String(s.largeurM).replace('.', ','));
  return `index.html?${p.toString().replace(/&/g, '&amp;')}#calculateur`;
}

function ligne(libelle: string, valeur: string): string {
  return `<tr><th scope="row">${libelle}</th><td>${valeur}</td></tr>`;
}

function tableau(lignes: string[], legende: string): string {
  return `<div class="tableau-defile">
          <table class="tableau tableau--fiche" aria-label="${legende}">
            <tbody>
              ${lignes.join('\n              ')}
            </tbody>
          </table>
        </div>`;
}

function tableauLumiere(p: ParametresStade, legende: string): string {
  const dli = calculerDli(p.ppfd.valeur, p.photoperiode.valeur);
  return tableau(
    [
      ligne('PPFD au niveau des feuilles', `${nb(p.ppfd.valeur)} µmol/m²/s`),
      ligne('Durée d’éclairage', `${nb(p.photoperiode.valeur, p.photoperiode.valeur % 1 ? 1 : 0)} h par jour`),
      ligne('DLI obtenu', `${nb(dli, 1)} mol/m²/jour`),
      ligne('Hauteur des LED au-dessus du feuillage', plage(p.hauteur_cm.valeur, ' cm')),
      ligne('Spectre', echapper(p.spectre.valeur)),
    ],
    legende,
  );
}

function blocExemple(titre: string, r: ResultatCalcul, p: ParametresStade, s: SurfaceExemple): string {
  const b = r.barres;
  return `<h3>${titre}</h3>
        ${tableau(
          [
            ligne('Flux lumineux à émettre (PPF)', `${nb(r.ppfNecessaire)} µmol/s`),
            ligne('Puissance électrique', `environ ${nb(r.puissanceW)} W`),
            ligne('Barres LED', `${b.total} barre${b.total > 1 ? 's' : ''} de ${nb(longueurBarreConseillee(s.longueurM) * 100)} cm en ${b.lignesParZone} ligne${b.lignesParZone > 1 ? 's' : ''}, d’au moins ${nb(arrondiPuissance(b.puissanceParBarreNecessaireW))} W chacune`),
            ligne('Hauteur de suspension', plage(p.hauteur_cm.valeur, ' cm')),
            ligne('Consommation', `${nb(r.consoJourKwh, 2)} kWh par jour, soit ${nb(r.consoAnKwh)} kWh par an`),
            ligne('Coût annuel', `environ ${nb(r.coutAnEur ?? 0, (r.coutAnEur ?? 0) < 10 ? 1 : 0)} € à ${nb(PRIX_KWH, 2)} € le kWh`),
          ],
          titre,
        )}`;
}

function carteLampe(p: Proposition, r: ResultatCalcul): string {
  const l = p.lampe;
  return `<li class="lampe">
  ${imageLampe(l)}
  <h3>${p.nombre} × ${echapper(l.nom)}</h3>
  <p>${nb(p.ppfTotal)} µmol/s${l.ppf_estime ? ' (estimé)' : ''} pour ${nb(r.ppfNecessaire)} nécessaires · ${nb(p.puissanceW)} W au maximum · ${l.variateur ? 'avec variateur' : 'sans variateur'}</p>
  <a class="bouton" href="${lienAmazon(l)}" target="_blank" rel="sponsored noopener">Voir sur Amazon</a>
</li>`;
}

/**
 * Cultures dont la floraison précède la phase de feuillage (le safran fleurit à l'automne, puis
 * ses feuilles reconstituent les cormes) : la description donne les stades dans cet ordre.
 */
export const FLORAISON_AVANT_FEUILLAGE = new Set(['safran']);

/** Délai de récolte de la description, quand « première récolte » serait trompeur. */
function recolteDescription(l: Legume): string {
  const jours = `${plage(l.culture.jours_recolte.valeur)} jours`;
  // Wasabi : feuilles et pétioles se récoltent au bout de quelques mois, le rhizome bien plus tard.
  if (l.id === 'wasabi') return `feuilles au bout de quelques mois, rhizome en ${jours}`;
  return `première récolte en ${jours}`;
}

/** Description courte (balise meta), construite à partir des valeurs de la fiche (158 caractères au plus). */
export function descriptionLegume(l: Legume): string {
  const c = l.stades.croissance;
  const f = l.stades.floraison;
  const temperature = plage(l.culture.temperature_c.valeur, ' °C');
  let lumiere: string;
  if (f && FLORAISON_AVANT_FEUILLAGE.has(l.id)) {
    lumiere = `${f.ppfd.valeur} µmol/m²/s et ${nb(f.photoperiode.valeur)} h en floraison, puis ${c.ppfd.valeur} et ${nb(c.photoperiode.valeur)} h pour le feuillage`;
  } else {
    const ppfd = f ? `${c.ppfd.valeur} puis ${f.ppfd.valeur}` : `${c.ppfd.valeur}`;
    const heures = f && f.photoperiode.valeur !== c.photoperiode.valeur ? `${nb(c.photoperiode.valeur)} puis ${nb(f.photoperiode.valeur)}` : nb(c.photoperiode.valeur);
    lumiere = `${ppfd} µmol/m²/s, ${heures} h par jour`;
  }
  const valeurs = `${lumiere}, ${temperature} le jour, pH ${plage(l.culture.ph.valeur)}, ${recolteDescription(l)}.`;
  const complete = `${l.nom} en intérieur sous LED : ${valeurs}`;
  // Nom long (« Tomate naine (micro-tomate) ») : on raccourcit l'accroche plutôt que les valeurs.
  return complete.length <= 158 ? complete : `${l.nom} sous LED : ${valeurs}`;
}

/** Encadré « En bref » : les repères essentiels, pour le stade qui dimensionne l'installation. */
function enBref(l: Legume): string {
  const stade = stadeLePlusExigeant(l);
  const p = l.stades[stade] ?? l.stades.croissance;
  const precision = l.stades.floraison ? ` <small>en ${stade === 'floraison' ? libellesFloraison(l).court : 'croissance'}</small>` : '';
  const heures = nb(p.photoperiode.valeur, p.photoperiode.valeur % 1 ? 1 : 0);
  const d = l.difficulte;
  // Titre en paragraphe : un h2 serait numéroté comme les sections, sans figurer au sommaire.
  return `<section class="en-bref" id="en-bref" aria-label="En bref">
          <p class="en-bref__titre" aria-hidden="true">En bref</p>
          <dl>
            <div><dt>Lumière</dt><dd>${nb(p.ppfd.valeur)} µmol/m²/s${precision}</dd></div>
            <div><dt>Durée d’éclairage</dt><dd>${heures} h par jour${precision}</dd></div>
            <div><dt>Température (jour)</dt><dd>${plage(l.culture.temperature_c.valeur, ' °C')}</dd></div>
            <div><dt>Récolte</dt><dd>${delaiRecolte(l)}</dd></div>
            ${d ? `<div class="en-bref__difficulte"><dt>Difficulté</dt><dd>${badgeDifficulte(l)} <small>${echapper(d.source.replace(/^Critères OptiLED \(voir _lisezmoi\) : /, ''))}.</small></dd></div>` : ''}
          </dl>
        </section>`;
}

/** Contenu HTML complet (avec marqueurs) de la page détaillée d'une culture. */
export function sourcePageLegume(l: Legume, legumes: Legume[] = chargerLegumes(), date = dateDuJour()): string {
  const c = l.culture;
  const croissance = l.stades.croissance;
  const floraison = l.stades.floraison;
  const nom = echapper(l.nom);
  const depart = DEPART_RECOLTE[l.id] ?? 'après semis';

  const surface = surfaceExemple(l);
  const exempleCroissance = exempleCalcul(croissance, surface);
  const exempleFloraison = floraison ? exempleCalcul(floraison, surface) : null;
  const stadeLampes = stadeLePlusExigeant(l);
  const plus = stadeLampes === 'floraison' && exempleFloraison ? exempleFloraison : exempleCroissance;
  const libFloraison = libellesFloraison(l);
  // Pas de liens d'achat pour une culture soumise à une mise en garde (réglementation du chanvre…).
  const lampes = l.avertissement ? [] : lampesConseillees(plus.ppfNecessaire, plus.surfaceM2, stadeLampes);

  const espacement = c.espacement_cm.valeur;
  // Même espacement que celui pré-rempli par le calculateur (milieu de la plage, arrondi à 5 cm).
  const ecart = espacement ? Math.round((espacement[0] + espacement[1]) / 2 / 5) * 5 : 0;
  const plants = espacement ? nombrePlants(surfaceCalcul(surface), ecart) : null;
  const questions = conseilsDeLaCulture(l.id, date);

  const voisines = legumes.filter((v) => v.famille === l.famille && v.id !== l.id);

  const sections: { id: string; titre: string; html: string }[] = [
    {
      id: 'lumiere',
      titre: 'Besoins en lumière',
      html: floraison
        ? `${
            stadeLampes === 'floraison'
              ? `<p>La culture passe par deux stades : une phase de croissance (feuillage), puis une phase de ${libFloraison.de}, plus gourmande en lumière.</p>`
              : `<p>La culture passe par deux stades aux besoins différents : la croissance (feuillage) et ${libFloraison.la}. C’est la croissance qui demande le plus de lumière.</p>`
          }
        <h3>Croissance</h3>
        ${tableauLumiere(croissance, 'Lumière en croissance')}
        <h3>${libFloraison.titre}</h3>
        ${tableauLumiere(floraison, `Lumière en ${libFloraison.titre.toLowerCase()}`)}`
        : `<p>Cette culture se récolte avant la floraison : un seul réglage de lumière suffit pour tout le cycle.</p>
        ${tableauLumiere(croissance, 'Lumière')}`,
    },
    {
      id: 'exemple',
      titre: `Exemple : ${surface.nom}`,
      html: `<p>Pour ${surface.nom} (${nb(surface.longueurM * surface.largeurM, 2)} m²)${
        plants ? `, soit environ <strong>${plants.total} plant${plants.total > 1 ? 's' : ''}</strong> à ${nb(ecart)} cm d’écart` : ''
      }, avec des LED d’une efficacité de ${nb(EFFICACITE, 1)} µmol/J et ${nb(COEF_UTILISATION * 100)} % de la lumière qui atteint réellement la culture (les réglages par défaut du calculateur) :</p>
        ${surface.raison ? `<p>${echapper(surface.raison)}</p>` : ''}
        ${blocExemple(floraison ? 'En croissance' : 'Installation conseillée', exempleCroissance, croissance, surface)}
        ${exempleFloraison && floraison ? blocExemple(`En ${libFloraison.titre.toLowerCase()}`, exempleFloraison, floraison, surface) : ''}
        ${
          floraison
            ? stadeLampes === 'floraison'
              ? `<p>On dimensionne l’installation pour ${libFloraison.la}, le stade le plus exigeant, puis on baisse l’intensité avec un variateur pendant la croissance.</p>`
              : `<p>On dimensionne l’installation pour la croissance, le stade le plus exigeant, puis on baisse l’intensité avec un variateur pendant ${libFloraison.la}.</p>`
            : ''
        }
        <p>Pour une autre surface, le guide <a href="led-puissance.html">Quelle puissance pour ma surface ?</a> donne les watts à prévoir pour les étagères et tentes courantes.</p>
        <p><a class="bouton bouton--plein" href="${lienCalculateur(l)}">Calculer pour mes dimensions</a></p>`,
    },
    ...(lampes.length
      ? [
          {
            id: 'lampes',
            titre: 'Lampes du commerce qui conviennent',
            html: `<p>Quelques modèles de la <a href="lampes.html">sélection de lampes</a> qui fournissent assez de lumière pour ${surface.nom}${floraison ? ` en ${stadeLampes === 'floraison' ? libFloraison.titre.toLowerCase() : 'croissance'}` : ''}. D’autres lampes conviennent aussi : l’important est le PPF (en µmol/s) et la surface couverte.</p>
        <ul class="lampes">${lampes.map((p) => carteLampe(p, plus)).join('\n')}</ul>
        <p class="aide">Liens sponsorisés. ${MENTION_AFFILIATION}</p>`,
          },
        ]
      : []),
    {
      id: 'climat',
      titre: 'Température et humidité',
      html: `${tableau(
        [
          ligne('Température le jour', plage(c.temperature_c.valeur, ' °C')),
          ligne('Température la nuit', plage(c.temperature_nuit_c.valeur, ' °C')),
          ligne('À éviter', echapper(c.temperature_a_eviter.valeur)),
          ligne('Humidité relative', plage(c.humidite_pct.valeur, ' %')),
        ],
        'Température et humidité',
      )}
        <p>Pour régler le climat (ventilation, extraction, VPD), voir le guide <a href="culture-climat.html">Température, humidité et ventilation</a>.</p>`,
    },
    {
      id: 'nutrition',
      titre: 'Arrosage et solution nutritive',
      html: `${tableau(
        [ligne('pH de la solution', plage(c.ph.valeur)), ligne('EC de la solution', plage(c.ec_ms_cm.valeur, ' mS/cm'))],
        'Solution nutritive',
      )}
        <p>Le pH et l’EC s’appliquent à l’eau d’arrosage ou à la solution hydroponique. Pour les mesurer et les corriger, voir le guide <a href="culture-nutriments.html">Arrosage, nutriments, pH et EC</a>.</p>`,
    },
    {
      id: 'culture',
      titre: 'Semis, espacement et récolte',
      html: `${tableau(
        [
          ligne('Espacement entre plants', espacement ? plage(espacement, ' cm') : 'semis dense, à la volée'),
          ligne('Première récolte', `${plage(c.jours_recolte.valeur, ' jours')} ${depart}`),
        ],
        'Semis, espacement et récolte',
      )}
        <p>Pour démarrer les semis ou les boutures, voir le guide <a href="culture-semis.html">Semis, repiquage et bouturage</a>. En cas de souci, voir <a href="culture-problemes.html">Problèmes, carences et ravageurs</a>.</p>`,
    },
    // Articles de conseil publiés qui citent la culture (champ « cultures » de leur en-tête) :
    // un article programmé apparaît ici à sa date, lors de la reconstruction hebdomadaire.
    ...(questions.length
      ? [
          {
            id: 'questions',
            titre: 'Questions fréquentes',
            html: `<ul class="questions-culture">${questions
              .map((q) => `<li><a href="${q.fichier}">${echapper(q.titre)}</a> <small>${THEMES[q.theme]}</small></li>`)
              .join('\n          ')}</ul>`,
          },
        ]
      : []),
  ];

  const sommaire = sections.map((s) => `<li><a href="#${s.id}">${s.titre}</a></li>`).join('');
  const image = miniature(l).replace('class="fiche__miniature"', 'class="fiche-page__miniature"').replace('loading="lazy"', 'loading="eager"');

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${echapper(descriptionLegume(l))}" />
    <title>${nom} en intérieur sous LED — OptiLED</title>
    <!--#head-->
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="page">
      <p class="fil"><a href="index.html">Accueil</a> › <a href="legumes.html">Fiches légumes</a> › ${nom}</p>
      <article class="prose">
        <h1>${nom} en intérieur : lumière LED et conditions de culture</h1>
        <p class="chapo">${echapper(l.famille)}. Tout ce qu’il faut pour cultiver sous LED : lumière, climat, solution nutritive, espacement et délai de récolte. Ce sont des ordres de grandeur, à ajuster selon la variété.</p>
        ${enBref(l)}
        <nav class="sommaire" aria-label="Sommaire">
          <strong>Dans cette fiche</strong>
          <ol>${sommaire}</ol>
        </nav>
        <div class="fiche-page__intro fiche-page__intro--${slug(l.famille)}">
          ${image}
          <p>${echapper(c.conseils.valeur)}</p>
        </div>
        ${l.avertissement ? `<p class="encadre attention">${echapper(l.avertissement)}</p>` : ''}
        ${sections.map((s) => `<h2 id="${s.id}">${s.titre}</h2>\n        ${s.html}`).join('\n        ')}
        <p class="aide">Valeurs indicatives tirées de la littérature horticole (voir les <a href="glossaire.html#sources">sources</a>). Vérifiez l’intensité réelle avec un PAR-mètre.</p>
      </article>
      ${
        voisines.length
          ? `<section class="voisines" aria-labelledby="voisines">
        <h2 id="voisines">Autres cultures de la famille</h2>
        <nav class="suite suite--familles">${voisines.map((v) => `<a href="${fichierLegume(v.id)}"><small>${echapper(l.famille)}</small>${echapper(v.nom)}</a>`).join('')}</nav>
      </section>`
          : ''
      }
    </main>
    <!--#footer-->
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

/** Toutes les pages détaillées : nom de fichier → contenu HTML (avec marqueurs). */
export function pagesLegumes(date = dateDuJour()): Map<string, string> {
  const legumes = chargerLegumes();
  return new Map(legumes.map((l) => [fichierLegume(l.id), sourcePageLegume(l, legumes, date)]));
}
