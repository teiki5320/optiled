// Test de bout en bout : lance le site construit (vite preview) et le pilote dans Chromium.
// Usage : npm run build && npm run test:e2e
// Vérifie que les pages s'affichent sans erreur et que le calculateur fonctionne.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const serveur = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });

let echecs = 0;
const verifier = (condition, message) => {
  console.log(`${condition ? '✓' : '✗'} ${message}`);
  if (!condition) echecs++;
};

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
  verifier(/PPFD cible\s*250/.test(await resultats()), 'calcul par défaut (laitue, 250 µmol/m²/s)');
  await page.click('[data-legume="tomate"]');
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
  await page.click('[data-legume="tomate"]');
  await page.fill('#photoperiode', '22');
  verifier(/18\sh/.test(await page.textContent('.alerte-calcul').catch(() => '')), 'alerte au-delà de 18 h pour la tomate');
  await page.fill('#photoperiode', '16');
  await page.fill('#longueur', '120');
  verifier(/en mètres/.test(await page.textContent('#erreurs')) && (await page.getAttribute('#longueur', 'aria-invalid')) === 'true', 'longueur saisie en cm : erreur claire, champ signalé');
  await page.fill('#longueur', '1,2');
  verifier(/^Résultat : .* W, \d+ barres? LED\.$/.test((await page.textContent('#annonce-resultats')) ?? ''), "annonce courte pour les lecteurs d'écran");
  verifier((await page.locator('[data-omelette-injected]').count()) === 0, "aucun code d'outil de maquette dans la page");

  const scripts = await page.$$eval('script[src]', (els) => els.map((e) => e.src));
  verifier(scripts.every((s) => s.startsWith(BASE)), 'aucun script externe chargé');
  verifier(erreurs.length === 0, `aucune erreur JavaScript${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
  await navigateur.close();
} catch (e) {
  console.error(e);
  echecs++;
} finally {
  serveur.kill();
}
process.exit(echecs ? 1 : 0);
