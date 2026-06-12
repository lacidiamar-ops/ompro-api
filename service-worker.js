// Service Worker - OM PRO API V12.8 stable reporting
const VERSION = 'v12-8-reporting-cumul-20260612';
const CACHE_NAME = 'ompro-' + VERSION;
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('jsdelivr') || url.hostname.includes('cloudflare') || url.hostname.includes('googleapis')) return;
  event.respondWith(fetch(event.request, {cache:'no-store'}).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request)));
});
