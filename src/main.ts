import './site';
import './style.css';
import './theme-calcul.css';
import { calculer, type EntreesCalcul, type ResultatCalcul, type Surface } from './calc';
import { LEGUMES, legumesParFamille, parametresStade, trouverLegume, type Stade } from './data';
import { euros, nombre } from './format';
import { listeAchat, resumeTexte, type ContexteListe } from './liste';
import { jaugeDli, planBarres } from './schema';

const LONGUEUR_BARRE_DEFAUT_M = 1.2;
/** DLI qui remplit entièrement l'anneau de synthèse (mol/m²/j). */
const DLI_ANNEAU_MAX = 30;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const champ = (id: string) => $<HTMLInputElement>(id);

const form = $<HTMLFormElement>('formulaire');
const selectLegume = $<HTMLSelectElement>('legume');
const tuilesLegumes = $<HTMLDivElement>('tuiles-legumes');
const contenu = $<HTMLDivElement>('contenu-resultats');
const zoneErreurs = $<HTMLParagraphElement>('erreurs');
const boutonCopier = $<HTMLButtonElement>('copier');

let dernierResume = '';

function echapper(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** « Légumes feuilles » → « legumes-feuilles » (même convention que les fiches). */
function slug(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Lit un champ numérique ; undefined s'il est vide. Accepte la virgule décimale. */
function lireNombre(id: string): number | undefined {
  const brut = champ(id).value.trim().replace(/\s/g, '').replace(',', '.');
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

/** Tuiles cliquables des légumes : elles pilotent la liste déroulante (masquée). */
function remplirTuiles(): void {
  const html: string[] = [];
  for (const [famille, liste] of legumesParFamille()) {
    for (const l of liste) {
      html.push(
        `<button type="button" class="tuile-legume tuile-legume--${slug(famille)}" data-legume="${l.id}" aria-pressed="false">` +
          `<span class="tuile-legume__pastille" aria-hidden="true"></span>${echapper(l.nom.replace(/\s*\(.*\)$/, ''))}</button>`,
      );
    }
  }
  tuilesLegumes.innerHTML = html.join('');
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
    b.setAttribute('aria-pressed', String(b.dataset.legume === selectLegume.value));
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
    aide.textContent = `${legume.nom} se récolte avant floraison : seul le stade croissance s'applique.`;
  }
  aide.hidden = !sansFloraison;
  majTuiles();
  appliquerStade();
}

function appliquerStade(): void {
  const p = parametresStade(trouverLegume(selectLegume.value)!, radio('stade') as Stade)!;
  champ('photoperiode').value = String(p.photoperiode.valeur).replace('.', ',');
  $('photoperiode-aide').textContent = `Conseillé : ${p.photoperiode.valeur} h — ${p.photoperiode.source}`;
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

function rendre(r: ResultatCalcul, ctx: ContexteListe, surface: Surface, sources: { ppfd: string; hauteur: string; spectre: string }): string {
  const b = r.barres;
  const dispo =
    `${b.lignesParZone} ligne${b.lignesParZone > 1 ? 's' : ''} de ${b.barresParLigne} barre${b.barresParLigne > 1 ? 's' : ''} bout à bout` +
    (b.zones > 1 ? ` au-dessus de chacun des ${b.zones} rangs` : '');
  const puissanceBarre = ctx.puissanceBarreW
    ? `Barres de ${nombre(ctx.puissanceBarreW)} W : ${nombre(b.puissanceInstalleeW)} W installés, à régler à ~${nombre(b.tauxGradation * 100)} %.`
    : `Chaque barre doit fournir au moins ${nombre(b.puissanceParBarreNecessaireW)} W.`;
  const parBarreCourt = ctx.puissanceBarreW
    ? `${nombre(ctx.puissanceBarreW)} W chacune, réglées à ~${nombre(b.tauxGradation * 100)} %`
    : `≥ ${nombre(b.puissanceParBarreNecessaireW)} W chacune`;
  const cout = r.coutAnEur === null
    ? tuile('Coût annuel', '—', '', 'Indiquez le prix du kWh dans les options')
    : tuile('Coût annuel', euros(r.coutAnEur), '', `${nombre(r.coutAnEur / 12, 2)} € / mois`);
  const degres = Math.min(360, (r.dli / DLI_ANNEAU_MAX) * 360).toFixed(1);

  const achats = listeAchat(r, ctx)
    .map((a) => `<tr><td class="qte">${a.quantite}</td><td><strong>${echapper(a.article)}</strong><br><span>${echapper(a.detail)}</span></td></tr>`)
    .join('');

  return `
    <p class="sous-titre">${echapper(ctx.legume)} · ${echapper(ctx.stade)} · ${nombre(r.surfaceM2, 2)} m² · <a href="legumes.html#${selectLegume.value}">fiche ${echapper(ctx.legume.toLowerCase())}</a></p>
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
    </div>
    ${jaugeDli(r.dli)}
    <p class="source">Source PPFD : ${echapper(sources.ppfd)}</p>

    ${titre('Barres LED et disposition', 'led-installation.html#uniformite', 'Bien répartir la lumière')}
    <p><strong>${b.total} barre${b.total > 1 ? 's' : ''} de ${nombre(ctx.longueurBarreM, 2)} m</strong> : ${dispo}.</p>
    <figure class="plan-cadre">${planBarres(surface, b, ctx.longueurBarreM)}<figcaption>Vue de dessus, à l'échelle. Les barres sont centrées dans la longueur.</figcaption></figure>
    <p>Entraxe entre lignes : <strong>${nombre(b.espacementM * 100)} cm</strong>, première ligne à ${nombre(b.margeBordM * 100)} cm du bord.</p>
    <p>${puissanceBarre}</p>

    ${titre('Spectre et hauteur', 'led-bases.html#spectre', 'Le rôle du spectre')}
    <p><strong>Spectre :</strong> ${echapper(ctx.spectre)}</p>
    <p class="source">Source : ${echapper(sources.spectre)}</p>
    <p><strong>Hauteur de suspension :</strong> ${r.hauteurCm[0]} à ${r.hauteurCm[1]} cm au-dessus du feuillage (monter si les feuilles blanchissent, descendre si les tiges s'étirent).</p>
    <p class="source">Source : ${echapper(sources.hauteur)}</p>

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
  const longueurBarreM = lireNombre('longueur-barre') ?? LONGUEUR_BARRE_DEFAUT_M;

  const entrees: EntreesCalcul = {
    ppfd: p.ppfd.valeur,
    photoperiodeH: lireNombre('photoperiode') ?? NaN,
    surface: lireSurface(),
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
    r = calculer(entrees);
  } catch (e) {
    zoneErreurs.textContent = (e as Error).message;
    zoneErreurs.hidden = false;
    contenu.classList.add('perime');
    majBarreResume(null);
    dernierResume = '';
    return;
  }
  zoneErreurs.hidden = true;
  contenu.classList.remove('perime');

  const ctx: ContexteListe = {
    legume: legume.nom,
    stade: stade === 'croissance' ? 'croissance' : 'floraison / fructification',
    spectre: p.spectre.valeur,
    efficaciteUmolJ: entrees.efficaciteUmolJ,
    longueurBarreM,
    puissanceBarreW: entrees.puissanceBarreW,
    photoperiodeH: entrees.photoperiodeH,
  };
  contenu.innerHTML = rendre(r, ctx, entrees.surface, { ppfd: p.ppfd.source, hauteur: p.hauteur_cm.source, spectre: p.spectre.source });
  dernierResume = resumeTexte(r, ctx);
  majBarreResume(r);
}

/**
 * Barre de résumé fixée en bas de l'écran sur mobile : elle rappelle les chiffres clés
 * pendant la saisie et mène aux résultats. Masquée quand les résultats sont visibles.
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
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => {
    resultatsVisibles = e.isIntersecting;
    barreResume.hidden = resultatsVisibles || zoneErreurs.hidden === false;
  }).observe($('resultats'));
}

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

remplirLegumes();
remplirTuiles();
boutonsPas();
appliquerLegume();
appliquerMode();

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

mettreAJour();
