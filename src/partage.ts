/**
 * Textes liés au partage : résumé d'un calcul reçu par lien (bandeau « Calcul partagé »).
 * Module pur : aucun accès au DOM.
 */
import type { Surface } from './calc.ts';
import { nombre } from './format.ts';

/** Longueurs en mètres : jusqu'à deux décimales, sans zéros inutiles (« 0,6 », « 1,25 », « 2 »). */
const METRES = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** « 1,2 × 0,6 m » ou « 3 rangs de 2,4 × 0,4 m ». */
export function dimensionsTexte(surface: Surface): string {
  const m = (v: number) => METRES.format(v);
  if (surface.mode === 'rangs') {
    return `${surface.nbRangs} rang${surface.nbRangs > 1 ? 's' : ''} de ${m(surface.longueurM)} × ${m(surface.largeurRangM)} m`;
  }
  return `${m(surface.longueurM)} × ${m(surface.largeurM)} m`;
}

/** Résumé d'un calcul partagé : « Laitue, 0,6 × 0,3 m → 21 W, 1 barre ». */
export function resumeCalculPartage(culture: string, surface: Surface, puissanceW: number, barres: number): string {
  return `${culture}, ${dimensionsTexte(surface)} → ${nombre(puissanceW)} W, ${barres} barre${barres > 1 ? 's' : ''}`;
}
