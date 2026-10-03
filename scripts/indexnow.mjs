// Signale toutes les pages du site aux moteurs qui utilisent IndexNow (Bing, Yandex, Seznam…).
// Usage : node scripts/indexnow.mjs (ou npm run indexnow)
// Lit le sitemap PUBLIÉ (pas la copie locale), puis envoie toutes ses adresses en une requête.
// La clé est publique par conception : elle est servie à https://www.optiled.fr/<clé>.txt
// (fichier public/<clé>.txt), ce qui prouve aux moteurs que le site nous appartient.

export const CLE = 'c0e2eea796f0b728ac889de874db3cbe';
export const HOTE = 'www.optiled.fr';
const SITEMAP = `https://${HOTE}/sitemap.xml`;
const API = 'https://api.indexnow.org/indexnow';

/** Adresses <loc> d'un sitemap. */
export function adressesDuSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

async function main() {
  const reponseSitemap = await fetch(SITEMAP);
  if (!reponseSitemap.ok) throw new Error(`Sitemap illisible : ${SITEMAP} a répondu ${reponseSitemap.status}`);
  const urlList = adressesDuSitemap(await reponseSitemap.text());
  if (urlList.length === 0) throw new Error(`Aucune adresse <loc> dans ${SITEMAP}`);

  const reponse = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOTE, key: CLE, keyLocation: `https://${HOTE}/${CLE}.txt`, urlList }),
  });
  console.log(`IndexNow : ${urlList.length} pages signalées, réponse ${reponse.status} ${reponse.statusText}`);
  // 200 (reçu) et 202 (reçu, clé en cours de vérification) sont des succès.
  if (reponse.status >= 400) {
    console.error(await reponse.text());
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
