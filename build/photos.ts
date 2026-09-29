/** Photos des guides et des articles (public/images/guides/<page>-800.webp et -1600.webp). */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Cartes de la première rangée sur ordinateur : leurs photos sont chargées d'emblée. */
export const CARTES_PREMIERE_RANGEE = 3;

export const DOSSIER_PHOTOS = resolve(import.meta.dirname, '../public/images/guides');

/**
 * Photo d'un guide (srcset 800/1600 px), ou chaîne vide si elle n'existe pas encore.
 * `prioritaire` ajoute fetchpriority="high" (par défaut : toute image chargée d'emblée) ; les cartes
 * le réservent à la première image et chargent d'emblée, sans priorité, le reste de la première rangée.
 */
export function photoGuide(fichier: string, alt: string, sizes: string, chargement: 'lazy' | 'eager' = 'lazy', prioritaire = chargement === 'eager'): string {
  const nom = fichier.replace(/\.html$/, '');
  if (!existsSync(resolve(DOSSIER_PHOTOS, `${nom}-1600.webp`))) return '';
  const priorite = prioritaire ? ' fetchpriority="high"' : '';
  return `<img src="images/guides/${nom}-800.webp" srcset="images/guides/${nom}-800.webp 800w, images/guides/${nom}-1600.webp 1600w" sizes="${sizes}" width="1600" height="900" alt="${alt.replace(/"/g, '&quot;')}" loading="${chargement}" decoding="async"${priorite} />`;
}
