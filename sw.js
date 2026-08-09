/* Root Service Worker — HANYA untuk dashboard (scope: repo root).
   Sub-app (hafiz/, villain-arc/, kai/) punya sw.js sendiri dengan
   scope terbatas ke folder masing-masing — jangan didaftarkan dari sini. */
const CACHE_VERSION = 'ecosystem-dashboard-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './shared/storage-bridge.js',
  './shared/gamification-core.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION && k.startsWith('ecosystem-dashboard')).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Hanya tangani request untuk file dashboard sendiri, biarkan sub-app diurus SW masing-masing
  if (!ASSETS.some((a) => url.pathname.endsWith(a.replace('./', '')))) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
