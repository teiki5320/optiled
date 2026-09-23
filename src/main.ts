import './site.css';
import './style.css';
import { calculer, type EntreesCalcul, type ResultatCalcul, type Surface } from './calc';
import { LEGUMES, legumesParFamille, parametresStade, trouverLegume, type Stade } from './data';
import { euros, nombre } from './format';
import { listeAchat, resumeTexte, type ContexteListe } from './liste';

const LONGUEUR_BARRE_DEFAUT_M = 1.2;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const champ = (id: string) => $<HTMLInputElement>(id);

const form = $<HTMLFormElement>('formulaire');
const selectLegume = $<HTMLSelectElement>('legume');
const contenu = $<HTMLDivElement>('contenu-resultats');
const zoneErreurs = $<HTMLParagraphElement>('erreurs');
const boutonCopier = $<HTMLButtonElement>('copier');

let dernierResume = '';

function echapper(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
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
  // Le légume peut être présélectionné par l'URL : calculateur.html?legume=tomate
  const demande = new URLSearchParams(location.search).get('legume');
  selectLegume.value = demande && trouverLegume(demande) ? demande : LEGUMES[0].id;
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

function tuile(libelle: string, valeur: string, unite: string, note = ''): string {
  return `<div class="tuile"><span class="libelle">${libelle}</span>
    <span class="valeur">${valeur}<small> ${unite}</small></span>
    ${note ? `<span class="note">${note}</span>` : ''}</div>`;
}

function rendre(r: ResultatCalcul, ctx: ContexteListe, sources: { ppfd: string; hauteur: string; spectre: string }): string {
  const b = r.barres;
  const dispo =
    `${b.lignesParZone} ligne${b.lignesParZone > 1 ? 's' : ''} de ${b.barresParLigne} barre${b.barresParLigne > 1 ? 's' : ''} bout à bout` +
    (b.zones > 1 ? ` au-dessus de chacun des ${b.zones} rangs` : '');
  const puissanceBarre = ctx.puissanceBarreW
    ? `Barres de ${nombre(ctx.puissanceBarreW)} W : ${nombre(b.puissanceInstalleeW)} W installés, à régler à ~${nombre(b.tauxGradation * 100)} %.`
    : `Chaque barre doit fournir au moins ${nombre(b.puissanceParBarreNecessaireW)} W.`;
  const cout = r.coutAnEur === null
    ? tuile('Coût annuel', '—', '', 'Indiquez le prix du kWh dans les options')
    : tuile('Coût annuel', euros(r.coutAnEur), '', `${nombre(r.coutAnEur / 12, 2)} € / mois`);

  const achats = listeAchat(r, ctx)
    .map((a) => `<tr><td class="qte">${a.quantite}</td><td><strong>${echapper(a.article)}</strong><br><span>${echapper(a.detail)}</span></td></tr>`)
    .join('');

  return `
    <p class="sous-titre">${echapper(ctx.legume)} · ${echapper(ctx.stade)} · ${nombre(r.surfaceM2, 2)} m²</p>
    <div class="tuiles">
      ${tuile('PPFD cible', nombre(r.ppfd), 'µmol/m²/s')}
      ${tuile('DLI', nombre(r.dli, 1), 'mol/m²/j', `${nombre(ctx.photoperiodeH)} h/jour`)}
      ${tuile('Flux nécessaire (PPF)', nombre(r.ppfNecessaire), 'µmol/s', `dont ${nombre(r.ppfUtile)} utiles`)}
      ${tuile('Puissance électrique', nombre(r.puissanceW), 'W', `${nombre(r.densitePuissanceWm2)} W/m²`)}
    </div>
    <p class="source">Source PPFD : ${echapper(sources.ppfd)}</p>

    <h3>Barres LED et disposition</h3>
    <p><strong>${b.total} barre${b.total > 1 ? 's' : ''} de ${nombre(ctx.longueurBarreM, 2)} m</strong> : ${dispo}.</p>
    <p>Entraxe entre lignes : <strong>${nombre(b.espacementM * 100)} cm</strong>, première ligne à ${nombre(b.margeBordM * 100)} cm du bord.</p>
    <p>${puissanceBarre}</p>

    <h3>Spectre et hauteur</h3>
    <p><strong>Spectre :</strong> ${echapper(ctx.spectre)}</p>
    <p class="source">Source : ${echapper(sources.spectre)}</p>
    <p><strong>Hauteur de suspension :</strong> ${r.hauteurCm[0]} à ${r.hauteurCm[1]} cm au-dessus du feuillage (monter si les feuilles blanchissent, descendre si les tiges s'étirent).</p>
    <p class="source">Source : ${echapper(sources.hauteur)}</p>

    <h3>Consommation</h3>
    <div class="tuiles">
      ${tuile('Par jour', nombre(r.consoJourKwh, 2), 'kWh')}
      ${tuile('Par an', nombre(r.consoAnKwh), 'kWh')}
      ${cout}
    </div>

    <h3>Liste d'achat</h3>
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
  contenu.innerHTML = rendre(r, ctx, { ppfd: p.ppfd.source, hauteur: p.hauteur_cm.source, spectre: p.spectre.source });
  dernierResume = resumeTexte(r, ctx);
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
