/**
 * Calculs d'éclairage horticole — module pur, sans accès au DOM.
 * Toutes les formules sont détaillées dans le README.
 */

export type Surface =
  | { mode: 'rectangle'; longueurM: number; largeurM: number }
  | { mode: 'rangs'; nbRangs: number; longueurM: number; largeurRangM: number };

export interface EntreesCalcul {
  /** PPFD cible au niveau de la canopée, µmol/m²/s */
  ppfd: number;
  /** Heures d'éclairage par jour */
  photoperiodeH: number;
  surface: Surface;
  /** Efficacité des luminaires, µmol/J (défaut 2,7) */
  efficaciteUmolJ: number;
  /** Part du flux émis qui atteint réellement la culture (0–1, défaut 0,8) */
  coefUtilisation: number;
  /** Hauteur de suspension conseillée [min, max] en cm */
  hauteurCm: [number, number];
  /** Longueur d'une barre LED, m */
  longueurBarreM: number;
  /** Puissance d'une barre LED, W (optionnel : sinon on calcule la puissance mini) */
  puissanceBarreW?: number;
  /** Prix du kWh, € (optionnel) */
  prixKwh?: number;
  /** Jours d'éclairage par an (défaut 365) */
  joursParAn: number;
}

export interface ResultatBarres {
  /** Nombre de zones éclairées (1 en mode rectangle, nb de rangs sinon) */
  zones: number;
  /** Barres mises bout à bout dans le sens de la longueur */
  barresParLigne: number;
  /** Lignes de barres parallèles par zone */
  lignesParZone: number;
  total: number;
  /** Entraxe entre deux lignes de barres, m */
  espacementM: number;
  /** Distance bord de culture → première ligne, m */
  margeBordM: number;
  /** Puissance que chaque barre doit délivrer pour atteindre la cible, W */
  puissanceParBarreNecessaireW: number;
  /** Puissance installée (nb barres × puissance barre), W */
  puissanceInstalleeW: number;
  /** Taux de gradation nécessaire (puissance nécessaire / installée), 0–1 */
  tauxGradation: number;
}

export interface ResultatCalcul {
  surfaceM2: number;
  ppfd: number;
  /** mol/m²/jour */
  dli: number;
  /** Flux photonique utile sur la culture, µmol/s */
  ppfUtile: number;
  /** Flux photonique à émettre par les luminaires, µmol/s */
  ppfNecessaire: number;
  /** Puissance électrique nécessaire, W */
  puissanceW: number;
  /** W/m² */
  densitePuissanceWm2: number;
  barres: ResultatBarres;
  hauteurCm: [number, number];
  /** kWh / jour */
  consoJourKwh: number;
  /** kWh / an */
  consoAnKwh: number;
  /** € / an (null si pas de prix) */
  coutAnEur: number | null;
}

/** Tolérance : on n'ajoute pas une barre pour couvrir moins d'un quart de sa longueur. */
export const TOLERANCE_LONGUEUR = 0.25;

/** DLI (mol/m²/j) = PPFD × heures × 3600 / 1 000 000 */
export function calculerDli(ppfd: number, heures: number): number {
  return (ppfd * heures * 3600) / 1e6;
}

/** PPFD (µmol/m²/s) nécessaire pour atteindre un DLI donné. */
export function ppfdDepuisDli(dli: number, heures: number): number {
  return (dli * 1e6) / (heures * 3600);
}

export function dimensionsZone(s: Surface): { zones: number; longueurM: number; largeurM: number } {
  return s.mode === 'rectangle'
    ? { zones: 1, longueurM: s.longueurM, largeurM: s.largeurM }
    : { zones: s.nbRangs, longueurM: s.longueurM, largeurM: s.largeurRangM };
}

export function calculerSurface(s: Surface): number {
  const z = dimensionsZone(s);
  return z.zones * z.longueurM * z.largeurM;
}

/** Retourne la liste des erreurs de saisie (vide si tout est valide). */
export function validerEntrees(e: EntreesCalcul): string[] {
  const erreurs: string[] = [];
  const positif = (v: number | undefined, nom: string) => {
    if (v === undefined || !Number.isFinite(v) || v <= 0) erreurs.push(`${nom} doit être un nombre strictement positif.`);
  };
  positif(e.ppfd, 'Le PPFD cible');
  positif(e.photoperiodeH, 'La photopériode');
  if (e.photoperiodeH > 24) erreurs.push('La photopériode ne peut pas dépasser 24 h.');
  const z = dimensionsZone(e.surface);
  positif(z.longueurM, 'La longueur');
  positif(z.largeurM, 'La largeur');
  if (e.surface.mode === 'rangs' && (!Number.isInteger(e.surface.nbRangs) || e.surface.nbRangs < 1)) {
    erreurs.push('Le nombre de rangs doit être un entier ≥ 1.');
  }
  positif(e.efficaciteUmolJ, "L'efficacité des LED");
  if (e.efficaciteUmolJ > 5) erreurs.push("L'efficacité dépasse 5 µmol/J : valeur irréaliste.");
  positif(e.coefUtilisation, "Le coefficient d'utilisation");
  if (e.coefUtilisation > 1) erreurs.push("Le coefficient d'utilisation doit être compris entre 0 et 1.");
  positif(e.longueurBarreM, 'La longueur des barres');
  if (e.puissanceBarreW !== undefined) positif(e.puissanceBarreW, 'La puissance des barres');
  if (e.prixKwh !== undefined && (!Number.isFinite(e.prixKwh) || e.prixKwh < 0)) {
    erreurs.push('Le prix du kWh doit être positif ou nul.');
  }
  positif(e.joursParAn, "Le nombre de jours d'éclairage");
  if (e.joursParAn > 366) erreurs.push("Le nombre de jours d'éclairage ne peut pas dépasser 366.");
  return erreurs;
}

