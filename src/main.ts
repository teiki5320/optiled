import './site.ts';
import './style.css';
import './theme-calcul.css';
import { alertes } from './alertes.ts';
import { calculer, dimensionsZone, longueurBarreConseillee, nombrePlants, validerEntrees, verifierLampe, type EntreesCalcul, type ResultatCalcul, type Surface } from './calc.ts';
import { depuisParams, PARAMETRES, versParams, type Etat } from './etat.ts';
import { LEGUMES, legumesParFamille, parametresStade, trouverLegume, type Stade } from './data.ts';
import { accord, euros, nombre } from './format.ts';
import { htmlTuiles, TUILES_PAR_LIGNE } from './tuiles.ts';
import { imageLampe, lampesConseillees, lienAmazon, MENTION_AFFILIATION } from './lampes.ts';
import { activerModeIntegre, avecIntegre, estIntegre, sansIntegre } from './integre.ts';

/** Calculateur affiché dans un cadre sur un autre site (voir integrer.html). */
const integre = estIntegre(location.search);
if (integre) activerModeIntegre();
import { insecables, typographier } from './typo.ts';
import { arrondiPuissance, listeAchat, resumeTexte, type ContexteListe } from './liste.ts';
import { jaugeDli, planBarres } from './schema.ts';
import { erreursParChamp } from './champs-erreur.ts';
import { resumeCalculPartage } from './partage.ts';
import { BUDGET, gammePourPuissance, mentionReleve, multiplier, texteFourchette } from './budget.ts';

/** DLI qui remplit entièrement l'anneau de synthèse (mol/m²/j). */
const DLI_ANNEAU_MAX = 40;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const champ = (id: string) => $<HTMLInputElement>(id);

const form = $<HTMLFormElement>('formulaire');
const selectLegume = $<HTMLSelectElement>('legume');
const tuilesLegumes = $<HTMLDivElement>('tuiles-legumes');
const contenu = $<HTMLDivElement>('contenu-resultats');
const zoneErreurs = $<HTMLParagraphElement>('erreurs');
const boutonCopier = $<HTMLButtonElement>('copier');

let dernierResume = '';
/** Dernier résultat affiché et sa surface (bandeau « Calcul partagé »). */
let dernierCalcul: { r: ResultatCalcul; surface: Surface } | null = null;
/** Au-delà, le plan deviendrait illisible et lent à dessiner. */
const PLAN_BARRES_MAX = 400;

