// OM PRO × API — Service Worker v2.0
// Change CACHE_NAME à chaque déploiement pour forcer le rechargement
const CACHE_NAME = 'ompro-v161-planning-fix';

self.addEventListener('install', e => {
  // Prendre le contrôle immédiatement sans attendre
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // Supprimer TOUS les anciens caches
    caches.keys()
      .then(keys => Promise.all(keys.map(k => {
        console.log('[SW] Suppression cache:', k);
        return caches.delete(k);
      })))
      .then(() => self.clients.claim())
      .then(() => {
        // Forcer le rechargement de tous les clients ouverts
        return self.clients.matchAll({ type: 'window' });
      })
      .then(clients => {
        clients.forEach(client => client.navigate(client.url));
      })
  );
});

self.addEventListener('fetch', e => {
  // Toujours aller chercher sur le réseau, jamais depuis le cache
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .catch(() => new Response('Hors ligne', {
        status: 503,
        statusText: 'Offline'
      }))
  );
});

// ═══════════════ NOTIFICATIONS PUSH ═══════════════
self.addEventListener('push', e => {
  let data = {title: 'OM PRO', body: 'Nouvelle notification'};
  try { data = e.data.json(); } catch(err) {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'OM PRO', {
      body: data.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'ompro-alert'
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type: 'window'}).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
