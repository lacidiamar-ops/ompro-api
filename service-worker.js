const CACHE_NAME='ompro-v151-no-stale';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{event.respondWith(fetch(event.request).catch(()=>new Response('Hors ligne',{status:503,statusText:'Offline'})));});
