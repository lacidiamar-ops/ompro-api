// Service Worker - V8 stable
const VERSION = 'v8-stable-20260503';
const CACHE_NAME = 'ompro-' + VERSION;

self.addEventListener('install', (event) => {
  console.log('[SW] Install', VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate', VERSION);
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co') 
      || url.hostname.includes('jsdelivr') 
      || url.hostname.includes('cloudflare')
      || url.hostname.includes('googleapis')) {
    return;
  }
  // Network-first toujours pour avoir les dernières màj
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