/**
 * Répartition des barres LED sur une zone.
 * - Dans la longueur : barres bout à bout.
 * - Dans la largeur : lignes parallèles, entraxe ≤ hauteur de suspension moyenne
 *   (règle d'uniformité pour des optiques ~120°), et assez de lignes pour la puissance.
 */
export function repartirBarres(params: {
  surface: Surface;
  puissanceTotaleW: number;
  hauteurCm: [number, number];
  longueurBarreM: number;
  puissanceBarreW?: number;
}): ResultatBarres {
  const { zones, longueurM, largeurM } = dimensionsZone(params.surface);
  const barresParLigne = Math.max(1, Math.ceil(longueurM / params.longueurBarreM - TOLERANCE_LONGUEUR));

  const hauteurMoyenneM = (params.hauteurCm[0] + params.hauteurCm[1]) / 2 / 100;
  const lignesUniformite = Math.max(1, Math.ceil(largeurM / hauteurMoyenneM));

  const puissanceZoneW = params.puissanceTotaleW / zones;
  const lignesPuissance = params.puissanceBarreW
    ? Math.ceil(puissanceZoneW / (barresParLigne * params.puissanceBarreW))
    : 1;
  const lignesParZone = Math.max(lignesUniformite, lignesPuissance);

  const total = zones * barresParLigne * lignesParZone;
  const puissanceParBarreNecessaireW = params.puissanceTotaleW / total;
  const puissanceInstalleeW = params.puissanceBarreW ? total * params.puissanceBarreW : params.puissanceTotaleW;
  const espacementM = largeurM / lignesParZone;

  return {
    zones,
    barresParLigne,
    lignesParZone,
    total,
    espacementM,
    margeBordM: espacementM / 2,
    puissanceParBarreNecessaireW,
    puissanceInstalleeW,
    tauxGradation: params.puissanceTotaleW / puissanceInstalleeW,
  };
}

export function calculer(e: EntreesCalcul): ResultatCalcul {
  const erreurs = validerEntrees(e);
  if (erreurs.length > 0) throw new RangeError(erreurs.join(' '));

  const surfaceM2 = calculerSurface(e.surface);
  const dli = calculerDli(e.ppfd, e.photoperiodeH);
  const ppfUtile = e.ppfd * surfaceM2;
  const ppfNecessaire = ppfUtile / e.coefUtilisation;
  const puissanceW = ppfNecessaire / e.efficaciteUmolJ;

  const barres = repartirBarres({
    surface: e.surface,
    puissanceTotaleW: puissanceW,
    hauteurCm: e.hauteurCm,
    longueurBarreM: e.longueurBarreM,
    puissanceBarreW: e.puissanceBarreW,
  });

  const consoJourKwh = (puissanceW * e.photoperiodeH) / 1000;
  const consoAnKwh = consoJourKwh * e.joursParAn;
  const coutAnEur = e.prixKwh === undefined ? null : consoAnKwh * e.prixKwh;

  return {
    surfaceM2,
    ppfd: e.ppfd,
    dli,
    ppfUtile,
    ppfNecessaire,
    puissanceW,
    densitePuissanceWm2: puissanceW / surfaceM2,
    barres,
    hauteurCm: e.hauteurCm,
    consoJourKwh,
    consoAnKwh,
    coutAnEur,
  };
}

export interface VerificationLampe {
  /** Efficacité réelle de la lampe, µmol/J (PPF ÷ puissance) */
  efficaciteUmolJ: number;
  /** Nombre de lampes nécessaires pour fournir le PPF */
  nombre: number;
  /** PPFD moyen obtenu avec ce nombre de lampes, µmol/m²/s */
  ppfdObtenu: number;
  /** Appréciation de l'efficacité annoncée */
  appreciation: 'faible' | 'correcte' | 'bonne' | 'douteuse';
}

/**
 * Vérifie une lampe du commerce à partir de son PPF et de sa puissance réelle :
 * efficacité, nombre de lampes pour atteindre le flux nécessaire, PPFD obtenu.
 */
export function verifierLampe(params: {
  ppfLampe: number;
  puissanceLampeW: number;
  ppfNecessaire: number;
  surfaceM2: number;
  coefUtilisation: number;
}): VerificationLampe {
  const efficaciteUmolJ = params.ppfLampe / params.puissanceLampeW;
  const nombre = Math.max(1, Math.ceil(params.ppfNecessaire / params.ppfLampe - 1e-9));
  const ppfdObtenu = (nombre * params.ppfLampe * params.coefUtilisation) / params.surfaceM2;
  const appreciation =
    efficaciteUmolJ > 3.5 ? 'douteuse' : efficaciteUmolJ >= 2.5 ? 'bonne' : efficaciteUmolJ >= 2 ? 'correcte' : 'faible';
  return { efficaciteUmolJ, nombre, ppfdObtenu, appreciation };
}
