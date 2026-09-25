/**
 * Pages détaillées des cultures (legume-<id>.html), générées au build depuis src/data/legumes.json.
 * Elles n'existent pas sur le disque : le plugin du site les fournit à Vite (voir build/site.ts).
 * Chaque page suit le modèle d'article (fil d'Ariane, h1, chapô, sommaire) pour recevoir
 * la même mise en page que les guides.
 */
import { calculer, calculerDli, longueurBarreConseillee, nombrePlants, type ResultatCalcul, type Surface } from '../src/calc.ts';
import type { Legume, ParametresStade, Stade } from '../src/data.ts';
import { lampesConseillees, lienAmazon, MENTION_AFFILIATION, type Proposition } from '../src/lampes.ts';
import { chargerLegumes, DEPART_RECOLTE, echapper, miniature, slug } from './fiches.ts';

export const PREFIXE_PAGE_LEGUME = 'legume-';

/** Doit rester identique au lien des fiches (build/fiches.ts, pageDetaillee). */
export function fichierLegume(id: string): string {
  return `${PREFIXE_PAGE_LEGUME}${id}.html`;
}

const nb = (n: number, decimales = 0) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).replace(/ /g, ' ');
const plage = ([a, b]: [number, number], unite = '') => (a === b ? `${nb(a, a % 1 ? 1 : 0)}${unite}` : `${nb(a, a % 1 ? 1 : 0)} à ${nb(b, b % 1 ? 1 : 0)}${unite}`);

/** Surface de référence des exemples : 1 m² (1 × 1 m), avec les réglages par défaut du calculateur. */
const SURFACE_EXEMPLE: Surface = { mode: 'rectangle', longueurM: 1, largeurM: 1 };
const PRIX_KWH = 0.2;

