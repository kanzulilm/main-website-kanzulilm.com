/* ================================================================
   KANZ UL ILM — sw.js (articles/ur/)
   Service Worker v5.0 — scope: /articles/ur/
   ================================================================ */

const VERSION    = 'v5-ur';
const CACHE      = `kanz-${VERSION}`;
const CACHE_DATA = `kanz-data-${VERSION}`;

const APP_SHELL     = '/articles/ur/index.html';
const STATIC_ASSETS = [
  '/articles/ur/',
  APP_SHELL,
  '/articles/ur/assets/css/main.css',
  '/articles/ur/assets/js/app.js',
  '/articles/ur/assets/js/kanz-data.js',
  '/articles/ur/assets/icons/favicon-32.png',
  '/articles/ur/assets/icons/icon-192.png',
  '/articles/ur/assets/icons/icon-512.png',
  '/articles/ur/assets/icons/apple-touch-icon.png'
];

const FONT_ASSETS = [
  '/articles/ur/assets/fonts/JameelNooriNastaleeq.woff2',
  '/articles/ur/assets/fonts/NaskhUnicode.woff2',
  '/articles/ur/assets/fonts/MehrNastaliqWeb.woff2',
  '/articles/ur/assets/fonts/ULSajidHeading.woff2',
  '/articles/ur/assets/fonts/NafeesWebNaskh.woff2',
  '/articles/ur/assets/fonts/AlviNastaleeq.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled([...STATIC_ASSETS, ...FONT_ASSETS].map(u => c.add(u))))
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

  // ایڈمن پینل کبھی کیش نہ ہو
  if (url.pathname.startsWith('/articles/ur/admin')) return;

  // اشتہارات / اینالٹکس
  if (url.hostname.includes('googlesyndication') ||
      url.hostname.includes('doubleclick')       ||
      url.hostname.includes('googleadservices')  ||
      url.hostname.includes('google-analytics')) return;

  // AI خلاصہ API
  if (url.pathname.startsWith('/articles/ur/api/')) return;

  // فونٹس (cross-origin)
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

  // JSON ڈیٹا — Network first
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

  // Navigation — Network first
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() =>
        caches.match(APP_SHELL).then(c => c || caches.match('/articles/ur/'))
      )
    );
    return;
  }

  // باقی static — Cache first
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
