import './site';
import './style.css';
import './theme-calcul.css';
import { alertes } from './alertes';
import { calculer, dimensionsZone, longueurBarreConseillee, nombrePlants, verifierLampe, type EntreesCalcul, type ResultatCalcul, type Surface } from './calc';
import { depuisParams, PARAMETRES, versParams, type Etat } from './etat';
import { LEGUMES, legumesParFamille, parametresStade, trouverLegume, type Stade } from './data';
import { euros, nombre } from './format';
import { htmlTuiles } from './tuiles';
import { insecables, typographier } from './typo';
import { arrondiPuissance, listeAchat, resumeTexte, type ContexteListe } from './liste';
import { jaugeDli, planBarres } from './schema';

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
    appliquerLegume();
    mettreAJour();
  });
}

function majTuiles(): void {
  tuilesLegumes.querySelectorAll<HTMLButtonElement>('[data-legume]').forEach((b) => {
    const choisi = b.dataset.legume === selectLegume.value;
    b.setAttribute('aria-pressed', String(choisi));
    // Une seule tuile atteignable par Tab ; les flèches parcourent les autres.
    b.tabIndex = choisi ? 0 : -1;
  });
}

/** Flèches, Début et Fin pour parcourir les tuiles de légumes au clavier. */
function navigationTuiles(): void {
  tuilesLegumes.addEventListener('keydown', (e) => {
    const tuiles = [...tuilesLegumes.querySelectorAll<HTMLButtonElement>('[data-legume]')];
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
      <div class="anneau" style="--deg:${degres}deg" role="img" aria-label="${nombre(r.puissanceW)} W ; DLI ${nombre(r.dli, 1)} mol/m²/j"><div><strong>${nombre(r.puissanceW)}</strong><span>watts</span></div></div>
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
    ${b.total <= PLAN_BARRES_MAX ? `<figure class="plan-cadre">${planBarres(surface, b, ctx.longueurBarreM)}<figcaption>Vue de dessus, à l'échelle. Les barres sont centrées dans la longueur.</figcaption></figure>` : `<p class="aide">Plan non dessiné au-delà de ${PLAN_BARRES_MAX} barres.</p>`}
    <p>Entraxe entre lignes : <strong>${nombre(b.espacementM * 100)} cm</strong>, première ligne à ${nombre(b.margeBordM * 100)} cm du bord.</p>
    <p>${puissanceBarre}</p>

    ${rendreLampe(r)}
    ${titre('Spectre et hauteur', 'led-bases.html#spectre', 'Le rôle du spectre')}
    <p><strong>Spectre :</strong> ${echapper(ctx.spectre)}</p>
    <p><strong>Hauteur de suspension :</strong> ${r.hauteurCm[0]} à ${r.hauteurCm[1]} cm au-dessus du feuillage (monter si les feuilles blanchissent, descendre si les tiges s'étirent).</p>

    ${titre('Consommation', 'led-choisir.html#chaleur', 'Chaleur et consommation')}
    <div class="tuiles">
      ${tuile('Par jour', nombre(r.consoJourKwh, 2), 'kWh')}
      ${tuile('Par an', nombre(r.consoAnKwh), 'kWh')}
      ${cout}
    </div>

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
  try {
    if (espacementCm !== undefined && !(espacementCm >= 5 && espacementCm <= 300)) {
      throw new RangeError("L'espacement entre plants doit être compris entre 5 et 300 cm.");
    }
    r = calculer(entrees);
  } catch (e) {
    zoneErreurs.textContent = typographier((e as Error).message);
    zoneErreurs.hidden = false;
    signalerChamps((e as Error).message);
    contenu.classList.add('perime');
    majBarreResume(null);
    dernierResume = '';
    return;
  }
  zoneErreurs.hidden = true;
  signalerChamps('');
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
  if (plantation && espacementCm !== undefined) ctx.plants = { total: plantation.total, espacementCm };
  ctx.alertes = alertes({
    legumeId: legume.id,
    nom: nomCourt(legume.nom),
    stade,
    photoperiodeH: entrees.photoperiodeH,
    photoperiodeConseilleeH: p.photoperiode.valeur,
    efficaciteUmolJ: entrees.efficaciteUmolJ,
    longueurBarreM,
    longueurZoneM,
    rangTropEtroit:
      plantation?.rangTropEtroit && surface.mode === 'rangs'
        ? { largeurCm: Math.round(surface.largeurRangM * 100), espacementCm: espacementCm! }
        : undefined,
  });
  contenu.innerHTML = insecables(rendre(r, ctx, entrees.surface));
  dernierResume = resumeTexte(r, ctx);
  majBarreResume(r);
  annoncer(r);
  enregistrerEtat();
}

/** Champs concernés par un message d'erreur : marqués aria-invalid pour les lecteurs d'écran. */
const CHAMPS_ERREUR: [RegExp, string[]][] = [
  [/longueur des barres/i, ['longueur-barre']],
  [/^La longueur|Les dimensions/m, ['longueur', 'longueur-rang']],
  [/^La largeur|Les dimensions/m, ['largeur', 'largeur-rang']],
  [/rangs/, ['nb-rangs']],
  [/photopériode/, ['photoperiode']],
  [/efficacité/, ['efficacite']],
  [/coefficient/, ['coef']],
  [/puissance des barres/, ['puissance-barre']],
  [/prix du kWh/, ['prix-kwh']],
  [/jours d'éclairage/, ['jours']],
  [/espacement/, ['espacement']],
];
function signalerChamps(message: string): void {
  const ids = new Set(CHAMPS_ERREUR.filter(([motif]) => motif.test(message)).flatMap(([, ids]) => ids));
  form.querySelectorAll<HTMLInputElement>('input[type="text"]').forEach((c) => {
    if (ids.has(c.id)) c.setAttribute('aria-invalid', 'true');
    else c.removeAttribute('aria-invalid');
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
  try {
    history.replaceState(null, '', `${location.pathname}${params ? `?${params}` : ''}${location.hash}`);
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
  const url = location.href;
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

remplirLegumes();
remplirTuiles();
navigationTuiles();
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
// Arrivée directe sur les résultats (#resultats, position restaurée) : la barre ne doit pas les recouvrir.
suivreResultats();
window.addEventListener('load', suivreResultats);