function echapper(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** « Fraise (remontante) » → « fraise » ; « Chanvre CBD » → « chanvre CBD ». */
function nomCourt(nom: string): string {
  const n = nom.replace(/\s*\(.*\)$/, '');
  return n.charAt(0).toLowerCase() + n.slice(1);
}

/** Lit un champ numérique ; undefined s'il est vide. Accepte la virgule décimale. */
function lireNombre(id: string): number | undefined {
  let brut = champ(id).value.trim().replace(/[\u00a0\u202f]/g, ' ');
  // Les espaces ne sont admises que comme séparateurs de milliers (« 1 200 ») : « 1 5 » est refusé.
  if (/^\d{1,3}( \d{3})+([.,]\d+)?$/.test(brut)) brut = brut.replace(/ /g, '');
  brut = brut.replace(',', '.');
  return brut === '' ? undefined : Number(brut);
}

function radio(nom: string): string {
  return (form.querySelector(`input[name="${nom}"]:checked`) as HTMLInputElement).value;
}

function remplirLegumes(): void {
  for (const [famille, liste] of legumesParFamille()) {
    const groupe = document.createElement('optgroup');
    groupe.label = famille;
    for (const l of liste) groupe.append(new Option(l.nom, l.id));
    selectLegume.append(groupe);
  }
  // Le légume peut être présélectionné par l'URL : index.html?legume=tomate
  const demande = new URLSearchParams(location.search).get('legume');
  selectLegume.value = demande && trouverLegume(demande) ? demande : LEGUMES[0].id;
}

/** Appréciation affichée selon l'efficacité réelle de la lampe saisie. */
const APPRECIATIONS = {
  faible: "faible : une LED récente fait mieux, la facture sera plus élevée",
  correcte: 'correcte',
  bonne: 'bonne',
  douteuse: 'à vérifier : au-delà de 3,2 µmol/J, le PPF annoncé est probablement surestimé',
} as const;

/** Bloc « Votre lampe » si le PPF et la puissance d'une lampe du commerce sont saisis. */
function rendreLampe(r: ResultatCalcul): string {
  const ppf = lireNombre('lampe-ppf');
  const w = lireNombre('lampe-w');
  if (!ppf || !w || !(ppf > 0) || !(w > 0)) return '';
  const v = verifierLampe({ ppfLampe: ppf, puissanceLampeW: w, ppfNecessaire: r.ppfNecessaire, surfaceM2: r.surfaceM2, coefUtilisation: lireNombre('coef') ?? 0.8 });
  return `${titre('Votre lampe', 'led-choisir.html#fiche', 'Lire une fiche technique')}
    <p>Efficacité réelle : <strong>${nombre(v.efficaciteUmolJ, 2)} µmol/J</strong> (${APPRECIATIONS[v.appreciation]}).</p>
    <p>Il faut <strong>${v.nombre} lampe${v.nombre > 1 ? 's' : ''}</strong> de ${nombre(ppf)} µmol/s pour fournir ${nombre(r.ppfNecessaire)} µmol/s, soit un PPFD moyen d'environ <strong>${nombre(v.ppfdObtenu)} µmol/m²/s</strong> (cible : ${nombre(r.ppfd)}) et <strong>${nombre(v.nombre * w)} W</strong> consommés.</p>`;
}

/** Lampes du commerce (sélection Amazon.fr) qui fournissent assez de lumière pour la surface. */
function rendreLampesCommerce(r: ResultatCalcul): string {
  // Pas de liens sponsorisés hors du site déclaré au Programme Partenaires Amazon.
  if (integre) return '';
  const propositions = lampesConseillees(r.ppfNecessaire, r.surfaceM2, radio('stade') as Stade);
  if (propositions.length === 0) return '';
  const cartes = propositions
    .map(
      (p) => `<li class="lampe-proposee">
      ${imageLampe(p.lampe, '(min-width: 760px) 240px, 92vw')}
      <p class="lampe-proposee__nom"><strong>${p.nombre} × ${echapper(p.lampe.nom)}</strong></p>
      <p class="lampe-proposee__detail">${nombre(p.ppfTotal)} µmol/s${p.lampe.ppf_estime ? ' (estimé)' : ''} pour ${nombre(r.ppfNecessaire)} nécessaires · ${nombre(p.puissanceW)} W au maximum · ${p.lampe.variateur ? 'avec variateur' : 'sans variateur'}</p>
      <a class="bouton bouton--amazon" href="${lienAmazon(p.lampe)}" target="_blank" rel="sponsored noopener">Voir sur Amazon</a>
    </li>`,
    )
    .join('');
  return `${titre('Lampes du commerce qui conviennent', 'lampes.html', 'Toute la sélection')}
    <ul class="lampes-proposees">${cartes}</ul>
    <p class="aide">Liens sponsorisés. ${MENTION_AFFILIATION} Prix et disponibilité sur Amazon.</p>`;
}

/**
 * Encart « Budget indicatif » : fourchette de la gamme de lampe qui correspond à la puissance
 * calculée (src/data/budget.json) et électricité déjà calculée. Jamais de prix par produit ni de lien d'achat.
 */
function rendreBudget(r: ResultatCalcul): string {
  const { gamme, nombre: n } = gammePourPuissance(r.puissanceW);
  const poste = BUDGET.lampes[gamme];
  const lampe = `${n > 1 ? `${n} × ` : ''}${poste.libelle.charAt(0).toLowerCase()}${poste.libelle.slice(1)}`;
  const electricite = r.coutAnEur === null
    ? 'indiquez le prix du kWh dans les options pour l’estimer'
    : `<strong>${euros(r.coutAnEur / 12)}</strong> par mois, <strong>${euros(r.coutAnEur)}</strong> par an`;
  return `${titre('Budget indicatif', 'led-choisir.html#budget', 'Budget selon l’installation')}
    <div class="budget-indicatif">
      <p><strong>Lampe</strong>, ${echapper(lampe)} pour ${nombre(r.puissanceW)} W : <strong>${texteFourchette(multiplier(poste.fourchette, n))}</strong></p>
      <p><strong>Électricité</strong> : ${electricite}</p>
      <p class="aide">${mentionReleve()}</p>
    </div>`;
}

function legumeCourant() {
  return trouverLegume(selectLegume.value)!;
}

/** Tuiles cliquables des légumes : elles pilotent la liste déroulante (masquée). */
function remplirTuiles(): void {
  // Normalement déjà écrites au build ; sinon (serveur de développement), on les crée ici.
  if (!tuilesLegumes.querySelector('[data-legume]')) tuilesLegumes.innerHTML = htmlTuiles();
  tuilesLegumes.addEventListener('click', (e) => {
    const bouton = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-legume]');
    if (!bouton || !bouton.dataset.legume) return;
    selectLegume.value = bouton.dataset.legume;
    // Choisir dans la liste dépliée la referme : la culture choisie reste sur la ligne visible.
    const etaitDepliee = tuilesDepliees;
    tuilesDepliees = false;
    appliquerLegume();
    mettreAJour();
    if (etaitDepliee) tuilesLegumes.querySelector<HTMLButtonElement>(`[data-legume="${bouton.dataset.legume}"]`)?.focus();
  });
}