export function exempleCalcul(p: ParametresStade): ResultatCalcul {
  return calculer({
    ppfd: p.ppfd.valeur,
    photoperiodeH: p.photoperiode.valeur,
    surface: SURFACE_EXEMPLE,
    efficaciteUmolJ: 2.7,
    coefUtilisation: 0.8,
    hauteurCm: p.hauteur_cm.valeur,
    longueurBarreM: longueurBarreConseillee(1),
    prixKwh: PRIX_KWH,
    joursParAn: 365,
  });
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

function blocExemple(titre: string, r: ResultatCalcul, p: ParametresStade): string {
  const b = r.barres;
  return `<h3>${titre}</h3>
        ${tableau(
          [
            ligne('Flux lumineux à émettre (PPF)', `${nb(r.ppfNecessaire)} µmol/s`),
            ligne('Puissance électrique', `environ ${nb(r.puissanceW)} W (${nb(r.densitePuissanceWm2)} W/m²)`),
            ligne('Barres LED', `${b.total} barre${b.total > 1 ? 's' : ''} de ${nb(longueurBarreConseillee(1) * 100)} cm en ${b.lignesParZone} ligne${b.lignesParZone > 1 ? 's' : ''}, d’au moins ${nb(Math.ceil(b.puissanceParBarreNecessaireW))} W chacune`),
            ligne('Hauteur de suspension', plage(p.hauteur_cm.valeur, ' cm')),
            ligne('Consommation', `${nb(r.consoJourKwh, 2)} kWh par jour, soit ${nb(r.consoAnKwh)} kWh par an`),
            ligne('Coût annuel', `environ ${nb(r.coutAnEur ?? 0)} € à ${nb(PRIX_KWH, 2)} € le kWh`),
          ],
          titre,
        )}`;
}

function carteLampe(p: Proposition, r: ResultatCalcul): string {
  const l = p.lampe;
  return `<li class="lampe">
  <h3>${p.nombre} × ${echapper(l.nom)}</h3>
  <p>${nb(p.ppfTotal)} µmol/s${l.ppf_estime ? ' (estimé)' : ''} pour ${nb(r.ppfNecessaire)} nécessaires · ${nb(p.puissanceW)} W au maximum · ${l.variateur ? 'avec variateur' : 'sans variateur'}</p>
  <p class="lampe__note">${nb(l.note, 1)} ★ <span>(${nb(l.avis)} avis)</span></p>
  <a class="bouton" href="${lienAmazon(l)}" target="_blank" rel="sponsored noopener">Voir sur Amazon</a>
</li>`;
}

/** Description courte (balise meta), construite à partir des valeurs de la fiche. */
export function descriptionLegume(l: Legume): string {
  const c = l.stades.croissance;
  const f = l.stades.floraison;
  const ppfd = f ? `${c.ppfd.valeur} puis ${f.ppfd.valeur}` : `${c.ppfd.valeur}`;
  return `${l.nom} en intérieur sous LED : ${ppfd} µmol/m²/s pendant ${nb(c.photoperiode.valeur)} h par jour, ${plage(l.culture.temperature_c.valeur, ' °C')} le jour, pH ${plage(l.culture.ph.valeur)}, première récolte en ${plage(l.culture.jours_recolte.valeur)} jours.`;
}

/** Contenu HTML complet (avec marqueurs) de la page détaillée d'une culture. */
export function sourcePageLegume(l: Legume, legumes: Legume[] = chargerLegumes()): string {
  const c = l.culture;
  const croissance = l.stades.croissance;
  const floraison = l.stades.floraison;
  const nom = echapper(l.nom);
  const depart = DEPART_RECOLTE[l.id] ?? 'après semis';

  const exempleCroissance = exempleCalcul(croissance);
  const exempleFloraison = floraison ? exempleCalcul(floraison) : null;
  const plus = exempleFloraison ?? exempleCroissance;
  const stadeLampes: Stade = floraison ? 'floraison' : 'croissance';
  // Pas de liens d'achat pour une culture soumise à une mise en garde (réglementation du chanvre…).
  const lampes = l.avertissement ? [] : lampesConseillees(plus.ppfNecessaire, plus.surfaceM2, stadeLampes);

  const espacement = c.espacement_cm.valeur;
  const plants = espacement ? nombrePlants(SURFACE_EXEMPLE, Math.round((espacement[0] + espacement[1]) / 2 / 5) * 5) : null;

  const voisines = legumes.filter((v) => v.famille === l.famille && v.id !== l.id);

  const sections: { id: string; titre: string; html: string }[] = [
    {
      id: 'lumiere',
      titre: 'Besoins en lumière',
      html: floraison
        ? `<p>La culture passe par deux stades : une phase de croissance (feuillage), puis une phase de floraison et de fructification, plus gourmande en lumière.</p>
        <h3>Croissance</h3>
        ${tableauLumiere(croissance, 'Lumière en croissance')}
        <h3>Floraison et fructification</h3>
        ${tableauLumiere(floraison, 'Lumière en floraison et fructification')}`
        : `<p>Cette culture se récolte avant la floraison : un seul réglage de lumière suffit pour tout le cycle.</p>
        ${tableauLumiere(croissance, 'Lumière')}`,
    },
    {
      id: 'exemple',
      titre: 'Exemple : éclairer 1 m²',
      html: `<p>Pour une surface de 1 × 1 m, avec des LED d’une efficacité de 2,7 µmol/J et 80 % de la lumière qui atteint réellement la culture (les réglages par défaut du calculateur) :</p>
        ${blocExemple(floraison ? 'En croissance' : 'Installation conseillée', exempleCroissance, croissance)}
        ${exempleFloraison && floraison ? blocExemple('En floraison et fructification', exempleFloraison, floraison) : ''}
        ${floraison ? '<p>On dimensionne l’installation pour la floraison, puis on baisse l’intensité avec un variateur pendant la croissance.</p>' : ''}
        ${plants ? `<p>Sur 1 m², à ${nb(Math.round((espacement![0] + espacement![1]) / 2 / 5) * 5)} cm d’écart, on place environ <strong>${plants.total} plant${plants.total > 1 ? 's' : ''}</strong>.</p>` : ''}
        <p><a class="bouton bouton--plein" href="index.html?legume=${l.id}#calculateur">Calculer pour mes dimensions</a></p>`,
    },
    ...(lampes.length
      ? [
          {
            id: 'lampes',
            titre: 'Lampes du commerce qui conviennent',
            html: `<p>Quelques modèles de la <a href="lampes.html">sélection de lampes</a> qui fournissent assez de lumière pour 1 m² ${floraison ? 'en floraison' : ''}. D’autres lampes conviennent aussi : l’important est le PPF (en µmol/s) et la surface couverte.</p>
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
  ];

  const sommaire = sections.map((s) => `<li><a href="#${s.id}">${s.titre}</a></li>`).join('');
  const image = miniature(l).replace('class="fiche__miniature"', 'class="fiche-page__miniature"').replace('loading="lazy"', 'loading="eager"');

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${echapper(descriptionLegume(l))}" />
    <title>${nom} en intérieur : lumière LED et conditions de culture — OptiLED</title>
    <!--#head-->
  </head>
  <body>
    <!--#header-->
    <main id="contenu" class="page">
      <p class="fil"><a href="index.html">Accueil</a> › <a href="legumes.html">Fiches légumes</a> › ${nom}</p>
      <article class="prose">
        <h1>${nom} en intérieur : lumière LED et conditions de culture</h1>
        <p class="chapo">${echapper(l.famille)}. Tout ce qu’il faut pour cultiver sous LED : lumière, climat, solution nutritive, espacement et délai de récolte. Ce sont des ordres de grandeur, à ajuster selon la variété.</p>
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
export function pagesLegumes(): Map<string, string> {
  const legumes = chargerLegumes();
  return new Map(legumes.map((l) => [fichierLegume(l.id), sourcePageLegume(l, legumes)]));
}
