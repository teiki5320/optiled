/** Photos des guides et des articles (public/images/guides/<page>-800.webp et -1600.webp). */
import { existsSync, readFileSync } from 'node:fs';
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

/** Photo libre de droits (src/data/photos-libres.json), ou carte générée aux couleurs du site. */
export interface PhotoLibre {
  source: 'wikimedia' | 'openverse' | 'carte';
  credit: string;
  licence: string | null;
  page: string | null;
  telechargement?: string;
  alt: string;
  mots_cles?: string[];
}

export const FICHIER_PHOTOS_LIBRES = resolve(import.meta.dirname, '../src/data/photos-libres.json');

let photosLibres: Record<string, PhotoLibre> | undefined;

/** Photos libres par page (« led-semis », « debuter »…). */
export function chargerPhotosLibres(): Record<string, PhotoLibre> {
  photosLibres ??= (JSON.parse(readFileSync(FICHIER_PHOTOS_LIBRES, 'utf8')) as { photos: Record<string, PhotoLibre> }).photos;
  return photosLibres;
}

/** Photo libre d'une page (nom de fichier avec ou sans .html), ou undefined (photo générée par IA, ou aucune). */
export function photoLibre(fichier: string): PhotoLibre | undefined {
  return chargerPhotosLibres()[fichier.replace(/\.html$/, '')];
}

function texteAttribut(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function texte(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** « Photo : auteur · licence », ou « Illustration : Kultiled » pour une carte. */
export function texteCreditPhoto(p: PhotoLibre): string {
  return p.source === 'carte' ? 'Illustration : Kultiled' : `Photo : ${p.credit}${p.licence ? ` · ${p.licence}` : ''}`;
}

/** Crédit sous l'image de couverture, avec le lien vers la page d'origine. Vide si la page n'a pas de photo libre. */
export function legendePhoto(fichier: string): string {
  const p = photoLibre(fichier);
  if (!p) return '';
  const t = texte(texteCreditPhoto(p));
  return `<figcaption class="credit-photo">${p.page ? `<a href="${texteAttribut(p.page)}" target="_blank" rel="noopener nofollow">${t}</a>` : t}</figcaption>`;
}

/** Crédit court d'une carte (sans lien : la carte est déjà un lien ; le lien figure sous la couverture de la page). */
export function creditCarte(fichier: string): string {
  const p = photoLibre(fichier);
  return p ? `<span class="carte-guide__credit">${texte(texteCreditPhoto(p))}</span>` : '';
}
