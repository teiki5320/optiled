// Vérification des produits Amazon du site (à lancer sur le Mac, pas sur GitHub : Amazon bloque
// souvent les serveurs). Pour chaque produit du catalogue (lampes, tentes, onglets « Top 10 »),
// la fiche amazon.fr/dp/<ASIN> est ouverte dans Chrome : si le bouton d'achat est présent
// (« Ajouter au panier » ou « Acheter cette article »), le produit reçoit verifie_le = date du jour
// (et redevient disponible s'il ne l'était plus) ; sinon il passe en « disponible: false » : il n'est
// plus affiché nulle part (ni calculateur, ni pages, ni Top 10), son ASIN est conservé.
// Rien n'est inventé : seul l'état lu sur la fiche est enregistré.
//
// Usage : npm run verifier-produits              (rapport seul)
//         npm run verifier-produits -- --ecrire  (met à jour les fichiers de src/data/)
//         npm run verifier-produits -- --ecrire --lot 30
//           (seulement les 30 produits vérifiés il y a le plus longtemps, jamais vérifiés d'abord,
//            avec des pauses plus longues : Amazon tolère mieux de petits lots qu'une rafale)
//         npm run verifier-produits -- --ecrire --ids id1,id2,…   (seulement ces produits)
// Chrome : CHROMIUM_PATH=/chemin/vers/chrome (par défaut, Google Chrome sur macOS).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const RACINE = resolve(import.meta.dirname, '..');
const DONNEES = resolve(RACINE, 'src/data');
const ecrire = process.argv.includes('--ecrire');
const aujourdhui = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const chrome = process.env.CHROMIUM_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Fichiers du catalogue et nom de leur liste de produits. */
const FICHIERS = [
  ['lampes.json', 'lampes'],
  ['tentes.json', 'tentes'],
  ...readdirSync(resolve(DONNEES, 'top-10'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [`top-10/${f}`, 'produits']),
].map(([fichier, cle]) => {
  const brut = readFileSync(resolve(DONNEES, fichier), 'utf8');
  return { fichier, cle, donnees: JSON.parse(brut), compact: !brut.includes('\n      "') };
});

/** Une valeur JSON sur une ligne : { "a": 1, "b": [2, 3] }. */
function enLigne(v) {
  if (Array.isArray(v)) return `[${v.map(enLigne).join(', ')}]`;
  if (v && typeof v === 'object') return `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${enLigne(x)}`).join(', ')} }`;
  return JSON.stringify(v);
}

const tous = FICHIERS.flatMap((f) => f.donnees[f.cle].filter((p) => p.asin).map((p) => ({ p, f })));
const iLot = process.argv.indexOf('--lot');
const lot = iLot > -1 ? Number(process.argv[iLot + 1]) || 30 : 0;
const iIds = process.argv.indexOf('--ids');
const ids = iIds > -1 ? new Set(String(process.argv[iIds + 1] || '').split(',').map((s) => s.trim()).filter(Boolean)) : null;
if (ids) for (const id of ids) if (!tous.some(({ p }) => p.id === id)) console.log(`? ${id} : pas un produit du catalogue, ignoré`);
const aVerifier = ids
  ? tous.filter(({ p }) => ids.has(p.id))
  : lot
    ? [...tous].sort((a, b) => String(a.p.verifie_le || '').localeCompare(String(b.p.verifie_le || ''))).slice(0, lot)
    : tous;

const navigateur = await chromium.launch({ executablePath: chrome, headless: true });
const page = await (await navigateur.newContext({ locale: 'fr-FR' })).newPage();
const disponibles = [];
const indisponibles = [];
let bloque = false;

for (const x of aVerifier) {
  const { p } = x;
  let etat;
  try {
    const reponse = await page.goto(`https://www.amazon.fr/dp/${p.asin}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    etat = await page.evaluate(() => ({
      captcha: !!document.querySelector('form[action*="validateCaptcha"]'),
      achat: !!document.querySelector('#add-to-cart-button, #buy-now-button'),
      titre: (document.querySelector('#productTitle')?.textContent || '').trim(),
    }));
    etat.statut = reponse?.status() ?? 0;
  } catch (e) {
    console.log(`? ${p.id} (${p.asin}) : erreur de chargement, non modifié (${e.message.split('\n')[0]})`);
    continue;
  }
  if (etat.captcha) {
    bloque = true;
    console.log(`Amazon demande une vérification (captcha) : arrêt, aucun produit modifié après ${p.id}.`);
    break;
  }
  if (etat.achat) {
    disponibles.push(x);
    console.log(`✓ ${p.id} (${p.asin})${etat.titre ? ` · ${etat.titre.slice(0, 60)}` : ''}`);
  } else {
    indisponibles.push(x);
    console.log(`✗ ${p.id} (${p.asin}) : plus achetable (HTTP ${etat.statut})${etat.titre ? ` · ${etat.titre.slice(0, 60)}` : ''}`);
  }
  await page.waitForTimeout(lot ? 4000 + Math.random() * 4000 : 1200 + Math.random() * 1500); // rythme humain
}
await navigateur.close();

console.log(`\n${disponibles.length} produit(s) disponible(s), ${indisponibles.length} indisponible(s), ${aVerifier.length - disponibles.length - indisponibles.length} non vérifié(s).`);
if (ecrire) {
  for (const { p } of disponibles) {
    p.verifie_le = aujourdhui;
    delete p.disponible;
  }
  for (const { p } of indisponibles) p.disponible = false;
  for (const f of FICHIERS) {
    const produits = f.donnees[f.cle].filter((p) => p.asin);
    // Date du fichier : celle du jour quand tous ses produits ont été vérifiés aujourd'hui.
    if (produits.every((p) => p.verifie_le === aujourdhui || p.disponible === false) && produits.some((p) => p.verifie_le === aujourdhui)) f.donnees.verifie_le = aujourdhui;
    let texte = JSON.stringify(f.donnees, null, 2);
    // Garde un produit par ligne, comme dans les fichiers écrits à la main.
    if (f.compact) texte = texte.replace(new RegExp(`("${f.cle}": \\[)[\\s\\S]*?(\\n  \\])`), (_m, a, b) => `${a}\n    ${f.donnees[f.cle].map(enLigne).join(',\n    ')}${b}`);
    writeFileSync(resolve(DONNEES, f.fichier), texte + '\n');
  }
  console.log(`src/data/ mis à jour (${aujourdhui}).`);
}
if (indisponibles.length) console.log('À remplacer ou masquer : ' + indisponibles.map(({ p, f }) => `${p.id} (${f.fichier})`).join(', '));
process.exit(bloque ? 2 : 0);
