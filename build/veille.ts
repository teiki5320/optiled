/**
 * Veille actus (côté build) : les actus elles-mêmes sont lues en direct dans le navigateur
 * (src/veille.ts) ; le build ne fait que deux choses :
 *   - publier veille/entites.json : la liste des cultures, que la tâche de veille lit pour
 *     relier une actu à une fiche (tag « legume:<id> ») ;
 *   - insérer, à la place du marqueur <!--#actus:4--> ou <!--#actus:3:legume:tomate-->, la
 *     section cachée que le script remplit (elle reste cachée s'il n'y a aucune actu).
 * La culture « chanvre-cbd » n'est jamais exposée et sa fiche n'a jamais de bloc d'actus.
 */
import { chargerLegumes } from './fiches.ts';

export const FICHIER_ENTITES = 'veille/entites.json';
export const FICHIER_ACTUS = 'actus.html';

/** Cultures jamais reliées à la veille. */
export const CULTURES_EXCLUES = new Set(['chanvre-cbd']);

/** Autres noms (anglais surtout : beaucoup de sources sont en anglais), par culture. */
export const AUTRES_NOMS: Record<string, string[]> = {
  laitue: ['salade', 'lettuce'],
  epinard: ['épinards', 'spinach'],
  roquette: ['arugula', 'rocket'],
  mache: ['doucette', "lamb's lettuce", 'corn salad'],
  mesclun: ['jeunes pousses', 'baby leaf', 'salad greens', 'mesclun'],
  basilic: ['basil'],
  persil: ['parsley'],
  coriandre: ['cilantro', 'coriander'],
  ciboulette: ['chives'],
  thym: ['thyme'],
  origan: ['oregano', 'marjolaine'],
  romarin: ['rosemary'],
  sauge: ['sage'],
  aneth: ['dill'],
  'micro-pousses': ['micropousses', 'microgreens', 'micro greens'],
  radis: ['radish'],
  fraise: ['fraisier', 'strawberry', 'strawberries'],
  tomate: ['tomato', 'tomatoes'],
  'tomate-naine': ['micro-tomate', 'micro tomato', 'dwarf tomato'],
  poivron: ['bell pepper', 'sweet pepper'],
  piment: ['chili pepper', 'hot pepper', 'chili'],
  concombre: ['cucumber'],
  aubergine: ['eggplant', 'brinjal'],
  safran: ['saffron', 'crocus sativus'],
  wasabi: ['wasabi', 'eutrema japonicum'],
};

/** « de la tomate », « du basilic », « de l'origan », « des micro-pousses » : titre « L'actu … ». */
export const DE_CULTURE: Record<string, string> = {
  laitue: 'de la laitue',
  epinard: "de l'épinard",
  roquette: 'de la roquette',
  mache: 'de la mâche',
  mesclun: 'du mesclun',
  basilic: 'du basilic',
  persil: 'du persil',
  coriandre: 'de la coriandre',
  ciboulette: 'de la ciboulette',
  thym: 'du thym',
  origan: "de l'origan",
  romarin: 'du romarin',
  sauge: 'de la sauge',
  aneth: "de l'aneth",
  'micro-pousses': 'des micro-pousses',
  radis: 'du radis',
  fraise: 'de la fraise',
  tomate: 'de la tomate',
  'tomate-naine': 'de la tomate naine',
  poivron: 'du poivron',
  piment: 'du piment',
  concombre: 'du concombre',
  aubergine: "de l'aubergine",
  safran: 'du safran',
  wasabi: 'du wasabi',
};

export interface EntiteVeille {
  tag: string;
  nom: string;
  autres_noms: string[];
}

/** Contenu de veille/entites.json : toutes les cultures, sauf celles exclues. */
export function entitesVeille(legumes = chargerLegumes()): EntiteVeille[] {
  return legumes
    .filter((l) => !CULTURES_EXCLUES.has(l.id))
    .map((l) => ({ tag: `legume:${l.id}`, nom: l.nom, autres_noms: AUTRES_NOMS[l.id] ?? [] }));
}

/**
 * Section cachée d'un marqueur d'actus. `limite` : nombre d'actus ; `tag` : seulement celles
 * d'une fiche (« legume:tomate »). Accueil : titre et lien vers la page Actus ; fiche : « L'actu
 * de la tomate » ; page Actus (plus de 4 actus) : sans titre (la page a le sien), avec la date
 * de mise à jour et un message si la veille est vide.
 */
export function rendreBlocActus(limite: number, tag?: string): string {
  const id = tag?.startsWith('legume:') ? tag.slice('legume:'.length) : undefined;
  if (id && CULTURES_EXCLUES.has(id)) return '';
  const attributs = `data-actus data-limite="${limite}"${tag ? ` data-tag="${tag}"` : ''}`;
  if (limite > 4 && !tag) {
    return `<section class="actus actus--page" ${attributs} aria-label="Actus" hidden>
        <p class="actus__maj" data-actus-maj hidden></p>
        <div class="actus__liste" data-actus-liste></div>
      </section>
      <p class="actus__vide" data-actus-vide hidden>Pas d'actu pour le moment : la page se remplit deux fois par jour, revenez bientôt.</p>`;
  }
  const titre = id ? `L'actu ${DE_CULTURE[id] ?? `: ${id}`}` : 'Actus de la culture en intérieur';
  const idTitre = `titre-actus${id ? `-${id}` : ''}`;
  const lien = id ? '' : `<a class="actus__toutes" href="${FICHIER_ACTUS}">Toutes les actus →</a>`;
  return `<section class="actus${id ? ' actus--fiche' : ''}" ${attributs} aria-labelledby="${idTitre}" hidden>
        <div class="section__tete">
          <div><h2 id="${idTitre}">${titre}</h2>${id ? '' : '<p>Les nouvelles de la culture en intérieur et de l’éclairage des plantes, choisies deux fois par jour.</p>'}</div>
          ${lien}
        </div>
        <div class="actus__liste" data-actus-liste></div>
      </section>`;
}

/** Remplace les marqueurs <!--#actus:N--> et <!--#actus:N:legume:id--> d'une page. */
export function remplacerMarqueursActus(html: string): string {
  return html.replace(/<!--#actus:(\d+)(?::([a-z]+:[a-z0-9-]+))?-->/g, (_m, n: string, tag?: string) => rendreBlocActus(Number(n), tag));
}
