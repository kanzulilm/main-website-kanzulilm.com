/* ═══════════════════════════════════════════════════════
   Kanzulilm International — Service Worker
   Strategy: Cache-First for assets, Network-First for HTML
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'kanzulilm-v1';
const STATIC_CACHE = 'kanzulilm-static-v1';
const DYNAMIC_CACHE = 'kanzulilm-dynamic-v1';

/* ── Core files to pre-cache on install ── */
const PRECACHE_URLS = [
  '/',
  '/privacy',
  '/manifest.json',
  '/logo.png',
  '/ogcover.jpg',
  '/offline'
];

/* ── Install: pre-cache core shell ── */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* ── Activate: delete old caches ── */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) {
            return name !== STATIC_CACHE && name !== DYNAMIC_CACHE;
          })
          .map(function(name) {
            return caches.delete(name);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* ── Fetch: smart routing strategy ── */
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  /* Skip non-GET and cross-origin analytics/external scripts */
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com') &&
      !url.hostname.includes('unpkg.com') &&
      !url.hostname.includes('cdn.tailwindcss.com')) {
    return;
  }

  /* HTML pages → Network-First (always fresh) */
  if (event.request.headers.get('accept') &&
      event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          var clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match('/offline');
          });
        })
    );
    return;
  }

  /* Static assets (images, fonts, CSS, JS) → Cache-First */
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;

      return fetch(event.request).then(function(response) {
        /* Only cache valid responses */
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        var clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        /* Offline fallback for images */
        if (event.request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#0a1628"/><text x="50%" y="50%" text-anchor="middle" fill="#d4af37" font-size="14" dy=".3em">Kanzulilm</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      });
    })
  );
});

/* ── Background Sync placeholder (ready for future use) ── */
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-forms') {
    /* Future: sync queued form submissions */
    console.log('[SW] Background sync triggered');
  }
});

/* ── Push Notifications placeholder ── */
self.addEventListener('push', function(event) {
  var data = {};
  if (event.data) {
    try { data = event.data.json(); } catch(e) { data = { title: 'Kanzulilm', body: event.data.text() }; }
  }
  var options = {
    body: data.body || 'New update from Kanzulilm International',
    icon: '/androidchrome192x192.png',
    badge: '/androidchrome192x192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kanzulilm International', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
