/**
 * Publicité Google AdSense.
 * - Le script AdSense (et le bandeau de consentement de Google qu'il affiche) est chargé sur
 *   toutes les pages du site publié, sauf en mode intégré (index.html?integre=1, dans le cadre
 *   d'un autre site : « sans cookie ni publicité », voir integrer.html).
 * - Les annonces ne sont placées qu'à des emplacements choisis, dans les guides et les articles :
 *   jamais dans les outils (calculateur, carnet de suivi), ni sur les pages de lampes Amazon.
 *   Au plus deux par page : une au milieu du texte, une après l'article.
 * - Une annonce n'est jamais placée à côté d'une section qui contient des liens Amazon, ni à moins
 *   de DISTANCE_AMAZON caractères d'un lien Amazon (encadrés produits des conseils et des fiches).
 * Les identifiants ci-dessous sont publics (ils figurent dans le code de chaque page).
 */

export const CLIENT_ADSENSE = 'ca-pub-2680784147246798';

/** Bloc d'annonces display responsive « Kultiled - articles » (AdSense › Annonces › Par bloc d'annonces). Vide : aucune annonce placée. */
export const BLOC_ARTICLES = '3648517188';

/**
 * Pages qui reçoivent des annonces : guides, parcours, glossaire, articles de conseil, fiches des
 * cultures et pages des articles d'actus construites (actus/<slug>/ ; jamais la page de secours).
 */
export function pageAvecAnnonces(fichier: string): boolean {
  if (/^actus\/(?!article\/)[a-z0-9-]+\/index\.html$/.test(fichier)) return true;
  return /^(led-|culture-|conseil-|legume-)/.test(fichier) || ['debuter.html', 'tente.html', 'glossaire.html'].includes(fichier);
}

/** Balises du <head> : compte AdSense et chargement du script, sauf en mode intégré. */
export function scriptAdsense(client = CLIENT_ADSENSE): string {
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  return `<meta name="google-adsense-account" content="${client}" />
    <script>if(!/[?&]integre=/.test(location.search)){var s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.src='${src}';document.head.appendChild(s);}</script>`;
}

/** Emplacement d'annonce, signalé « Publicité » et distinct des liens Amazon. */
export function blocAnnonce(bloc = BLOC_ARTICLES, client = CLIENT_ADSENSE): string {
  return `<aside class="annonce" aria-label="Publicité"><p class="annonce__etiquette">Publicité</p><ins class="adsbygoogle" style="display:block" data-ad-client="${client}" data-ad-slot="${bloc}" data-ad-format="auto" data-full-width-responsive="true"></ins></aside>`;
}

const AMAZON = /amazon\.|amzn\.to/i;

/** Écart minimal (en caractères de HTML) entre une annonce et un lien Amazon. */
export const DISTANCE_AMAZON = 3000;

/**
 * Place les annonces dans une page déjà mise en forme : au milieu de l'article (avant un
 * intertitre h2, si ni la section d'avant ni celle d'après ne renvoient vers Amazon) et après
 * l'article (si la suite de la page ne commence pas par des liens Amazon).
 */
export function placerAnnonces(html: string, fichier: string, bloc = BLOC_ARTICLES): string {
  if (!bloc || !pageAvecAnnonces(fichier)) return html;
  const annonce = blocAnnonce(bloc);
  const debut = html.indexOf('<article class="prose">');
  const fin = html.indexOf('</article>', debut);
  if (debut < 0 || fin < 0) return html;

  let article = html.slice(debut, fin);
  const titres = [...article.matchAll(/<h2[\s>]/g)].map((m) => m.index!);
  if (titres.length >= 4) {
    const section = (i: number) => article.slice(titres[i], titres[i + 1] ?? article.length);
    const milieu = Math.floor(titres.length / 2);
    const proche = (i: number) => AMAZON.test(article.slice(Math.max(0, titres[i] - DISTANCE_AMAZON), titres[i] + DISTANCE_AMAZON));
    const choix = [milieu, milieu + 1, milieu - 1].find((i) => i > 0 && i < titres.length && !AMAZON.test(section(i - 1)) && !AMAZON.test(section(i)) && !proche(i));
    if (choix !== undefined) article = article.slice(0, titres[choix]) + annonce + article.slice(titres[choix]);
  }

  let suite = html.slice(fin);
  const apres = suite.indexOf('<div class="conteneur article__apres">');
  if (apres >= 0 && !AMAZON.test(suite.slice(apres, apres + DISTANCE_AMAZON)) && !AMAZON.test(article.slice(-DISTANCE_AMAZON))) {
    suite = `${suite.slice(0, apres)}<div class="conteneur">${annonce}</div>\n  ${suite.slice(apres)}`;
  }
  return html.slice(0, debut) + article + suite;
}
