/* ================================================================
   KANZ UL ILM — sw.js (articles/en/)
   Service Worker v1-en — scope: /articles/en/
   ================================================================ */

const VERSION    = 'v1-en';
const CACHE      = `kanz-${VERSION}`;
const CACHE_DATA = `kanz-data-${VERSION}`;

const APP_SHELL     = '/articles/en/index.html';
const STATIC_ASSETS = [
  '/articles/en/',
  APP_SHELL,
  '/articles/en/assets/css/main.css',
  '/articles/en/assets/js/app.js',
  '/articles/en/assets/js/kanz-data.js',
  '/articles/en/assets/icons/favicon-32.png',
  '/articles/en/assets/icons/icon-192.png',
  '/articles/en/assets/icons/icon-512.png',
  '/articles/en/assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(STATIC_ASSETS.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE && k !== CACHE_DATA)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  if (url.pathname.startsWith('/articles/en/admin')) return;

  if (url.hostname.includes('googlesyndication') ||
      url.hostname.includes('doubleclick')       ||
      url.hostname.includes('googleadservices')  ||
      url.hostname.includes('google-analytics')) return;

  if (url.pathname.startsWith('/articles/en/api/')) return;

  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque'))
            caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('.json') && !url.pathname.includes('manifest')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_DATA).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then(c => c || Response.error()))
    );
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() =>
        caches.match(APP_SHELL).then(c => c || caches.match('/articles/en/'))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (!res || !res.ok || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return res;
      });
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
