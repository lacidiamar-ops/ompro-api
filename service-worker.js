// Service Worker - OM PRO API V12.9 stable sync planning
const VERSION = 'v12-9-sync-planning-20260612';
const CACHE_NAME = 'ompro-' + VERSION;

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('jsdelivr') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {}));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