/** Liste repliée : une ligne (la culture choisie et les premières) ; la flèche déplie toutes les cultures. */
let tuilesDepliees = false;
const boutonDeplier = $<HTMLButtonElement>('tuiles-deplier');
const libelleDeplier = boutonDeplier.querySelector('span')!.textContent ?? '';

function majTuiles(): void {
  const tuiles = [...tuilesLegumes.querySelectorAll<HTMLButtonElement>('[data-legume]')];
  const choisie = tuiles.find((b) => b.dataset.legume === selectLegume.value);
  const visibles = new Set(tuilesDepliees ? tuiles : [choisie, ...tuiles.filter((b) => b !== choisie)].slice(0, TUILES_PAR_LIGNE));
  tuiles.forEach((b) => {
    const choisi = b === choisie;
    b.setAttribute('aria-pressed', String(choisi));
    // Une seule tuile atteignable par Tab ; les flèches parcourent les autres.
    b.tabIndex = choisi ? 0 : -1;
    b.hidden = !visibles.has(b);
  });
  boutonDeplier.setAttribute('aria-expanded', String(tuilesDepliees));
  boutonDeplier.querySelector('span')!.textContent = tuilesDepliees ? 'Réduire la liste' : libelleDeplier;
}

function deplierTuiles(): void {
  boutonDeplier.addEventListener('click', () => {
    tuilesDepliees = !tuilesDepliees;
    majTuiles();
  });
}

/** Flèches, Début et Fin pour parcourir les tuiles de légumes au clavier. */
function navigationTuiles(): void {
  tuilesLegumes.addEventListener('keydown', (e) => {
    const tuiles = [...tuilesLegumes.querySelectorAll<HTMLButtonElement>('[data-legume]:not([hidden])')];
    const i = tuiles.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const cible = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tuiles.length - 1 }[e.key];
    if (cible === undefined) return;
    e.preventDefault();
    tuiles[(cible + tuiles.length) % tuiles.length].focus();
  });
}

