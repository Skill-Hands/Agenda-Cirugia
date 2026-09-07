const CACHE = 'agenda-qx-shell-v4';
const FILES = ["astudillo.html", "azua.html", "barraza.html", "boada.html", "qx.html", "dictter.html", "l-rodriguez.html", "m-alvarez.html", "m-rodriguez.html", "martinez.html", "miranda.html", "molina.html", "olivares.html", "oyarzun.html", "r-romero.html", "ramirez.html", "ramos.html", "rey.html", "romero.html", "salas.html", "tapia.html", "velasquez.html", "vicencio.html", "qx-offline.js?v=4", "qx-icon-180.png", "qx-icon-512.png", "astudillo.webmanifest", "azua.webmanifest", "barraza.webmanifest", "boada.webmanifest", "qx.webmanifest", "dictter.webmanifest", "l-rodriguez.webmanifest", "m-alvarez.webmanifest", "m-rodriguez.webmanifest", "martinez.webmanifest", "miranda.webmanifest", "molina.webmanifest", "olivares.webmanifest", "oyarzun.webmanifest", "r-romero.webmanifest", "ramirez.webmanifest", "ramos.webmanifest", "rey.webmanifest", "romero.webmanifest", "salas.webmanifest", "tapia.webmanifest", "velasquez.webmanifest", "vicencio.webmanifest"].map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(FILES.map(url => new Request(url,{cache:'reload'})));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('agenda-qx-shell-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const known = FILES.find(file => new URL(file).pathname === url.pathname);
  if (!known) return;
  // Serve the installed application immediately; data refresh independently.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(known);
    if (cached) return cached;
    return fetch(event.request);
  })());
});
