// Service Worker - OM PRO × API V6
// Version : 1.0.0

const CACHE_NAME = 'ompro-api-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installation v6');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Cache addAll failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation v6');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first pour les API, Cache first pour les assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ne pas cacher les requêtes Supabase (toujours du réseau)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('jsdelivr') || url.hostname.includes('cloudflare')) {
    return;
  }
  
  // Cache first pour les assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
