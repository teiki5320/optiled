/* Service worker OptiLED : le site reste consultable hors ligne.
 * - Pages HTML : réseau d'abord (toujours la dernière version), cache en secours hors ligne.
 * - Fichiers du build (assets/, noms à empreinte), images, icônes : cache d'abord.
 * Changer VERSION invalide les anciens caches (à faire quand une image ou le manifest change).
 * Seules les réponses valides sont gardées ; les anciens fichiers du build sont retirés. */
const VERSION = 'optiled-v2';
const PRECHARGE = ['./', './index.html', './legumes.html', './led.html', './culture.html', './glossaire.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECHARGE)).then(() => self.skipWaiting()));
});

/** Retire du cache les fichiers du build (assets/) qu'aucune page ni feuille de style en cache n'utilise plus. */
async function nettoyerAssets() {
  const cache = await caches.open(VERSION);
  const requetes = await cache.keys();
  const estAsset = (r) => new URL(r.url).pathname.includes('/assets/');
  const textes = await Promise.all(
    requetes
      .filter((r) => !estAsset(r) || r.url.endsWith('.css'))
      .map((r) => cache.match(r).then((rep) => (rep && /text\/(html|css)/.test(rep.headers.get('content-type') || '') ? rep.text() : ''))),
  );
  const references = textes.join('\n');
  await Promise.all(
    requetes.filter((r) => estAsset(r) && !references.includes(new URL(r.url).pathname.split('/').pop())).map((r) => cache.delete(r)),
  );
}

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          if (rep.ok) {
            const copie = rep.clone();
            caches.open(VERSION).then((c) => c.put(req, copie)).then(nettoyerAssets);
          }
          return rep;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (r) =>
        r ||
        fetch(req).then((rep) => {
          if (rep.ok) {
            const copie = rep.clone();
            caches.open(VERSION).then((c) => c.put(req, copie));
          }
          return rep;
        }),
    ),
  );
});
