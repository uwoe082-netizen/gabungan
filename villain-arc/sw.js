const CACHE_NAME = "villain-arc-v6";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/variables.css",
  "./css/base.css",
  "./css/components.css",
  "./css/animations.css",
  "./css/pages.css",
  "./js/data.js",
  "./js/storage.js",
  "./js/gamification.js",
  "./js/quotes.js",
  "./js/timer.js",
  "./js/notifications.js",
  "./js/ui.js",
  "./js/ai-coach.js",
  "./js/app.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Strategi berbeda per jenis file:
// - JS/CSS/HTML (kode app): NETWORK-FIRST — selalu coba ambil versi terbaru
//   dari server dulu; baru fallback ke cache kalau offline. Ini penting
//   supaya update kode (rotasi VAPID key, bugfix, dll) langsung kepakai
//   tanpa user harus manual "Clear site data" tiap ada perubahan.
// - Aset statis (icon dll): CACHE-FIRST seperti biasa — jarang berubah,
//   lebih hemat kuota & lebih cepat dimuat.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = event.request.url;
  const isAppCode = /\.(js|css|html)(\?|$)/.test(url) || url.endsWith("/");

  if (isAppCode) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

// Push notification handling
self.addEventListener("push", (event) => {
  let data = { title: "VILLAIN ARC ⚔️", body: "Misi menunggu 💀" };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "VILLAIN ARC ⚔️", {
      body: data.body,
      icon: "assets/icons/icon-192.png",
      badge: "assets/icons/icon-192.png",
      tag: "villain-arc-daily",
      vibrate: [100, 50, 100]
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});
