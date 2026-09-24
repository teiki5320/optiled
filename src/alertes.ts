/**
 * Mises en garde du calculateur (réglages possibles mais déconseillés).
 * Module pur : renvoie des messages, sans accès au DOM.
 */
import type { Stade } from './data';

export interface ContexteAlertes {
  legumeId: string;
  nom: string;
  stade: Stade;
  photoperiodeH: number;
  /** Photopériode conseillée par les données pour ce stade */
  photoperiodeConseilleeH: number;
  longueurBarreM: number;
  longueurZoneM: number;
  /** Longueur d'une ligne de barres bout à bout (m) */
  longueurLigneM?: number;
  /** Largeur d'un rang (mode rangs) et espacement conseillé, en cm */
  rangTropEtroit?: { largeurCm: number; espacementCm: number };
  /** Efficacité saisie dans les options (µmol/J) */
  efficaciteUmolJ?: number;
}

/** Au-delà, l'efficacité annoncée par un fabricant est rarement mesurée de façon indépendante. */
export const EFFICACITE_DOUTEUSE = 3.2;

// Espèces chez qui l'éclairage quasi continu provoque des lésions documentées (Velez-Ramirez et al., 2011).
const SENSIBLES_ECLAIRAGE_CONTINU = ['tomate', 'tomate-naine', 'aubergine'];
const MONTAISON = ['epinard', 'coriandre', 'roquette', 'mache', 'radis', 'aneth'];

function majuscule(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function alertes(c: ContexteAlertes): string[] {
  const a: string[] = [];
  const h = String(c.photoperiodeH).replace('.', ',');
  const duree = c.photoperiodeH;
  if (c.legumeId === 'chanvre-cbd' && c.stade === 'floraison' && duree > 12.5) {
    a.push(`En floraison, le chanvre a besoin de 12 h de lumière et 12 h d'obscurité totale : avec ${h} h, il ne fleurira pas.`);
  } else if (c.legumeId === 'chanvre-cbd' && c.stade === 'croissance' && duree < 16) {
    a.push(`Avec ${h} h de lumière, le chanvre risque de passer en floraison trop tôt : gardez au moins 16 à 18 h en croissance.`);
  } else if (SENSIBLES_ECLAIRAGE_CONTINU.includes(c.legumeId) && duree > 18) {
    a.push(`${majuscule(c.nom)} : au-delà de 18 h par jour, on s'approche de l'éclairage continu, qui provoque des lésions des feuilles. Revenez à 16–18 h.`);
  } else if (MONTAISON.includes(c.legumeId) && duree > Math.max(14, c.photoperiodeConseilleeH)) {
    a.push(`${majuscule(c.nom)} : au-delà de ${Math.max(14, c.photoperiodeConseilleeH)} h par jour, risque de montée en graines. ${c.photoperiodeConseilleeH} h sont conseillées.`);
  } else if (duree > 20) {
    a.push(`${h} h de lumière par jour, c'est beaucoup : les plantes ont besoin d'une période d'obscurité, et la facture augmente. ${c.photoperiodeConseilleeH} h sont conseillées.`);
  }
  if (c.longueurBarreM > c.longueurZoneM + 0.02) {
    a.push(`Les barres (${c.longueurBarreM.toFixed(2).replace('.', ',')} m) sont plus longues que l'installation (${c.longueurZoneM.toFixed(2).replace('.', ',')} m) : elles dépasseront et une partie de la lumière sera perdue. Choisissez des barres plus courtes.`);
  } else if (c.longueurLigneM !== undefined && c.longueurLigneM > c.longueurZoneM * 1.15 + 0.02) {
    a.push(`Les barres bout à bout (${c.longueurLigneM.toFixed(2).replace('.', ',')} m) dépassent l'installation (${c.longueurZoneM.toFixed(2).replace('.', ',')} m) : une partie de la lumière sera perdue. Essayez une autre longueur de barre (options).`);
  }
  if (c.rangTropEtroit) {
    a.push(`Les rangs (${c.rangTropEtroit.largeurCm} cm) sont plus étroits que l'espacement choisi entre plants (${c.rangTropEtroit.espacementCm} cm) : les plants déborderont sur l'allée. Élargissez les rangs ou comptez une seule ligne de plants par rang.`);
  }
  if (c.efficaciteUmolJ !== undefined && c.efficaciteUmolJ > EFFICACITE_DOUTEUSE) {
    a.push(`Une efficacité de ${String(c.efficaciteUmolJ).replace('.', ',')} µmol/J est rare : vérifiez la fiche technique (PPF mesuré ÷ puissance consommée). Une valeur surestimée sous-dimensionne l'éclairage.`);
  }
  return a;
}
