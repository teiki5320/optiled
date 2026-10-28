import type { ResultatCalcul } from './calc.ts';
import { accord, euros, nombre } from './format.ts';

export interface ContexteListe {
  legume: string;
  stade: string;
  spectre: string;
  efficaciteUmolJ: number;
  longueurBarreM: number;
  puissanceBarreW?: number;
  photoperiodeH: number;
  /** Mise en garde éventuelle (ex. safran, wasabi) */
  avertissement?: string;
  /** Nombre de plants et espacement, si la culture se plante à espacement régulier */
  plants?: { total: number; espacementCm: number };
  /** Grille des plants pour le plan vu de dessus */
  plantsPlan?: { parLigne: number; lignes: number; espacementM: number };
  /** Autres mises en garde du calculateur (photopériode, barres trop longues…) */
  alertes?: string[];
}

export interface ArticleAchat {
  quantite: number;
  article: string;
  detail: string;
  /** Page « Top 10 » de cet objet sur le site (lien interne, jamais un lien Amazon direct). */
  top10?: { href: string; libelle: string };
}

/** Pages « Top 10 » liées à la liste d'achat (build/top-10.ts : top-10-<sujet>.html). */
export const TOP10_LISTE = {
  lampes: { href: 'top-10-lampes-led-de-culture.html', libelle: 'Top 10 des lampes LED de culture' },
  minuteurs: { href: 'top-10-minuteurs-thermometres.html', libelle: 'Top 10 des minuteurs et thermomètres' },
  tentes: { href: 'top-10-tentes-de-culture.html', libelle: 'Top 10 des tentes de culture' },
  extracteurs: { href: 'top-10-extracteurs-ventilateurs.html', libelle: 'Top 10 des extracteurs et ventilateurs' },
} as const;

/** Surface à partir de laquelle on conseille une tente (60 × 60 cm) et son extracteur. */
export const SURFACE_TENTE_M2 = 0.36;

/** Arrondit une puissance au multiple de 5 W supérieur (lisibilité en magasin). */
export function arrondiPuissance(w: number): number {
  return Math.ceil(w / 5) * 5;
}

export function listeAchat(r: ResultatCalcul, c: ContexteListe): ArticleAchat[] {
  const b = r.barres;
  const puissanceBarre = c.puissanceBarreW
    ? `${nombre(c.puissanceBarreW)} W, avec variateur réglé à ~${nombre(b.tauxGradation * 100)} %`
    : `≥ ${nombre(arrondiPuissance(b.puissanceParBarreNecessaireW))} W chacune, avec variateur (fortement conseillé)`;

  const tente = r.surfaceM2 >= SURFACE_TENTE_M2 - 1e-9;
  return [
    {
      quantite: b.total,
      article: `Barres LED horticoles de ${nombre(c.longueurBarreM, 2)} m`,
      detail: `${puissanceBarre} · efficacité ≥ ${nombre(c.efficaciteUmolJ, 1)} µmol/J · ${c.spectre}`,
      top10: TOP10_LISTE.lampes,
    },
    {
      quantite: 1,
      article: 'Alimentation / drivers',
      detail: `capacité totale ≥ ${nombre(arrondiPuissance(b.puissanceInstalleeW * 1.1))} W (marge de 10 %)`,
    },
    {
      quantite: b.total,
      article: 'Paires de suspensions réglables (cliquets ou câbles)',
      detail: `pour régler la hauteur entre ${r.hauteurCm[0]} et ${r.hauteurCm[1]} cm au-dessus des plantes`,
    },
    {
      quantite: 1,
      article: 'Programmateur (minuterie)',
      detail: `${nombre(c.photoperiodeH)} h d'éclairage par jour, calibre ≥ ${nombre(arrondiPuissance(b.puissanceInstalleeW * 1.1))} W`,
      top10: TOP10_LISTE.minuteurs,
    },
    {
      quantite: 1,
      article: 'Thermo-hygromètre min/max',
      detail: 'pour surveiller la température et l’humidité au niveau des feuilles',
      top10: TOP10_LISTE.minuteurs,
    },
    ...(tente
      ? [
          {
            quantite: 1,
            article: 'Tente de culture (facultative)',
            detail: `au moins ${nombre(r.surfaceM2, 2)} m² au sol, parois réfléchissantes`,
            top10: TOP10_LISTE.tentes,
          },
          {
            quantite: 1,
            article: 'Extracteur d’air avec gaine (si tente)',
            detail: 'pour évacuer la chaleur et l’humidité de la tente',
            top10: TOP10_LISTE.extracteurs,
          },
        ]
      : []),
    {
      quantite: 1,
      article: 'PAR-mètre (optionnel, recommandé)',
      detail: `pour vérifier ~${nombre(r.ppfd)} µmol/m²/s au niveau des feuilles`,
    },
  ];
}

/** Résumé texte brut, destiné au presse-papiers. */
export function resumeTexte(r: ResultatCalcul, c: ContexteListe): string {
  const b = r.barres;
  const lignes = [
    `Calculateur LED culture indoor — ${c.legume} (${c.stade})`,
    '',
    `Surface éclairée : ${nombre(r.surfaceM2, 2)} m²`,
    `PPFD cible : ${nombre(r.ppfd)} µmol/m²/s`,
    `DLI : ${nombre(r.dli, 1)} mol/m²/jour (${nombre(c.photoperiodeH)} h/jour)`,
    `Flux nécessaire (PPF) : ${nombre(r.ppfNecessaire)} µmol/s`,
    `Puissance électrique : ${nombre(r.puissanceW)} W (${nombre(r.densitePuissanceWm2)} W/m²)`,
    `Barres : ${b.total} × ${nombre(c.longueurBarreM, 2)} m — ${b.lignesParZone} ${accord(b.lignesParZone, 'ligne')} de ${b.barresParLigne} ${accord(b.barresParLigne, 'barre')}` +
      (b.zones > 1 ? ` par rang, ${b.zones} rangs` : ''),
    `Entraxe des lignes : ${nombre(b.espacementM * 100)} cm (1re ligne à ${nombre(b.margeBordM * 100)} cm du bord)`,
    `Hauteur de suspension : ${r.hauteurCm[0]}–${r.hauteurCm[1]} cm`,
    `Spectre : ${c.spectre}`,
    `Consommation : ${nombre(r.consoJourKwh, 2)} kWh/jour, ${nombre(r.consoAnKwh)} kWh/an`,
  ];
  if (r.coutAnEur !== null) lignes.push(`Coût électrique annuel : ${euros(r.coutAnEur)}`);
  if (c.plants) {
    lignes.push(
      `Plants : ≈ ${c.plants.total} à ${c.plants.espacementCm} cm d'espacement, soit ${nombre(r.puissanceW / c.plants.total, 1)} W par plant` +
        (r.coutAnEur !== null ? ` et ${euros(r.coutAnEur / c.plants.total)} par plant et par an` : ''),
    );
  }
  for (const a of c.alertes ?? []) lignes.push(`Attention : ${a}`);
  if (c.avertissement) lignes.push('', `Avertissement : ${c.avertissement}`);
  lignes.push('', "Liste d'achat :");
  for (const a of listeAchat(r, c)) lignes.push(`- ${a.quantite} × ${a.article} : ${a.detail}`);
  return lignes.join('\n');
}
