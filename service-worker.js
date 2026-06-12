// OM PRO x API - service worker minimal anti-cache
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
// Pas de stratégie cache agressive : GitHub Pages doit servir la version à jour.
