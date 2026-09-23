/**
 * Plugin Vite « maison » : insère les parties communes (en-tête, pied de page…)
 * dans chaque page HTML au moment du build. Le site reste 100 % statique :
 * les pages sont complètes même sans JavaScript.
 *
 * Marqueurs disponibles dans les pages :
 *   <!--#head-->    favicon, couleur du thème
 *   <!--#header-->  bandeau + navigation (le lien de la section courante est mis en évidence)
 *   <!--#footer-->  pied de page
 *   <!--#fiches-->  fiches légumes générées depuis src/data/legumes.json
 */
import { readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { rendreFiches } from './fiches';

export const NOM_SITE = 'OptiLED';

/** Adresse publique du site (sitemap). Surchargeable : SITE_URL=https://mon-domaine.fr/ npm run build */
export const SITE_URL = (process.env.SITE_URL ?? 'https://teiki5320.github.io/optiled/').replace(/\/?$/, '/');

/** Rubriques de la navigation principale ; `pages` = fichiers rattachés à la rubrique. */
export const NAVIGATION: { href: string; libelle: string; pages: RegExp }[] = [
  { href: 'index.html', libelle: 'Accueil', pages: /^index\.html$/ },
  { href: 'calculateur.html', libelle: 'Calculateur', pages: /^calculateur\.html$/ },
  { href: 'led.html', libelle: 'LED', pages: /^led(-.*)?\.html$/ },
  { href: 'culture.html', libelle: 'Culture', pages: /^culture(-.*)?\.html$/ },
  { href: 'legumes.html', libelle: 'Légumes', pages: /^legumes\.html$/ },
  { href: 'glossaire.html', libelle: 'Glossaire', pages: /^glossaire\.html$/ },
];

const ICONE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%232f6b3a'/%3E%3Cpath d='M16 26c0-8 2-12 8-15-7 0-10 4-8 15zm0 0c0-6-2-9-7-11 5 0 8 3 7 11z' fill='%23fff'/%3E%3C/svg%3E";

export function head(): string {
  return `<link rel="icon" href="${ICONE}" />
    <meta name="theme-color" content="#2f6b3a" />`;
}

export function header(fichier: string): string {
  const liens = NAVIGATION.map(({ href, libelle, pages }) => {
    const actif = pages.test(fichier);
    return `<li><a href="${href}"${actif ? ' aria-current="page"' : ''}>${libelle}</a></li>`;
  }).join('');
  return `<a class="evitement" href="#contenu">Aller au contenu</a>
<header class="site-entete">
  <div class="site-entete__barre">
    <a class="logo" href="index.html"><img src="${ICONE}" alt="" width="28" height="28" /> ${NOM_SITE}</a>
    <span class="logo-sous-titre">LED &amp; culture indoor</span>
  </div>
  <nav class="site-nav" aria-label="Navigation principale"><ul>${liens}</ul></nav>
</header>`;
}

export function footer(): string {
  return `<footer class="site-pied">
  <p><strong>${NOM_SITE}</strong> — guides et outils gratuits pour cultiver des légumes sous LED, en intérieur.</p>
  <p>Les valeurs données sont des ordres de grandeur issus de la littérature horticole : adaptez-les à vos variétés et vérifiez avec un PAR-mètre.</p>
  <p><a href="calculateur.html">Calculateur</a> · <a href="led.html">Éclairage LED</a> · <a href="culture.html">Culture indoor</a> · <a href="legumes.html">Fiches légumes</a> · <a href="glossaire.html">Glossaire</a></p>
</footer>`;
}

/** Toutes les pages HTML à la racine du projet (entrées du build multi-pages). */
export function pagesHtml(racine: string): Record<string, string> {
  const entrees: Record<string, string> = {};
  for (const f of readdirSync(racine)) {
    if (f.endsWith('.html')) entrees[f.replace(/\.html$/, '')] = resolve(racine, f);
  }
  return entrees;
}

export function sitemap(pages: string[], url = SITE_URL): string {
  const urls = pages
    .filter((p) => p !== '404.html')
    .sort()
    .map((p) => `  <url><loc>${url}${p === 'index.html' ? '' : p}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function pluginSite(): Plugin {
  let racine = process.cwd();
  return {
    name: 'optiled-site',
    configResolved(config) {
      racine = config.root;
    },
    generateBundle() {
      const pages = Object.keys(pagesHtml(racine)).map((nom) => `${nom}.html`);
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(pages) });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n` });
    },
    transformIndexHtml(html, ctx) {
      const fichier = basename(ctx.filename);
      return html
        .replace('<!--#head-->', head())
        .replace('<!--#header-->', header(fichier))
        .replace('<!--#footer-->', footer())
        .replace('<!--#fiches-->', () => rendreFiches());
    },
  };
}
