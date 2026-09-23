/* Service worker OptiLED : le site reste consultable hors ligne.
 * - Pages HTML : réseau d'abord (toujours la dernière version), cache en secours hors ligne.
 * - Fichiers du build (assets/, noms à empreinte), images, icônes : cache d'abord.
 * Changer VERSION invalide les anciens caches. */
const VERSION = 'optiled-v1';
const PRECHARGE = ['./', './index.html', './legumes.html', './led.html', './culture.html', './glossaire.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECHARGE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone();
          caches.open(VERSION).then((c) => c.put(req, copie));
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