/** Boutons − / + : ajoutent data-pas à la valeur du champ data-cible, bornée par data-min / data-max. */
function boutonsPas(): void {
  form.addEventListener('click', (e) => {
    const bouton = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-cible]');
    if (!bouton || !bouton.dataset.cible) return;
    const input = champ(bouton.dataset.cible);
    const pas = Number(bouton.dataset.pas);
    const min = bouton.dataset.min ? Number(bouton.dataset.min) : Math.abs(pas);
    const max = bouton.dataset.max ? Number(bouton.dataset.max) : Infinity;
    const actuel = lireNombre(input.id);
    const base = actuel !== undefined && Number.isFinite(actuel) ? actuel : min;
    const v = Math.min(max, Math.max(min, Math.round((base + pas) * 100) / 100));
    input.value = String(v).replace('.', ',');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** Adapte le formulaire au légume : stade disponible, photopériode pré-remplie. */
function appliquerLegume(): void {
  const legume = trouverLegume(selectLegume.value)!;
  const radioFloraison = form.querySelector('input[value="floraison"]') as HTMLInputElement;
  const aide = $<HTMLElement>('stade-aide');
  const sansFloraison = legume.stades.floraison === null;
  radioFloraison.disabled = sansFloraison;
  if (sansFloraison) {
    (form.querySelector('input[value="croissance"]') as HTMLInputElement).checked = true;
    const pluriel = /s$/.test(legume.nom.replace(/\s*\(.*\)$/, ''));
    aide.textContent = typographier(`${legume.nom.replace(/\s*\(.*\)$/, '')} se récolte${pluriel ? 'nt' : ''} avant floraison : seul le stade croissance s'applique.`);
  }
  aide.hidden = !sansFloraison;
  const avertissement = $<HTMLElement>('legume-avertissement');
  avertissement.textContent = typographier(legume.avertissement ?? '');
  avertissement.hidden = !legume.avertissement;
  majTuiles();
  appliquerEspacement(legume);
  appliquerStade();
}

/** Pré-remplit l'espacement conseillé (milieu de la plage de la fiche arrondi à 5 cm près, vers le haut en cas d'égalité). */
function appliquerEspacement(legume = legumeCourant()): void {
  const e = legume.culture.espacement_cm.valeur;
  const input = champ('espacement');
  input.disabled = e === null;
  input.value = e === null ? '' : String(espacementConseille(legume));
  input.placeholder = e === null ? 'semis dense' : '';
  form.querySelectorAll<HTMLButtonElement>('[data-cible="espacement"]').forEach((b) => (b.disabled = e === null));
  $('espacement-aide').textContent = typographier(
    e === null
      ? `${nomCourt(legume.nom)} se sème à la volée : pas d'espacement entre plants.`
      : `Conseillé : ${e[0]} à ${e[1]} cm. Sert à compter les plants ; la lumière, elle, se calcule par m² de culture.`,
  );
}

function espacementConseille(legume = legumeCourant()): number {
  const e = legume.culture.espacement_cm.valeur;
  return e === null ? 0 : Math.round((e[0] + e[1]) / 2 / 5) * 5;
}

function appliquerStade(): void {
  const p = parametresStade(trouverLegume(selectLegume.value)!, radio('stade') as Stade)!;
  champ('photoperiode').value = String(p.photoperiode.valeur).replace('.', ',');
  $('photoperiode-aide').textContent = typographier(`Conseillé : ${nombre(p.photoperiode.valeur, Number.isInteger(p.photoperiode.valeur) ? 0 : 1)} h par jour.`);
}

function appliquerMode(): void {
  const rangs = radio('mode') === 'rangs';
  $('bloc-rectangle').hidden = rangs;
  $('bloc-rangs').hidden = !rangs;
}

function lireSurface(): Surface {
  if (radio('mode') === 'rangs') {
    return {
      mode: 'rangs',
      nbRangs: lireNombre('nb-rangs') ?? NaN,
      longueurM: lireNombre('longueur-rang') ?? NaN,
      largeurRangM: lireNombre('largeur-rang') ?? NaN,
    };
  }
  return { mode: 'rectangle', longueurM: lireNombre('longueur') ?? NaN, largeurM: lireNombre('largeur') ?? NaN };
}

/** Titre de section de résultat, avec un lien vers le guide qui l'explique. */
function titre(texte: string, guide: string, libelle: string): string {
  return `<h3>${texte}<a class="comprendre" href="${guide}">${libelle}</a></h3>`;
}

function tuile(libelle: string, valeur: string, unite: string, note = ''): string {
  return `<div class="tuile"><span class="libelle">${libelle}</span>
    <span class="valeur">${valeur}<small> ${unite}</small></span>
    ${note ? `<span class="note">${note}</span>` : ''}</div>`;
}

function rendre(r: ResultatCalcul, ctx: ContexteListe, surface: Surface): string {
  const b = r.barres;
  const dispo =
    `${b.lignesParZone} ligne${b.lignesParZone > 1 ? 's' : ''} de ${b.barresParLigne} barre${b.barresParLigne > 1 ? 's' : ''} bout à bout` +
    (b.zones > 1 ? ` au-dessus de chacun des ${b.zones} rangs` : '');
  const puissanceBarre = ctx.puissanceBarreW
    ? `Barres de ${nombre(ctx.puissanceBarreW)} W : ${nombre(b.puissanceInstalleeW)} W installés, à régler à ~${nombre(b.tauxGradation * 100)} %.`
    : `Chaque barre doit fournir au moins ${nombre(arrondiPuissance(b.puissanceParBarreNecessaireW))} W (valeur exacte : ${nombre(b.puissanceParBarreNecessaireW, 1)} W).`;
  const parBarreCourt = ctx.puissanceBarreW
    ? `${nombre(ctx.puissanceBarreW)} W chacune, réglées à ~${nombre(b.tauxGradation * 100)} %`
    : `≥ ${nombre(arrondiPuissance(b.puissanceParBarreNecessaireW))} W chacune`;
  const cout = r.coutAnEur === null
    ? tuile('Coût annuel', '—', '', 'Indiquez le prix du kWh dans les options')
    : tuile('Coût annuel', euros(r.coutAnEur), '', `${nombre(r.coutAnEur / 12, 2)} € / mois${ctx.plants ? ` · ${euros(r.coutAnEur / ctx.plants.total)} / plant` : ''}`);
  const degres = Math.min(360, (r.dli / DLI_ANNEAU_MAX) * 360).toFixed(1);

  const achats = listeAchat(r, ctx)
    .map((a) => `<tr><td class="qte">${a.quantite}</td><td><strong>${echapper(a.article)}</strong><br><span>${echapper(a.detail)}</span></td></tr>`)
    .join('');

  return `
    ${legumeCourant().avertissement ? `<p class="avertissement-legume" role="note">${echapper(legumeCourant().avertissement!)}</p>` : ''}
    ${(ctx.alertes ?? []).map((a) => `<p class="alerte-calcul" role="note">${echapper(a)}</p>`).join('')}
    <p class="sous-titre">${echapper(ctx.legume)} · ${echapper(ctx.stade)} · ${nombre(r.surfaceM2, 2)} m² · <a href="legumes.html#${selectLegume.value}">fiche ${echapper(nomCourt(ctx.legume))}</a></p>
    <div class="synthese">
      <div class="anneau" style="--deg:${degres}deg" role="img" aria-label="${nombre(r.puissanceW)} W ; DLI ${nombre(r.dli, 1)} mol/m²/j"><div><strong>${nombre(r.puissanceW)}</strong><span>${accord(Math.round(r.puissanceW), 'watt')}</span></div></div>
      <div class="synthese__texte">
        <p class="synthese__titre">${b.total} barre${b.total > 1 ? 's' : ''} LED de ${nombre(ctx.longueurBarreM, 2)} m</p>
        <p>${parBarreCourt} · à ${r.hauteurCm[0]}–${r.hauteurCm[1]} cm du feuillage</p>
        <p>PPFD ${nombre(r.ppfd)} µmol/m²/s · anneau : DLI ${nombre(r.dli, 1)} mol/m²/j</p>
      </div>
    </div>
    <div class="tuiles">
      ${tuile('PPFD cible', nombre(r.ppfd), 'µmol/m²/s')}
      ${tuile('DLI', nombre(r.dli, 1), 'mol/m²/j', `${nombre(ctx.photoperiodeH)} h/jour`)}
      ${tuile('Flux nécessaire (PPF)', nombre(r.ppfNecessaire), 'µmol/s', `dont ${nombre(r.ppfUtile)} utiles`)}
      ${tuile('Puissance électrique', nombre(r.puissanceW), 'W', `${nombre(r.densitePuissanceWm2)} W/m²`)}
      ${ctx.plants ? tuile('Plants', `≈ ${ctx.plants.total}`, '', `à ${ctx.plants.espacementCm} cm · ${nombre(r.puissanceW / ctx.plants.total, 1)} W/plant`) : ''}
    </div>
    ${jaugeDli(r.dli)}

    ${titre('Barres LED et disposition', 'led-installation.html#uniformite', 'Bien répartir la lumière')}
    <p><strong>${b.total} barre${b.total > 1 ? 's' : ''} de ${nombre(ctx.longueurBarreM, 2)} m</strong> : ${dispo}.</p>
    ${b.total <= PLAN_BARRES_MAX ? `<figure class="plan-cadre">${planBarres(surface, b, ctx.longueurBarreM, ctx.plantsPlan)}<figcaption>Vue de dessus, à l'échelle. Les barres sont centrées dans la longueur.${ctx.plantsPlan ? ` <span class="plan-legende-plant" aria-hidden="true"></span> Emplacement d'un plant (espacement ${nombre(ctx.plantsPlan.espacementM * 100)} cm).` : ''}</figcaption></figure>` : `<p class="aide">Plan non dessiné au-delà de ${PLAN_BARRES_MAX} barres.</p>`}
    <p>Entraxe entre lignes : <strong>${nombre(b.espacementM * 100)} cm</strong>, première ligne à ${nombre(b.margeBordM * 100)} cm du bord.</p>
    <p>${puissanceBarre}</p>

    ${rendreLampe(r)}
    ${rendreLampesCommerce(r)}
    ${titre('Spectre et hauteur', 'led-bases.html#spectre', 'Le rôle du spectre')}
    <p><strong>Spectre :</strong> ${echapper(ctx.spectre)}</p>
    <p><strong>Hauteur de suspension :</strong> ${r.hauteurCm[0]} à ${r.hauteurCm[1]} cm au-dessus du feuillage (monter si les feuilles blanchissent, descendre si les tiges s'étirent).</p>

    ${titre('Consommation', 'led-choisir.html#chaleur', 'Chaleur et consommation')}
    <div class="tuiles">
      ${tuile('Par jour', nombre(r.consoJourKwh, 2), 'kWh')}
      ${tuile('Par an', nombre(r.consoAnKwh), 'kWh')}
      ${cout}
    </div>

    ${rendreBudget(r)}

    ${titre("Liste d'achat", 'led-choisir.html#checklist', "Checklist d'achat")}
    <table class="achats"><tbody>${achats}</tbody></table>`;
}

function mettreAJour(): void {
  const legume = trouverLegume(selectLegume.value)!;
  const stade = radio('stade') as Stade;
  const p = parametresStade(legume, stade)!;
  const surface = lireSurface();
  const longueurZoneM = dimensionsZone(surface).longueurM;
  // Sans longueur imposée : la plus grande barre du commerce qui tient dans l'installation.
  const longueurBarreM = lireNombre('longueur-barre') ?? (longueurZoneM > 0 ? longueurBarreConseillee(longueurZoneM) : 1.2);
  const espacementCm = champ('espacement').disabled ? undefined : lireNombre('espacement');

  const entrees: EntreesCalcul = {
    ppfd: p.ppfd.valeur,
    photoperiodeH: lireNombre('photoperiode') ?? NaN,
    surface,
    efficaciteUmolJ: lireNombre('efficacite') ?? NaN,
    coefUtilisation: lireNombre('coef') ?? NaN,
    hauteurCm: p.hauteur_cm.valeur,
    longueurBarreM,
    puissanceBarreW: lireNombre('puissance-barre'),
    prixKwh: lireNombre('prix-kwh'),
    joursParAn: lireNombre('jours') ?? NaN,
  };

  let r: ResultatCalcul;
  const erreurs: string[] = [];
  if (espacementCm !== undefined && !(espacementCm >= 5 && espacementCm <= 300)) {
    erreurs.push("L'espacement entre plants doit être compris entre 5 et 300 cm.");
  }
  erreurs.push(...validerEntrees(entrees));
  try {
    if (erreurs.length > 0) throw new RangeError(erreurs.join(' '));
    r = calculer(entrees);
  } catch (e) {
    zoneErreurs.textContent = typographier((e as Error).message);
    zoneErreurs.hidden = false;
    signalerChamps(erreurs.length > 0 ? erreurs : [(e as Error).message]);
    contenu.classList.add('perime');
    majBarreResume(null);
    dernierResume = '';
    dernierCalcul = null;
    return;
  }
  zoneErreurs.hidden = true;
  signalerChamps([]);
  contenu.classList.remove('perime');

  const ctx: ContexteListe = {
    legume: legume.nom,
    stade: stade === 'croissance' ? 'croissance' : 'floraison / fructification',
    spectre: p.spectre.valeur,
    efficaciteUmolJ: entrees.efficaciteUmolJ,
    longueurBarreM,
    puissanceBarreW: entrees.puissanceBarreW,
    photoperiodeH: entrees.photoperiodeH,
    avertissement: legume.avertissement,
  };
  const plantation = espacementCm !== undefined ? nombrePlants(surface, espacementCm) : undefined;
  if (plantation && espacementCm !== undefined) {
    ctx.plants = { total: plantation.total, espacementCm };
    ctx.plantsPlan = { parLigne: plantation.parLigne, lignes: plantation.lignes, espacementM: espacementCm / 100 };
  }
  ctx.alertes = alertes({
    legumeId: legume.id,
    nom: nomCourt(legume.nom),
    stade,
    photoperiodeH: entrees.photoperiodeH,
    photoperiodeConseilleeH: p.photoperiode.valeur,
    efficaciteUmolJ: entrees.efficaciteUmolJ,
    longueurBarreM,
    longueurZoneM,
    longueurLigneM: r.barres.barresParLigne * longueurBarreM,
    rangTropEtroit:
      plantation?.rangTropEtroit && surface.mode === 'rangs'
        ? { largeurCm: Math.round(surface.largeurRangM * 100), espacementCm: espacementCm! }
        : undefined,
  });
  contenu.innerHTML = insecables(rendre(r, ctx, entrees.surface));
  dernierResume = resumeTexte(r, ctx);
  dernierCalcul = { r, surface: entrees.surface };
  majBarreResume(r);
  annoncer(r);
  enregistrerEtat();
}

/**
 * Champs concernés par les erreurs : marqués aria-invalid, avec le message affiché juste
 * sous le champ et relié par aria-describedby (le récapitulatif des résultats reste affiché).
 * Le message disparaît dès que le champ redevient valide.
 */
function signalerChamps(messages: string[]): void {
  const parChamp = erreursParChamp(messages, lireNombre);
  form.querySelectorAll<HTMLInputElement>('input[type="text"]').forEach((c) => {
    const textes = parChamp.get(c.id);
    const idMessage = `${c.id}-erreur`;
    let message = document.getElementById(idMessage);
    const decrit = (c.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((x) => x && x !== idMessage);
    if (!textes) {
      c.removeAttribute('aria-invalid');
      if (message) message.hidden = true;
      if (decrit.length) c.setAttribute('aria-describedby', decrit.join(' '));
      else c.removeAttribute('aria-describedby');
      return;
    }
    if (!message) {
      message = document.createElement('small');
      message.id = idMessage;
      message.className = 'champ__erreur';
      const conteneur = c.closest('.champ');
      // Dans un <label>, le message ne doit pas s'ajouter au nom du champ : il reste lu
      // comme description grâce à aria-describedby.
      if (conteneur?.tagName === 'LABEL') message.setAttribute('aria-hidden', 'true');
      (conteneur ?? c.parentElement!).append(message);
    }
    message.textContent = typographier(textes.join(' '));
    message.hidden = false;
    c.setAttribute('aria-invalid', 'true');
    c.setAttribute('aria-describedby', [idMessage, ...decrit].join(' '));
  });
}

/** Annonce courte aux lecteurs d'écran (et non tout le bloc de résultats à chaque frappe). */
const zoneAnnonce = $('annonce-resultats');
function annoncer(r: ResultatCalcul): void {
  const texte = `Résultat : ${nombre(r.puissanceW)} W, ${r.barres.total} barre${r.barres.total > 1 ? 's' : ''} LED.`;
  if (zoneAnnonce.textContent !== texte) zoneAnnonce.textContent = texte;
}

/**
 * Barre de résumé fixée en bas de l'écran sur mobile : elle rappelle les chiffres clés
 * pendant la saisie et mène aux résultats. Masquée dès que les résultats sont visibles
 * ou dépassés (pied de page), pour ne rien recouvrir.
 */
const barreResume = $<HTMLAnchorElement>('barre-resume');
let resultatsVisibles = false;
function majBarreResume(r: ResultatCalcul | null): void {
  if (r) {
    $('barre-resume-chiffres').innerHTML =
      `<b>${nombre(r.puissanceW)} W</b> · ${r.barres.total} barre${r.barres.total > 1 ? 's' : ''} LED`;
  }
  barreResume.hidden = !r || resultatsVisibles;
}
let majPrevue = false;
function suivreResultats(): void {
  majPrevue = false;
  resultatsVisibles = $('resultats').getBoundingClientRect().top < window.innerHeight;
  barreResume.hidden = resultatsVisibles || zoneErreurs.hidden === false || !dernierResume;
}
window.addEventListener(
  'scroll',
  () => {
    if (!majPrevue) {
      majPrevue = true;
      requestAnimationFrame(suivreResultats);
    }
  },
  { passive: true },
);
window.addEventListener('resize', suivreResultats);

async function copier(): Promise<void> {
  if (!dernierResume) return;
  const libelle = boutonCopier.textContent;
  try {
    await navigator.clipboard.writeText(dernierResume);
    boutonCopier.textContent = 'Copié ✓';
  } catch {
    // Repli pour les navigateurs sans API presse-papiers (http, anciens mobiles).
    const zone = document.createElement('textarea');
    zone.value = dernierResume;
    document.body.append(zone);
    zone.select();
    const ok = document.execCommand('copy');
    zone.remove();
    boutonCopier.textContent = ok ? 'Copié ✓' : 'Échec de la copie';
  }
  setTimeout(() => (boutonCopier.textContent = libelle), 2000);
}

/* ---------- État du formulaire : partage par lien et mémorisation locale ---------- */
const CLE_MEMOIRE = 'optiled:calculateur';

/** Champs propres à chaque mode d'installation : ceux de l'autre mode ne vont pas dans le lien. */
const CHAMPS_MODE: Record<string, string[]> = {
  rectangle: ['nb-rangs', 'longueur-rang', 'largeur-rang'],
  rangs: ['longueur', 'largeur'],
};

/** État à partager : seulement ce qui diffère des valeurs par défaut, pour un lien court. */
function lireEtat(): Etat {
  const mode = radio('mode');
  const etat: Etat = { legume: selectLegume.value };
  if (radio('stade') !== 'croissance') etat.stade = radio('stade');
  if (mode !== 'rectangle') etat.mode = mode;
  const conseillee = String(parametresStade(legumeCourant(), radio('stade') as Stade)!.photoperiode.valeur).replace('.', ',');
  for (const id of Object.keys(PARAMETRES)) {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement) || el.type !== 'text' || CHAMPS_MODE[mode]?.includes(id)) continue;
    const parDefaut = id === 'photoperiode' ? conseillee : id === 'espacement' ? String(espacementConseille() || '') : el.defaultValue;
    if (el.value.trim() !== parDefaut) etat[id] = el.value;
  }
  return etat;
}

/** Applique un état au formulaire (légume et stade d'abord : ils pré-remplissent la photopériode). */
function appliquerEtat(etat: Etat): void {
  if (etat.legume && trouverLegume(etat.legume)) {
    selectLegume.value = etat.legume;
    appliquerLegume();
  }
  for (const nom of ['stade', 'mode'] as const) {
    const choix = etat[nom] && form.querySelector<HTMLInputElement>(`input[name="${nom}"][value="${etat[nom]}"]`);
    if (choix && !choix.disabled) choix.checked = true;
  }
  appliquerStade();
  appliquerMode();
  for (const [id, valeur] of Object.entries(etat)) {
    const el = document.getElementById(id);
    if (el instanceof HTMLInputElement && el.type === 'text') el.value = valeur;
  }
}

function lireMemoire(): Etat {
  try {
    return depuisParams(localStorage.getItem(CLE_MEMOIRE) ?? '');
  } catch {
    return {};
  }
}

/** Met à jour l'adresse (lien partageable) et mémorise les réglages sur l'appareil. */
function enregistrerEtat(): void {
  const params = versParams(lireEtat());
  const adresse = integre ? avecIntegre(params) : params;
  try {
    history.replaceState(null, '', `${location.pathname}${adresse ? `?${adresse}` : ''}${location.hash}`);
  } catch {
    /* adresse non modifiable (aperçu, iframe) : sans importance */
  }
  try {
    localStorage.setItem(CLE_MEMOIRE, params);
  } catch {
    /* stockage indisponible (navigation privée) : sans importance */
  }
}

async function partager(): Promise<void> {
  const bouton = $<HTMLButtonElement>('partager');
  const url = sansIntegre(location.href);
  const libelle = bouton.textContent;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Mon calcul d’éclairage LED — OptiLED', url });
      return;
    }
    await navigator.clipboard.writeText(url);
    bouton.textContent = 'Lien copié ✓';
  } catch (e) {
    if ((e as Error).name === 'AbortError') return; // partage annulé par l'utilisateur
    bouton.textContent = 'Échec';
  }
  setTimeout(() => (bouton.textContent = libelle), 2000);
}

/**
 * Lien reçu avec des réglages dans l'adresse (?l=…&L=…) : bandeau en haut de page qui résume
 * le calcul et mène aux résultats. Il disparaît dès que le visiteur modifie un réglage.
 */
function bandeauCalculPartage(): void {
  if (Object.keys(etatAdresse).length === 0 || !dernierCalcul) return;
  const { r, surface } = dernierCalcul;
  const cadre = document.createElement('div');
  cadre.className = 'conteneur';
  cadre.innerHTML = `<div class="calcul-partage" role="region" aria-label="Calcul partagé">
    <p><strong>Calcul partagé :</strong> ${echapper(typographier(resumeCalculPartage(legumeCourant().nom, surface, r.puissanceW, r.barres.total)))}.</p>
    <a href="#resultats">Voir le résultat <svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>
  </div>`;
  $('calculateur').before(cadre);
  const retirer = () => cadre.remove();
  form.addEventListener('input', retirer, { once: true });
  form.addEventListener('change', retirer, { once: true });
  tuilesLegumes.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-legume]')) retirer();
  });
}

remplirLegumes();
remplirTuiles();
navigationTuiles();
deplierTuiles();
boutonsPas();
appliquerLegume();
appliquerMode();
// Priorité : réglages présents dans l'adresse (lien partagé), sinon derniers réglages mémorisés.
const etatAdresse = depuisParams(location.search);
appliquerEtat(Object.keys(etatAdresse).length > 0 ? etatAdresse : lireMemoire());

selectLegume.addEventListener('change', appliquerLegume);
form.addEventListener('change', (e) => {
  const cible = e.target as HTMLInputElement;
  if (cible.name === 'stade') appliquerStade();
  if (cible.name === 'mode') appliquerMode();
  mettreAJour();
});
form.addEventListener('input', mettreAJour);
form.addEventListener('submit', (e) => e.preventDefault());
boutonCopier.addEventListener('click', copier);
$('imprimer').addEventListener('click', () => window.print());
$('partager').addEventListener('click', partager);

mettreAJour();
bandeauCalculPartage();
// Arrivée directe sur les résultats (#resultats, position restaurée) : la barre ne doit pas les recouvrir.
suivreResultats();
window.addEventListener('load', suivreResultats);
