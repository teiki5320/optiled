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
  /** Largeur d'un rang (mode rangs) et espacement conseillé, en cm */
  rangTropEtroit?: { largeurCm: number; espacementCm: number };
}

const LEGUMES_FRUITS = ['tomate', 'poivron', 'piment', 'aubergine', 'concombre'];
const MONTAISON = ['epinard', 'coriandre', 'roquette'];

function majuscule(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function alertes(c: ContexteAlertes): string[] {
  const a: string[] = [];
  const h = c.photoperiodeH;
  if (c.legumeId === 'chanvre-cbd' && c.stade === 'floraison' && h > 12.5) {
    a.push(`En floraison, le chanvre a besoin de 12 h de lumière et 12 h d'obscurité totale : avec ${h} h, il ne fleurira pas.`);
  } else if (c.legumeId === 'chanvre-cbd' && c.stade === 'croissance' && h < 16) {
    a.push(`Avec ${h} h de lumière, le chanvre risque de passer en floraison trop tôt : gardez au moins 16 à 18 h en croissance.`);
  } else if (LEGUMES_FRUITS.includes(c.legumeId) && h > 18) {
    a.push(`${majuscule(c.nom)} : au-delà de 18 h par jour, risque de lésions des feuilles (éclairage quasi continu). Revenez à 16–18 h.`);
  } else if (MONTAISON.includes(c.legumeId) && h > 14) {
    a.push(`${majuscule(c.nom)} : au-delà de 14 h par jour, risque de montée en graines. ${c.photoperiodeConseilleeH} h sont conseillées.`);
  } else if (h > 20) {
    a.push(`${h} h de lumière par jour, c'est beaucoup : les plantes ont besoin d'une période d'obscurité, et la facture augmente. ${c.photoperiodeConseilleeH} h sont conseillées.`);
  }
  if (c.longueurBarreM > c.longueurZoneM + 0.02) {
    a.push(`Les barres (${c.longueurBarreM.toFixed(2).replace('.', ',')} m) sont plus longues que l'installation (${c.longueurZoneM.toFixed(2).replace('.', ',')} m) : elles dépasseront et une partie de la lumière sera perdue. Choisissez des barres plus courtes.`);
  }
  if (c.rangTropEtroit) {
    a.push(`Les rangs (${c.rangTropEtroit.largeurCm} cm) sont plus étroits que l'espacement conseillé entre plants (${c.rangTropEtroit.espacementCm} cm) : les plants déborderont sur l'allée. Élargissez les rangs ou comptez une seule ligne de plants par rang.`);
  }
  return a;
}
