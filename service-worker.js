const CACHE_VERSION = 'ompro-api-v13-no-cache';
self.addEventListener('install', event => {
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => new Response('Hors ligne', {status: 503, headers: {'Content-Type':'text/plain; charset=utf-8'}})));
});
