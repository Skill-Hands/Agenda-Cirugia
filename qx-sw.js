const CACHE = 'agenda-qx-shell-v3';
const FILES = [
  'qx.html','boada.html','molina.html','olivares.html','qx-offline.js?v=3',
  'qx-icon-180.png','qx-icon-512.png',
  'qx.webmanifest','boada.webmanifest','molina.webmanifest','olivares.webmanifest'
].map(path => new URL(path, self.registration.scope).href);
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
