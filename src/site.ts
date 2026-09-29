// Point d'entrée commun des pages. Le JavaScript n'ajoute que du confort :
// les pages restent complètes et lisibles sans lui.
import './site.css';
import './theme.css';
import './fiches.css';

/** Barre de progression de lecture (en haut de l'écran), sur les articles. */
function progressionLecture(): void {
  const barre = document.querySelector<HTMLElement>('.progression');
  const article = document.querySelector<HTMLElement>('.article .prose');
  if (!barre || !article) return;
  const maj = () => {
    const debut = article.offsetTop;
    const fin = debut + article.offsetHeight - window.innerHeight;
    const lu = fin > debut ? (window.scrollY - debut) / (fin - debut) : 1;
    barre.style.setProperty('--lu', String(Math.min(1, Math.max(0, lu))));
  };
  window.addEventListener('scroll', maj, { passive: true });
  window.addEventListener('resize', maj);
  maj();
}

/** Met en évidence, dans le sommaire, la section en cours de lecture. */
function sommaireActif(): void {
  const liens = [...document.querySelectorAll<HTMLAnchorElement>('.article__cote .sommaire ol a[href^="#"]')];
  if (liens.length === 0 || !('IntersectionObserver' in window)) return;
  const sections = liens
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter((s): s is HTMLElement => s !== null);
  let courant: string | null = null;
  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const e of entrees) if (e.isIntersecting) courant = e.target.id;
      for (const a of liens) a.classList.toggle('actif', a.hash === `#${courant}`);
    },
    { rootMargin: '-15% 0px -70% 0px' },
  );
  sections.forEach((s) => observateur.observe(s));
}

/**
 * Referme le menu mobile quand on choisit un lien, qu'on touche ailleurs ou qu'on appuie
 * sur Échap (le focus revient alors sur le bouton « Menu »).
 */
function menuMobile(): void {
  const menu = document.querySelector<HTMLDetailsElement>('.menu-mobile');
  if (!menu) return;
  const bouton = menu.querySelector<HTMLElement>('summary');
  document.addEventListener('click', (e) => {
    if (menu.open && !menu.contains(e.target as Node)) menu.open = false;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    bouton?.focus();
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => (menu.open = false)));
}

/**
 * Page 404 : son <base> pointe vers la racine du site, donc « #contenu » mènerait à l'accueil.
 * Le lien d'évitement vise explicitement la page courante.
 */
function lienEvitement(): void {
  const lien = document.querySelector<HTMLAnchorElement>('a.evitement');
  if (lien && document.querySelector('base')) lien.href = `${location.href.split('#')[0]}#contenu`;
}

/**
 * Bouton « Partager » en fin d'article (écrit au build, masqué sans JavaScript) :
 * partage natif du système quand il existe, sinon copie du lien dans le presse-papiers.
 * Aucun script tiers ni cookie : seul le lien de la page est transmis, à l'application choisie.
 */
function boutonPartage(): void {
  const bloc = document.querySelector<HTMLElement>('[data-partage]');
  const bouton = bloc?.querySelector<HTMLButtonElement>('button');
  const message = bloc?.querySelector<HTMLElement>('.partage__message');
  if (!bloc || !bouton || !message) return;
  // Adresse publique (canonique) plutôt que l'adresse courante, qui peut contenir une ancre.
  const url = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || location.href.split('#')[0];
  const titre = document.querySelector('h1')?.textContent?.trim() || document.title;
  let minuterie = 0;
  const afficher = (texte: string) => {
    message.textContent = texte;
    clearTimeout(minuterie);
    minuterie = window.setTimeout(() => (message.textContent = ''), 4000);
  };
  bouton.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: titre, url });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return; // partage annulé
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      afficher('Lien copié');
    } catch {
      // Repli (http, anciens navigateurs) : copie par une zone de texte temporaire.
      const zone = document.createElement('textarea');
      zone.value = url;
      zone.setAttribute('readonly', '');
      zone.style.position = 'fixed';
      zone.style.opacity = '0';
      document.body.append(zone);
      zone.select();
      const ok = document.execCommand('copy');
      zone.remove();
      afficher(ok ? 'Lien copié' : `Copiez ce lien : ${url}`);
      bouton.focus();
    }
  });
  bloc.hidden = false;
}

progressionLecture();
boutonPartage();
sommaireActif();
menuMobile();
lienEvitement();

/** Mode hors ligne : enregistre le service worker (site publié en HTTPS uniquement). */
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* sans service worker, le site fonctionne normalement en ligne */
    });
  });
}
