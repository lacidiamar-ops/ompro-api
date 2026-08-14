// OM PRO × API — Service Worker v2.0
// Change CACHE_NAME à chaque déploiement pour forcer le rechargement
const CACHE_NAME = 'ompro-v166-payroll-export';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => { clients.forEach(client => client.navigate(client.url)); })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .catch(() => new Response('Hors ligne', { status: 503, statusText: 'Offline' }))
  );
});

self.addEventListener('push', e => {
  let data = {title: 'OM PRO', body: 'Nouvelle notification'};
  try { data = e.data.json(); } catch(err) {}
  e.waitUntil(self.registration.showNotification(data.title || 'OM PRO', {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'ompro-alert'
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window'}).then(clientList => {
    for (const client of clientList) { if ('focus' in client) return client.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('/');
  }));
});
