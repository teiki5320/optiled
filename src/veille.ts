/**
 * Veille actus : actus de la culture en intérieur et de l'éclairage des plantes, préparées deux fois
 * par jour par la tâche de veille (dépôt public teiki5320/veille) et lues en direct dans le
 * navigateur du visiteur, sans reconstruire le site.
 * Schéma : https://teiki5320.github.io/veille/schema/actus-schema-v3.json
 *
 * Les sections <section data-actus data-limite="4" data-tag="legume:tomate" hidden> sont écrites
 * au build (build/veille.ts) ; ce module les remplit. Aucune actu, ou fichier injoignable : elles
 * restent cachées, la page et le calculateur ne sont jamais touchés. Le texte du JSON est toujours
 * inséré avec textContent (jamais innerHTML).
 */

export const URL_VEILLE = 'https://teiki5320.github.io/veille/actus/kultiled.json';

/** Seule origine autorisée pour les images d'actus. */
const BASE_IMAGES = 'https://teiki5320.github.io/veille/';

export interface ImageActu {
  url: string;
  source: 'wikimedia' | 'openverse' | 'banque' | 'carte';
  credit: string;
  licence: string | null;
  page?: string | null;
  alt: string;
  mots_cles?: string[];
  largeur: number;
  hauteur: number;
}

/** Une actu (schéma v3). */
export interface Actu {
  id: string;
  titre: string;
  resume: string;
  theme?: string;
  pays?: string[];
  competition?: string | null;
  /** Liens vers les fiches du site, ex. « legume:tomate ». */
  tags?: string[];
  source_nom: string;
  source_url: string;
  autres_sources?: string[];
  publie_le: string;
  collecte_le?: string;
  langue?: string;
  image: ImageActu;
}

export interface FichierActus {
  version: number;
  site: string;
  genere_le: string;
  actus: Actu[];
}

const DELAI_MS = 8000;
const CACHE_MS = 15 * 60 * 1000;
const CLE_CACHE = 'kultiled-veille-actus-v3';

const estHttp = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\//.test(u);

/** Lien d'achat (Amazon et ses liens courts) : jamais dans un bloc d'actus. */
const estLienAmazon = (u: string) => /(^|\.)(amazon\.[a-z.]+|amzn\.[a-z]+)$/i.test(new URL(u).hostname);

/** Garde-fou en plus de la veille : jamais de cannabis ni de drogue sur le site. */
const SUJET_EXCLU = /\b(cannabis|chanvre|cbd|thc|marijuana|marihuana|hemp|drogues?)\b/i;

/** Garde seulement les actus complètes et sûres (source http(s) non Amazon, image servie par la veille). */
export function actuValide(a: unknown): a is Actu {
  if (!a || typeof a !== 'object') return false;
  const x = a as Partial<Actu>;
  if (typeof x.id !== 'string' || typeof x.titre !== 'string' || typeof x.resume !== 'string') return false;
  if (typeof x.source_nom !== 'string' || !estHttp(x.source_url) || typeof x.publie_le !== 'string') return false;
  try {
    if (estLienAmazon(x.source_url)) return false;
  } catch {
    return false;
  }
  if (SUJET_EXCLU.test(`${x.titre} ${x.resume}`) || x.tags?.includes('legume:chanvre-cbd')) return false;
  const i = x.image;
  if (!i || typeof i.url !== 'string' || !i.url.startsWith(BASE_IMAGES)) return false;
  if (typeof i.credit !== 'string' || typeof i.alt !== 'string') return false;
  if (i.page != null && !estHttp(i.page)) return false;
  return true;
}

/** Nettoie un fichier reçu : actus valides, de la plus récente à la plus ancienne. */
export function nettoyerFichier(brut: unknown): FichierActus | null {
  if (!brut || typeof brut !== 'object') return null;
  const f = brut as Partial<FichierActus>;
  if (!Array.isArray(f.actus)) return null;
  const actus = f.actus.filter(actuValide).sort((a, b) => Date.parse(b.publie_le) - Date.parse(a.publie_le));
  return { version: Number(f.version) || 3, site: String(f.site ?? 'kultiled'), genere_le: String(f.genere_le ?? ''), actus };
}

