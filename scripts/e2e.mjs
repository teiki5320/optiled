// Test de bout en bout : lance le site construit (vite preview) et le pilote dans Chromium.
// Usage : npm run build && npm run test:e2e
// Vérifie que les pages s'affichent sans erreur et que le calculateur fonctionne.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { tagsConnus, verifierDossier } from './verifier-site.mjs';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const serveur = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });

let echecs = 0;
const verifier = (condition, message) => {
  console.log(`${condition ? '✓' : '✗'} ${message}`);
  if (!condition) echecs++;
};

// Contrôles du site construit : mots interdits, aucun prix près d'un lien Amazon, codes de suivi connus.
const problemes = verifierDossier('dist', tagsConnus('.'));
verifier(problemes.length === 0, `site construit sans mot interdit ni prix près d'un lien Amazon, codes de suivi connus${problemes.length ? ' : ' + problemes.slice(0, 10).join(' | ') : ''}`);

try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      /* serveur pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));

  for (const p of ['index.html', 'led-bases.html', 'culture-climat.html', 'legumes.html', 'glossaire.html']) {
    const rep = await page.goto(BASE + p, { waitUntil: 'networkidle' });
    verifier(rep?.ok() && (await page.locator('h1').count()) > 0, `${p} s'affiche`);
  }

  await page.goto(BASE, { waitUntil: 'networkidle' });
  const resultats = () => page.textContent('#contenu-resultats');
  // Liste repliée sur une ligne : on la déplie si la culture n'est pas visible.
  const choisirCulture = async (id) => {
    if (await page.isHidden(`[data-legume="${id}"]`)) await page.click('#tuiles-deplier');
    await page.click(`[data-legume="${id}"]`);
  };
  verifier(/PPFD cible\s*250/.test(await resultats()), 'calcul par défaut (laitue, 250 µmol/m²/s)');
  await choisirCulture('tomate');
  verifier(/PPFD cible\s*350/.test(await resultats()), 'tuile tomate : 350 µmol/m²/s en croissance');
  await page.click('label:has(input[value="floraison"])');
  verifier(/PPFD cible\s*500/.test(await resultats()), 'tomate en fructification : 500 µmol/m²/s');
  verifier(new URL(page.url()).searchParams.get('l') === 'tomate', "l'adresse reflète le calcul (partage par lien)");
  await page.goto(`${BASE}?l=basilic&h=14`, { waitUntil: 'networkidle' });
  verifier((await page.inputValue('#legume')) === 'basilic' && (await page.inputValue('#photoperiode')) === '14', 'un lien partagé restaure le calcul');
  await page.fill('#photoperiode', '30');
  verifier(!(await page.isHidden('#erreurs')), 'une saisie invalide affiche une erreur');

  await page.evaluate(() => localStorage.clear()); // repartir des réglages par défaut
  await page.goto(BASE, { waitUntil: 'networkidle' });
  verifier(/Plants\s*≈ 8 /.test(await resultats()), 'laitue 1,2 × 0,6 m à 25 cm : ≈ 8 plants');
  await page.fill('#longueur', '0,6');
  verifier(/barres? LED de 0,60\sm/.test(await resultats()), 'étagère de 60 cm : barres de 0,60 m choisies automatiquement');
  await choisirCulture('tomate');
  await page.fill('#photoperiode', '22');
  verifier(/18\sh/.test(await page.textContent('.alerte-calcul').catch(() => '')), 'alerte au-delà de 18 h pour la tomate');
  await page.fill('#photoperiode', '16');
  await page.fill('#longueur', '120');
  verifier(/en mètres/.test(await page.textContent('#erreurs')) && (await page.getAttribute('#longueur', 'aria-invalid')) === 'true', 'longueur saisie en cm : erreur claire, champ signalé');
  await page.fill('#longueur', '1,2');
  verifier(/^Résultat : .* W, \d+ barres? LED\.$/.test((await page.textContent('#annonce-resultats')) ?? ''), "annonce courte pour les lecteurs d'écran");
  const lienAmazon = await page.getAttribute('.lampe-proposee a', 'href').catch(() => null);
  verifier(!!lienAmazon && /^https:\/\/www\.amazon\.fr\/dp\/B0\w{8}\?tag=kultiledfr-21$/.test(lienAmazon) && (await page.getAttribute('.lampe-proposee a', 'rel')) === 'sponsored nofollow noopener', 'lampes du commerce proposées, lien Amazon sponsorisé avec identifiant');
  verifier((await page.locator('[data-legume]:not([hidden])').count()) === 4 && (await page.getAttribute('#tuiles-deplier', 'aria-expanded')) === 'false', 'liste des cultures repliée sur une ligne de 4');
  await page.click('#tuiles-deplier');
  await page.click('[data-legume="wasabi"]');
  verifier((await page.getAttribute('[data-legume="wasabi"]', 'aria-pressed')) === 'true' && (await page.locator('[data-legume]:not([hidden])').count()) === 4, 'choisir dans la liste dépliée sélectionne la culture et replie la liste');
  verifier((await page.locator('[data-omelette-injected]').count()) === 0, "aucun code d'outil de maquette dans la page");

  const scripts = await page.$$eval('script[src]', (els) => els.map((e) => e.src));
  // Exceptions : la mesure d'audience Cloudflare Web Analytics (sans cookie) et la publicité
  // Google AdSense avec son bandeau de consentement (build/annonces.ts).
  const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';
  const GOOGLE = /^https:\/\/([a-z0-9-]+\.)*(googlesyndication\.com|google\.com|googletagservices\.com|doubleclick\.net|gstatic\.com|adtrafficquality\.google)\//;
  verifier(scripts.every((s) => s.startsWith(BASE) || s === BEACON || GOOGLE.test(s)), 'aucun script externe chargé (hors mesure d’audience Cloudflare et publicité Google)');
  verifier(erreurs.length === 0, `aucune erreur JavaScript${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);

  // Actus de la veille, lues en direct : fichier d'essai (contenu maîtrisé), puis fichier injoignable.
  const VEILLE = 'https://teiki5320.github.io/veille/actus/kultiled.json';
  const image = (id, carte = false) => ({
    url: `https://teiki5320.github.io/veille/${carte ? 'cartes' : 'images'}/kultiled/${id}.${carte ? 'svg' : 'webp'}`,
    source: carte ? 'carte' : 'wikimedia', credit: carte ? 'Illustration : Kultiled' : 'Jane Doe', licence: carte ? null : 'CC BY-SA 4.0',
    page: carte ? null : 'https://commons.wikimedia.org/wiki/File:X.jpg', alt: 'Des laitues sous LED', largeur: 1600, hauteur: 900,
  });
  const actu = (n, x = {}) => ({ id: String(n).repeat(40).slice(0, 40), titre: `Actu d'essai numéro ${n}`, resume: 'Un résumé réécrit, en deux phrases. Avec sa source.', source_nom: 'Phys.org', source_url: `https://phys.org/news/${n}.html`, publie_le: `2026-10-2${n}T08:00:00Z`, image: image(n), ...x });
  const essai = { version: 3, site: 'kultiled', genere_le: '2026-10-27T08:00:00Z', actus: [actu(1), actu(2, { tags: ['legume:tomate'], image: image(2, true) }), actu(3), actu(4), actu(5), actu(6)] };
  const contexte = async (reponse) => {
    const c = await navigateur.newContext({ viewport: { width: 375, height: 812 } });
    await c.route(VEILLE, (r) => (reponse ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reponse) }) : r.abort()));
    await c.route('https://teiki5320.github.io/veille/{images,cartes}/**', (r) => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"/>' }));
    const p = await c.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    return p;
  };
  const visibles = (p) => p.$$eval('[data-actus]', (s) => s.map((x) => (x.hidden ? -1 : x.querySelectorAll('.actu').length)));
  const attendreActus = (p) => p.waitForFunction(() => [...document.querySelectorAll('[data-actus]')].every((s) => !s.hidden) || performance.now() > 6000, null, { timeout: 15000 }).catch(() => {});
  const sansDefilement = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

  let p = await contexte(essai);
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await attendreActus(p);
  verifier((await visibles(p)).join() === '4', 'accueil : 4 actus sous le calculateur');
  verifier(/PPFD cible/.test(await p.textContent('#contenu-resultats')), 'accueil : le calculateur marche toujours');
  verifier((await p.getAttribute('.actu__source a', 'rel')) === 'noopener nofollow' && (await p.getAttribute('.actu__source a', 'target')) === '_blank', 'lien Source : nouvel onglet, noopener nofollow');
  verifier(await sansDefilement(p), 'accueil : pas de défilement horizontal en 375 px');
  await p.goto(`${BASE}actus.html`, { waitUntil: 'networkidle' });
  await attendreActus(p);
  verifier((await visibles(p)).join() === '6' && (await p.isVisible('[data-actus-maj]')), 'page Actus : toutes les actus (20 au plus) et la date de mise à jour');
  verifier((await p.textContent('.actus')).includes('Illustration : Kultiled') && (await p.textContent('.actus')).includes('Photo : Jane Doe · CC BY-SA 4.0'), 'crédits : photo et illustration');
  await p.goto(`${BASE}legume-tomate.html`, { waitUntil: 'networkidle' });
  await attendreActus(p);
  verifier((await visibles(p)).join() === '1', 'fiche tomate : son actu');
  await p.goto(`${BASE}legume-basilic.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  verifier((await visibles(p)).join() === '-1', 'fiche sans actu : bloc absent');
  await p.context().close();

  p = await contexte(null);
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  verifier((await visibles(p)).join() === '-1' && (await p.isHidden('[data-actus-cadre]')) && /PPFD cible/.test(await p.textContent('#contenu-resultats')), 'veille injoignable : aucun bloc vide, calculateur intact');
  await p.goto(`${BASE}actus.html`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  verifier(await p.isVisible('[data-actus-vide]'), 'veille injoignable : la page Actus le dit simplement');
  await p.context().close();
  verifier(erreurs.length === 0, `aucune erreur JavaScript avec les actus${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);

  // Articles complets : une carte ouvre l'article sur le site (page construite, sinon page de secours).
  const { readFileSync } = await import('node:fs');
  const construit = readFileSync('dist/sitemap.xml', 'utf8').match(/\/actus\/([a-z0-9-]+)\/<\/loc>/)?.[1];
  const ARTICLES = 'https://teiki5320.github.io/veille/articles/kultiled/';
  const articleEssai = (n) => ({
    version: 1, site: 'kultiled', id: String(n).repeat(40), slug: `article-essai-${n}`, titre: `Article d'essai numéro ${n}`,
    chapo: "Un chapô d'essai, mis en avant sous le titre, qui résume l'article en une phrase.",
    blocs: [{ intertitre: null, paragraphes: ['Premier paragraphe.'] }, { intertitre: 'Un intertitre', paragraphes: ['Deuxième paragraphe.', 'Troisième.'] }],
    mots: 320, lecture_min: 2, tags: ['legume:tomate', 'legume:inconnu'], source_nom: 'Phys.org', source_url: 'https://phys.org/news/2.html',
    autres_sources: ['https://www.example.org/etude'], publie_le: '2026-10-22T08:00:00Z', redige_le: '2026-10-28T08:00:00Z', image: image(n),
  });
  const essaiArticles = {
    ...essai,
    actus: [
      actu(1, construit ? { slug: construit, article_url: `${ARTICLES}x.json` } : {}),
      actu(2, { slug: 'article-essai-2', article_url: `${ARTICLES}${'2'.repeat(40)}.json`, tags: ['legume:tomate'] }),
      actu(3), actu(4), actu(5),
    ],
  };
  p = await contexte(essaiArticles);
  await p.context().route(`${ARTICLES}**`, (r) => (r.request().url().endsWith(`${'2'.repeat(40)}.json`) ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(articleEssai(2)) }) : r.fulfill({ status: 404, body: '' })));
  await p.goto(`${BASE}actus.html`, { waitUntil: 'networkidle' });
  await attendreActus(p);
  // Liens des cartes, par numéro d'actu (titre « Actu d'essai numéro N »).
  const liens = Object.fromEntries(await p.$$eval('[data-actus] .actu', (cartes) => cartes.map((c) => [c.querySelector('.actu__titre')?.textContent?.match(/\d+$/)?.[0], c.querySelector('.actu__lien')?.getAttribute('href') ?? null])));
  const chemin = (u) => (u ? new URL(u).pathname + new URL(u).search : null);
  verifier(construit ? chemin(liens[1]) === `/actus/${construit}/` : liens[1] === null, `carte d'une actu à page construite → /actus/<slug>/${construit ? '' : ' (aucune page construite : ignoré)'}`);
  verifier(chemin(liens[2]) === `/actus/article/?id=${'2'.repeat(40)}`, 'carte d’une actu sans page construite → page de secours');
  verifier(liens[3] === null && (await p.locator('.actu', { hasText: "Actu d'essai numéro 3" }).locator('.actu__source a').getAttribute('rel')) === 'noopener nofollow', 'carte sans article → lien vers la source, comme avant');
  // Toucher n'importe où sur la carte (ici le résumé) ouvre l'article.
  await Promise.all([p.waitForURL(/\/actus\/article\/\?id=2{40}$/), p.locator('.actu', { hasText: "Actu d'essai numéro 2" }).locator('.actu__resume').click({ force: true })]);
  await p.waitForSelector('[data-article-secours] h2', { timeout: 10000 }).catch(() => {});
  verifier((await p.textContent('h1'))?.includes("Article d'essai numéro 2") && (await p.locator('.prose h2').count()) === 1, 'page de secours : titre et intertitre de l’article');
  verifier(await p.locator('meta[name="robots"][content^="noindex"]').count() === 1, 'page de secours : noindex');
  verifier(/Article rédigé par Kultiled à partir de\s:\sPhys\.org\s↗ et example\.org\s↗\./.test((await p.textContent('.actu-article__sources')) ?? ''), 'page de secours : encadré Sources');
  verifier((await p.getAttribute('.actu-article__fiches a', 'href'))?.endsWith('/legume-tomate.html') && (await p.locator('.actu-article__fiches a').count()) === 1, 'page de secours : lien vers la fiche existante, tag inconnu ignoré');
  verifier((await p.locator('[data-a-autres] .actu').count()) === 3 && /Photo\s:\sJane Doe/.test((await p.textContent('.actu-article__figure')) ?? ''), 'page de secours : image, crédit et 3 autres actus');
  verifier(await sansDefilement(p), 'page de secours : pas de défilement horizontal en 375 px');
  await p.goto(`${BASE}actus/article/?id=${'9'.repeat(40)}`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('introuvable'), null, { timeout: 10000 }).catch(() => {});
  verifier((await p.textContent('h1')) === 'Article introuvable' && (await p.getAttribute('[data-article-secours] a', 'href'))?.endsWith('/actus.html'), 'page de secours, identifiant inconnu : message et lien vers les actus');
  if (construit) {
    for (const largeur of [375, 768]) {
      await p.setViewportSize({ width: largeur, height: 900 });
      await p.goto(`${BASE}actus/${construit}/`, { waitUntil: 'networkidle' });
      verifier(await sansDefilement(p), `page d'article construite : pas de défilement horizontal en ${largeur} px`);
    }
    verifier((await p.locator('h1').count()) === 1 && (await p.locator('.bandeau__chapo').count()) === 1 && (await p.locator('.actu-article__figure img').count()) === 1 && (await p.locator('.actu-article__sources a[rel="noopener nofollow"]').count()) >= 1, "page d'article construite : titre, chapô, image, sources");
    verifier((await p.getAttribute('link[rel="canonical"]', 'href')) === `https://www.kultiled.com/actus/${construit}/` && (await p.locator('script[type="application/ld+json"]').first().textContent())?.includes('"NewsArticle"'), "page d'article construite : canonical et NewsArticle");
    verifier((await p.locator('.site-nav a[href$="actus.html"]').count()) === 1 && (await p.evaluate(() => getComputedStyle(document.body).fontFamily)).length > 0, "page d'article construite : menu et styles chargés");
  }
  await p.context().close();
  verifier(erreurs.length === 0, `aucune erreur JavaScript sur les articles${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
  await navigateur.close();
} catch (e) {
  console.error(e);
  echecs++;
} finally {
  serveur.kill();
}
process.exit(echecs ? 1 : 0);
