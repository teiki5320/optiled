// Point d'entrée commun des pages. Le JavaScript n'ajoute que du confort :
// les pages restent complètes et lisibles sans lui.
import './site.css';

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

/** Referme le menu mobile quand on choisit un lien ou qu'on touche ailleurs. */
function menuMobile(): void {
  const menu = document.querySelector<HTMLDetailsElement>('.menu-mobile');
  if (!menu) return;
  document.addEventListener('click', (e) => {
    if (menu.open && !menu.contains(e.target as Node)) menu.open = false;
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => (menu.open = false)));
}

progressionLecture();
sommaireActif();
menuMobile();