/** Actus d'une fiche (« legume:tomate »), ou toutes si aucun tag n'est donné. */
export function filtrerParTag(actus: Actu[], tag?: string): Actu[] {
  return tag ? actus.filter((a) => a.tags?.includes(tag)) : actus;
}

/** Vignette carrée : « -carre.webp » pour les photos ; la carte SVG est la même image, recadrée à l'affichage. */
export function imageCarree(image: ImageActu): string {
  return image.source !== 'carte' && image.url.endsWith('.webp') ? image.url.replace(/\.webp$/, '-carre.webp') : image.url;
}

/** Crédit affiché sous l'image : « Photo : auteur · licence », ou « Illustration : Kultiled » pour une carte. */
export function texteCredit(image: ImageActu): string {
  if (image.source === 'carte') return 'Illustration : Kultiled';
  return `Photo : ${image.credit}${image.licence ? ` · ${image.licence}` : ''}`;
}

/** Âge d'une actu : « il y a 3 h », « hier », « il y a 4 jours », puis la date. */
export function ageActu(iso: string, maintenant: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.round((maintenant - t) / 60000));
  if (min < 60) return min <= 1 ? "à l'instant" : `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j === 1) return 'hier';
  if (j < 7) return `il y a ${j} jours`;
  return `le ${new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })}`;
}

/** « 27 octobre à 12 h 05 », heure de Paris. */
export function dateHeure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const jour = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const [h, m] = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).split(':');
  return `${jour} à ${Number(h)} h ${m}`;
}

let enCours: Promise<FichierActus | null> | null = null;

/**
 * Fichier des actus : délai de 8 s, cache de 15 min (sessionStorage).
 * En cas d'erreur, renvoie null, sans jamais casser la page.
 */
export function chargerFichier(url = URL_VEILLE): Promise<FichierActus | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (enCours) return enCours;
  enCours = (async () => {
    try {
      const enCache = sessionStorage.getItem(CLE_CACHE);
      if (enCache) {
        const { t, f } = JSON.parse(enCache) as { t: number; f: unknown };
        if (Date.now() - t < CACHE_MS) {
          const propre = nettoyerFichier(f);
          if (propre) return propre;
        }
      }
    } catch {
      // Stockage indisponible (navigation privée…) : on lit le fichier en ligne.
    }
    try {
      const ctrl = new AbortController();
      const minuteur = setTimeout(() => ctrl.abort(), DELAI_MS);
      const rep = await fetch(url, { signal: ctrl.signal, cache: 'no-cache' }).finally(() => clearTimeout(minuteur));
      if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
      const brut: unknown = await rep.json();
      const propre = nettoyerFichier(brut);
      if (!propre) throw new Error('fichier illisible');
      try {
        sessionStorage.setItem(CLE_CACHE, JSON.stringify({ t: Date.now(), f: brut }));
      } catch {
        // Cache impossible : sans conséquence.
      }
      return propre;
    } catch {
      enCours = null; // nouvel essai possible à la prochaine page
      return null;
    }
  })();
  return enCours;
}

/** Actus, de la plus récente à la plus ancienne ; [] en cas d'erreur. */
export async function chargerActus(): Promise<Actu[]> {
  return (await chargerFichier())?.actus ?? [];
}

// ---------- Affichage ----------

function el<K extends keyof HTMLElementTagNameMap>(balise: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

/** Lien « Source : Nom ↗ » (nouvel onglet, sans transmettre de réputation) et âge de l'actu. */
function ligneSource(a: Actu): HTMLElement {
  const p = el('p', 'actu__source');
  const lien = el('a', undefined, `Source : ${a.source_nom} ↗`);
  lien.href = a.source_url;
  lien.target = '_blank';
  lien.rel = 'noopener nofollow';
  p.append(lien);
  const age = ageActu(a.publie_le);
  if (age) {
    const t = el('time', 'actu__age', age);
    t.dateTime = a.publie_le;
    p.append(' · ', t);
  }
  return p;
}

/** « Photo : auteur · licence » (lien vers la page d'origine) ou « Illustration : Kultiled ». */
function credit(image: ImageActu): HTMLElement {
  const p = el('p', 'actu__credit');
  if (image.source !== 'carte' && image.page) {
    const lien = el('a', undefined, texteCredit(image));
    lien.href = image.page;
    lien.target = '_blank';
    lien.rel = 'noopener nofollow';
    p.append(lien);
  } else p.textContent = texteCredit(image);
  return p;
}

function image(a: Actu, carree: boolean): HTMLImageElement {
  const img = el('img', 'actu__image');
  img.src = carree ? imageCarree(a.image) : a.image.url;
  img.alt = a.image.alt;
  img.width = carree ? 600 : a.image.largeur || 1600;
  img.height = carree ? 600 : a.image.hauteur || 900;
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}

/** Une actu : « une » (bandeau 16:9) ou vignette (image carrée). */
export function carteActu(a: Actu, une: boolean, niveauTitre: 'h2' | 'h3' = 'h3'): HTMLElement {
  const article = el('article', `actu ${une ? 'actu--une' : 'actu--vignette'}`);
  const cadre = el('div', 'actu__cadre');
  cadre.append(image(a, !une));
  const corps = el('div', 'actu__corps');
  corps.append(el(niveauTitre, 'actu__titre', a.titre), el('p', 'actu__resume', a.resume), ligneSource(a), credit(a.image));
  article.append(cadre, corps);
  return article;
}

/** Remplit une section [data-actus] ; la laisse cachée s'il n'y a aucune actu. Renvoie le nombre affiché. */
export function remplirSection(section: HTMLElement, fichier: FichierActus | null): number {
  const limite = Math.max(1, Number(section.dataset.limite) || 4);
  const actus = filtrerParTag(fichier?.actus ?? [], section.dataset.tag || undefined).slice(0, limite);
  const vide = section.parentElement?.querySelector<HTMLElement>('[data-actus-vide]');
  if (actus.length === 0) {
    if (vide) vide.hidden = false;
    return 0;
  }
  const liste = section.querySelector<HTMLElement>('[data-actus-liste]') ?? section;
  const [une, ...suite] = actus;
  const niveau = section.querySelector('h2') ? 'h3' : 'h2';
  liste.replaceChildren(carteActu(une, true, niveau));
  if (suite.length) {
    const ul = el('ul', 'actus__vignettes');
    for (const a of suite) {
      const li = el('li');
      li.append(carteActu(a, false, niveau));
      ul.append(li);
    }
    liste.append(ul);
  }
  liste.classList.toggle('actus__liste--seule', suite.length === 0);
  const maj = section.querySelector<HTMLElement>('[data-actus-maj]');
  if (maj && fichier?.genere_le) {
    const texte = dateHeure(fichier.genere_le);
    if (texte) {
      const t = el('time', undefined, texte);
      t.dateTime = fichier.genere_le;
      maj.replaceChildren('Mis à jour le ', t, '.');
      maj.hidden = false;
    }
  }
  section.hidden = false;
  const cadre = section.closest<HTMLElement>('[data-actus-cadre]');
  if (cadre) cadre.hidden = false;
  return actus.length;
}

/** Remplit toutes les sections d'actus de la page (aucune requête s'il n'y en a pas). */
export async function afficherActus(racine: ParentNode = document, url = URL_VEILLE): Promise<void> {
  const sections = [...racine.querySelectorAll<HTMLElement>('[data-actus]')];
  if (sections.length === 0) return;
  const fichier = await chargerFichier(url);
  for (const s of sections) {
    try {
      remplirSection(s, fichier);
    } catch {
      s.hidden = true;
    }
  }
}
