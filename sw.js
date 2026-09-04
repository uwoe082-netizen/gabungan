/* Root Service Worker — HANYA untuk dashboard (scope: repo root).
   Sub-app (hafiz/, villain-arc/, kai/) punya sw.js sendiri dengan
   scope terbatas ke folder masing-masing — jangan didaftarkan dari sini. */
const CACHE_VERSION = 'ecosystem-dashboard-v2';
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
  if (event.request.method !== 'GET') return;

  // Network-first: selalu coba ambil versi terbaru dulu, supaya perubahan
  // konten langsung kepakai tanpa perlu bump CACHE_VERSION manual tiap edit.
  // Fallback ke cache kalau offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
