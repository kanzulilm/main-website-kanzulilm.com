/**
 * KANZ UL ILM v2 — app.js
 * Academic Portal SPA Engine
 * Features: clean-URL routing (/articles/{slug}), auto-archive detection, audience filter,
 *           SEO meta tags, search, PDF download stubs
 */
'use strict';

/* ============================================================
   0. CONFIG — صرف یہ بلاک ایڈٹ کریں
   ============================================================ */
const KANZ_CONFIG = {
  /* ⚠️ اپنی اصل AdSense Publisher ID یہاں ڈالیں */
  adClient: 'ca-pub-XXXXXXXXXXXXXXXX',

  /* AdSense ڈیش بورڈ سے حاصل کردہ اصل slot IDs */
  adSlots: {
    leaderboard:  '0000000001',   // ہر صفحے کے اوپر
    homeRect:     '0000000002',   // صفحہ اول
    inFeed:       '0000000003',   // فہرست کے درمیان (In-feed)
    underTitle:   '0000000004',   // عنوان کے نیچے
    inArticle:    '0000000005',   // مضمون کے اندر (In-article)
    afterArticle: '0000000006',   // مضمون کے بعد
    sidebar:      '0000000007',   // ڈیسک ٹاپ سائیڈ (sticky)
    anchor:       '0000000008',   // موبائل نیچے چپکنے والا
    multiplex:    '0000000009',   // Multiplex / Matched content
    searchTop:    '0000000010'    // تلاش کے نتائج
  },

  /* ⭐ اشتہاری پالیسی — AdSense قواعد کے مطابق محفوظ حدود */
  ads: {
    enabled:            true,
    maxPerPage:         8,      // ایک صفحے پر زیادہ سے زیادہ (Better Ads معیار)
    inArticleEvery:     3,      // ہر N پیراگراف بعد ایک اشتہار
    inArticleMax:       4,      // مضمون کے اندر زیادہ سے زیادہ
    inArticleMinWords:  45,     // اتنے الفاظ کے بغیر اشتہار نہ ڈالیں
    inFeedEvery:        4,      // ہر N کارڈ بعد
    inFeedMax:          3,
    anchorOnMobile:     true,   // موبائل پر نیچے چپکنے والا
    anchorDelayMs:      2500,   // فوراً نہیں — قاری کو مواد دیکھنے دیں
    lazyMargin:         '300px' // نظر آنے سے پہلے لوڈ (viewability ↑ RPM ↑)
  },

  /* ⭐ صاف URL کی بنیاد — kanzulilm.com/articles/…
     index.html میں window.KANZ_BASE_PATH سے override کیا جا سکتا ہے۔
     جڑ (root) پر چلانا ہو تو یہاں '' لکھ دیں۔ */
  basePath: '/articles/ur',

  /* canonical / og:url / share لنکس ہمیشہ اسی ڈومین پر بنیں —
     preview.pages.dev پر بھی درست canonical نکلے */
  siteOrigin: 'https://kanzulilm.com',

  aiSummaryEndpoint: '/articles/ur/api/summary',
  dataPath: '/articles/ur/data/content.json'
};

/* ============================================================
   0-B. ADSENSE ENGINE
   ────────────────────────────────────────────────────────────
   • lazy-load — اشتہار تب لوڈ ہو جب قریب آئے (رفتار + viewability)
   • density guard — AdSense پالیسی سے تجاوز نہ ہو
   • CLS guard — جگہ پہلے سے محفوظ، صفحہ نہ اچھلے
   ============================================================ */
const AdEngine = {
  _count: 0,
  _io: null,

  ready() {
    return KANZ_CONFIG.ads.enabled &&
           KANZ_CONFIG.adClient &&
           !KANZ_CONFIG.adClient.includes('XXXX');
  },

  reset() { this._count = 0; },

  /** ایک اشتہاری یونٹ کا HTML — فوراً لوڈ نہیں ہوتا */
  unit(slotKey, opts = {}) {
    if (!this.ready()) return '';
    if (this._count >= KANZ_CONFIG.ads.maxPerPage) return '';
    const slot = KANZ_CONFIG.adSlots[slotKey];
    if (!slot) return '';
    this._count++;

    const {
      cls = '', minHeight = 250, format = 'auto',
      layout = '', fullWidth = true, style = ''
    } = opts;

    const attrs = [
      `class="adsbygoogle"`,
      `style="display:block;min-height:${minHeight}px;${style}"`,
      `data-ad-client="${KANZ_CONFIG.adClient}"`,
      `data-ad-slot="${slot}"`,
      format ? `data-ad-format="${format}"` : '',
      layout ? `data-ad-layout="${layout}"` : '',
      fullWidth ? `data-full-width-responsive="true"` : ''
    ].filter(Boolean).join(' ');

    return `<div class="ad-unit ${cls}" data-ad-pending="1"><ins ${attrs}></ins></div>`;
  },

  /** صفحہ رینڈر ہونے کے بعد — lazy observer لگائیں */
  activate(root = document) {
    if (!this.ready()) return;
    if (!this._io && 'IntersectionObserver' in window) {
      this._io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          this._push(e.target);
          this._io.unobserve(e.target);
        });
      }, { rootMargin: KANZ_CONFIG.ads.lazyMargin });
    }
    root.querySelectorAll('.ad-unit[data-ad-pending]').forEach(el => {
      if (this._io) this._io.observe(el);
      else this._push(el);          // IO دستیاب نہ ہو تو فوراً
    });
  },

  _push(el) {
    if (!el || !el.hasAttribute('data-ad-pending')) return;
    el.removeAttribute('data-ad-pending');
    const ins = el.querySelector('ins.adsbygoogle');
    if (!ins || ins.getAttribute('data-adsbygoogle-status')) return;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
    catch (e) { /* AdSense اسکرپٹ ابھی نہیں آئی */ }
  },

  /** ⭐ مضمون کے متن میں خودکار اشتہار — الفاظ کی گنتی کے ساتھ */
  injectIntoArticle(html) {
    if (!this.ready()) return html;
    const cfg = KANZ_CONFIG.ads;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    const blocks = [...tmp.children];
    if (blocks.length < cfg.inArticleEvery + 1) return html;

    let inserted = 0, wordsSince = 0;
    blocks.forEach((el, i) => {
      wordsSince += countWords(el.textContent || '');
      const isLast = i >= blocks.length - 2;   // آخری دو کے بعد نہ ڈالیں
      const spacedEnough = (i + 1) % cfg.inArticleEvery === 0;

      if (!isLast && spacedEnough &&
          wordsSince >= cfg.inArticleMinWords &&
          inserted < cfg.inArticleMax) {
        const ad = this.unit('inArticle', {
          cls: 'ad-in-article', minHeight: 250,
          format: 'fluid', layout: 'in-article'
        });
        if (ad) { el.insertAdjacentHTML('afterend', ad); inserted++; wordsSince = 0; }
      }
    });
    return tmp.innerHTML;
  },

  /** ⭐ فہرست کے کارڈوں کے درمیان In-feed اشتہار */
  injectIntoFeed(cardsHTML, count) {
    if (!this.ready() || count < KANZ_CONFIG.ads.inFeedEvery) return cardsHTML.join('');
    const cfg = KANZ_CONFIG.ads;
    const out = []; let inserted = 0;
    cardsHTML.forEach((card, i) => {
      out.push(card);
      if ((i + 1) % cfg.inFeedEvery === 0 &&
          i < cardsHTML.length - 1 &&
          inserted < cfg.inFeedMax) {
        const ad = this.unit('inFeed', {
          cls: 'ad-in-feed', minHeight: 200,
          format: 'fluid', layout: 'in-article'
        });
        if (ad) { out.push(ad); inserted++; }
      }
    });
    return out.join('');
  },

  /** ⭐ موبائل anchor — تاخیر سے، بند کرنے کے قابل */
  initAnchor() {
    if (!this.ready() || !KANZ_CONFIG.ads.anchorOnMobile) return;
    if (window.innerWidth > 1024) return;
    if (sessionStorage.getItem('kanz_anchor_closed') === '1') return;
    if (document.getElementById('ad-anchor')) return;

    setTimeout(() => {
      const html = this.unit('anchor', {
        minHeight: 50, format: 'horizontal', fullWidth: true
      });
      if (!html) return;
      const bar = document.createElement('div');
      bar.className = 'ad-anchor'; bar.id = 'ad-anchor';
      bar.innerHTML =
        `<button class="ad-anchor-close" aria-label="اشتہار بند کریں">✕</button>${html}`;
      document.body.appendChild(bar);
      document.body.classList.add('has-anchor-ad');
      requestAnimationFrame(() => bar.classList.add('show'));
      this.activate(bar);

      bar.querySelector('.ad-anchor-close').addEventListener('click', () => {
        bar.remove();
        document.body.classList.remove('has-anchor-ad');
        sessionStorage.setItem('kanz_anchor_closed', '1');
      });
    }, KANZ_CONFIG.ads.anchorDelayMs);
  }
};

/** سادہ استعمال کے لیے مختصر نام */
function adUnit(slotKey, minHeight = 250, style = '') {
  return AdEngine.unit(slotKey, { minHeight, style });
}

/* ============================================================
   1. STATE
   ============================================================ */
const State = {
  data:          null,   // content.json
  archives:      [],     // list of loaded archive JSONs
  view:          'home', // 'home'|'list'|'article'|'search'
  activeCat:     null,
  activeSubcat:  null,
  activeArticle: null,
  searchQuery:   '',
  searchResults: [],
  audienceFilter:'all',  // 'all'|'kids'|'students'|'adults'|'professionals'|'scholars'
  bookmarks:     [],     // article IDs saved by user
};

/* ============================================================
   2. DATA LAYER — with multi-archive support
   ============================================================ */
async function loadData() {
  try {
    // ① ہمیشہ پہلے data/content.json (یہی مستند ذریعہ ہے)
    const res = await fetch(KANZ_CONFIG.dataPath, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    State.data = await res.json();
    await loadArchives();
  } catch (e) {
    // ② ناکامی پر ہی embedded fallback (file:// یا آف لائن)
    if (window.__KANZ_DATA__) {
      State.data = window.__KANZ_DATA__;
      console.warn('[کنز العلم] content.json نہیں ملا — fallback ڈیٹا استعمال ہو رہا ہے۔', e.message);
    } else {
      const el = document.getElementById('main-content');
      if (el) el.innerHTML =
        `<p class="load-error">ڈیٹا لوڈ نہیں ہوا۔ براہِ کرم صفحہ تازہ کریں۔<br><small>${escapeHTML(e.message)}</small></p>`;
      return;
    }
  }
  init();
}

async function loadArchives() {
  let i = 1;
  const MAX_ARCHIVES = 50;          // حفاظتی حد — لامتناہی لوپ سے بچاؤ
  while (i <= MAX_ARCHIVES) {
    try {
      const r = await fetch(`/articles/ur/data/archive_${i}.json`);
      // Cloudflare SPA fallback 404 کو index.html (200/text/html) بنا دیتا ہے
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) break;
      const arch = await r.json();
      if (arch.articles) {
        // Merge archive articles into State.data.articles
        State.data.articles = [...State.data.articles, ...arch.articles];
        State.archives.push(`archive_${i}.json`);
      }
      i++;
    } catch { break; }
  }
}

/* ============================================================
   2-B. اشاعتی فلٹر  ·  🔴 اہم سیکیورٹی
   ────────────────────────────────────────────────────────────
   ایڈمن پینل 'draft' اور 'scheduled' مضامین بھی content.json
   میں لکھتا ہے۔ پہلے یہ عوامی فہرست، تلاش اور براہِ راست لنک
   سے قابلِ رسائی تھے۔ اب ہر عوامی راستہ اسی فلٹر سے گزرتا ہے۔
   ============================================================ */
function isPublic(a) {
  if (!a) return false;
  const st = a.status || 'published';
  if (st === 'draft' || st === 'archived' || st === 'private') return false;
  if (st === 'scheduled') {
    if (!a.scheduledAt) return false;
    const t = new Date(a.scheduledAt).getTime();
    if (!isFinite(t) || t > Date.now()) return false;   // وقت ابھی نہیں آیا
  }
  if (a.date) {                                          // مستقبل کی تاریخ
    const d = new Date(a.date).getTime();
    if (isFinite(d) && d > Date.now() + 864e5) return false;
  }
  return true;
}

/** صرف شائع شدہ مضامین — ہر عوامی view یہی استعمال کرے */
const publicArticles = () => (State.data?.articles || []).filter(isPublic);

/* Data accessors */
const getCat      = id => State.data.categories.find(c => c.id === id) || null;
const getSubcat   = (catId, scId) => {
  const c = getCat(catId);
  return c ? c.subcategories.find(s => s.id === scId) || null : null;
};
const getArticlesBySubcat = scId =>
  publicArticles().filter(a => a.subcategoryId === scId);
const getArticleById = id =>
  publicArticles().find(a => a.id === id) || null;

function searchArticles(query) {
  if (!query.trim()) return [];
  return publicArticles().filter(a =>
    a.title.includes(query) ||
    (a.summary && a.summary.includes(query)) ||
    (a.tags && a.tags.some(t => t.includes(query)))
  );
}

function getFilteredCategories() {
  if (State.audienceFilter === 'all') return State.data.categories;
  return State.data.categories.filter(c =>
    !c.audience || c.audience.includes(State.audienceFilter)
  );
}

/* ============================================================
   3. SEO — update meta tags per route
   ============================================================ */
const ROBOTS_DEFAULT = 'index, follow, max-snippet:-1, max-image-preview:large';

function updateSEO({ title, description, url, noindex }) {
  const siteName = State.data?.site?.name || 'کنز العلم';
  document.title = title ? `${title} — ${siteName}` : siteName;

  // ⭐ canonical ہمیشہ صاف پتہ — BASE_PATH صرف شروع سے ہٹے
  const relPath = (BASE_PATH && location.pathname.indexOf(BASE_PATH) === 0)
    ? location.pathname.slice(BASE_PATH.length) : location.pathname;
  const canonical = url || absUrl(relPath || '/');

  setMeta('description', description || State.data?.site?.tagline || '');
  setMeta('og:title', document.title);
  setMeta('og:description', description || '');
  setMeta('og:url', canonical);
  setMeta('robots', noindex ? 'noindex, follow' : ROBOTS_DEFAULT);

  // Canonical link
  let canon = document.getElementById('seo-canonical');
  if (!canon) {
    canon = document.createElement('link');
    canon.id = 'seo-canonical'; canon.rel = 'canonical';
    document.head.appendChild(canon);
  }
  canon.href = canonical;
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"],meta[property="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/* ============================================================
   4. ROUTER — صاف URL (History API)  ⭐ نیا
   ────────────────────────────────────────────────────────────
   kanzulilm.com/articles/                 → صفحہ اول
   kanzulilm.com/articles/{slug}           → مضمون          ⭐
   kanzulilm.com/articles/{cat}/{subcat}   → موضوع کی فہرست
   kanzulilm.com/articles/bookmarks        → محفوظ شدہ
   kanzulilm.com/articles/search?q=…       → تلاش

   ⚠️ پرانے  #/cat/subcat/id  لنک خودکار طور پر نئے صاف پتے پر
      منتقل ہو جاتے ہیں (migrateLegacyHash) — کوئی لنک نہیں ٹوٹتا۔
   ============================================================ */

/** سائٹ کی بنیاد — عام طور پر '/articles' */
const BASE_PATH = (function () {
  var raw = (typeof window.KANZ_BASE_PATH === 'string')
    ? window.KANZ_BASE_PATH : KANZ_CONFIG.basePath;
  raw = String(raw == null ? '' : raw).trim().replace(/\/+$/, '');
  if (raw && raw.charAt(0) !== '/') raw = '/' + raw;

  var here = location.pathname;

  // ① مقررہ بنیاد پہلے ہی پتے میں موجود ہے → وہی
  if (raw && (here === raw || here.indexOf(raw + '/') === 0)) return raw;

  // ② مقامی پیش نظارہ (file:// یا localhost) → index.html کی اپنی ڈائریکٹری
  if (location.protocol === 'file:' ||
      /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname))
    return here.replace(/\/[^/]*$/, '');

  // ③ ورنہ مقررہ بنیاد
  return raw;
})();

/** اندرونی راستہ → مکمل pathname  ('/art-001' → '/articles/art-001') */
function basedPath(p) {
  p = '/' + String(p == null ? '' : p).replace(/^\/+/, '');
  return (BASE_PATH + p).replace(/\/{2,}/g, '/') || '/';
}

/** canonical کی بنیاد — رن ٹائم BASE_PATH نہیں بلکہ *مقررہ* پروڈکشن بنیاد،
    تاکہ localhost/file:// پیش نظارہ میں بھی canonical درست نکلے */
const CANON_BASE = (function () {
  var b = String(KANZ_CONFIG.basePath == null ? '' : KANZ_CONFIG.basePath)
            .trim().replace(/\/+$/, '');
  if (b && b.charAt(0) !== '/') b = '/' + b;
  return b;
})();

/** مطلق canonical پتہ — ہمیشہ اصل ڈومین + اصل بنیاد پر */
function absUrl(p) {
  var origin = (KANZ_CONFIG.siteOrigin || location.origin).replace(/\/+$/, '');
  p = '/' + String(p == null ? '' : p).replace(/^\/+/, '');
  return origin + ((CANON_BASE + p).replace(/\/{2,}/g, '/') || '/');
}

/* ── slug ── (slug موجود نہ ہو تو id ہی slug ہے) */
const articleSlug = a => String((a && (a.slug || a.id)) || '');
const getArticleBySlug = s => {
  if (!s) return null;
  const key = String(s), list = publicArticles();
  return list.find(a => a.slug && a.slug === key) ||
         list.find(a => a.id === key) || null;
};

/* ── راستے بنانے والے (بنیاد کے بغیر) ── */
const routeSubcat  = (c, s) => '/' + encodeURIComponent(c) + '/' + encodeURIComponent(s);
const routeArticle = a      => '/' + encodeURIComponent(articleSlug(a));

/* ── مکمل URL بنانے والے (href کے لیے) ── */
const urlHome    = ()     => basedPath('/');
const urlSubcat  = (c, s) => basedPath(routeSubcat(c, s));
const urlArticle = a      => basedPath(routeArticle(a));

/** موجودہ pathname کے حصے — بنیاد ہٹا کر */
function parseRoute() {
  var p = location.pathname;
  if (BASE_PATH && p.indexOf(BASE_PATH) === 0) p = p.slice(BASE_PATH.length);
  return p.split('/').filter(Boolean).map(function (s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  });
}

/** راستہ بدلیں — path بنیاد کے بغیر دیں، مثلاً navigate('/art-001') */
function navigate(path, replace) {
  var url = basedPath(path);
  if (location.pathname + location.search === url) { handleRoute(); return; }
  try {
    if (replace) history.replaceState({}, '', url);
    else         history.pushState({}, '', url);
  } catch (e) { location.href = url; return; }
  handleRoute();
}
window.navigate = navigate; // global for inline handlers

/** اندرونی لنکس (a[data-route]) — صفحہ دوبارہ لوڈ کیے بغیر */
function initRouteLinks() {
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = (e.target && e.target.closest) ? e.target.closest('a[data-route]') : null;
    if (!a || a.hasAttribute('download')) return;
    if (a.target && a.target !== '' && a.target !== '_self') return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) !== '/') return;               // صرف اندرونی مطلق راستے
    e.preventDefault();
    var rest = (BASE_PATH && href.indexOf(BASE_PATH) === 0)
      ? href.slice(BASE_PATH.length) : href;
    navigate(rest || '/');
    closeMobile();
  });
  window.addEventListener('popstate', handleRoute);
}

/** پرانے #/cat/subcat/id لنک → نیا صاف پتہ (صرف ایک بار، بوٹ پر) */
function migrateLegacyHash() {
  var h = location.hash || '';
  if (h.length < 2 || h.charAt(1) !== '/') return;
  var parts = h.slice(2).split('/').filter(Boolean).map(function (s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  });
  var target;
  if (!parts.length)                 target = '/';
  else if (parts[0] === 'bookmarks') target = '/bookmarks';
  else if (parts.length >= 3) {
    var art = getArticleBySlug(parts[2]);
    target = art ? routeArticle(art) : routeSubcat(parts[0], parts[1]);
  }
  else if (parts.length === 2)       target = routeSubcat(parts[0], parts[1]);
  else                               target = '/' + encodeURIComponent(parts[0]);
  try { history.replaceState({}, '', basedPath(target)); } catch (e) {}
}

function handleRoute() {
  if (!State.data) return;
  const parts = parseRoute();

  /* ── محفوظ شدہ مضامین ── */
  if (parts.length === 1 && parts[0] === 'bookmarks') {
    State.view = 'bookmarks';
    State.activeCat = null; State.activeSubcat = null; State.activeArticle = null;
    updateSEO({ title: 'محفوظ شدہ مضامین', url: absUrl('/bookmarks'), noindex: true });
    renderAll();
    return;
  }

  /* ── تلاش ── /articles/search?q=… */
  if (parts.length === 1 && parts[0] === 'search') {
    let q = '';
    try { q = new URLSearchParams(location.search).get('q') || ''; } catch (e) {}
    q = q.trim();
    if (!q) { navigate('/', true); return; }
    const box = document.getElementById('search-input');
    if (box && box.value !== q) box.value = q;
    State.view = 'search';
    State.searchQuery = q;
    State.searchResults = searchArticles(q);
    State.activeArticle = null;
    updateSEO({ title: 'تلاش: ' + q, url: absUrl('/search'), noindex: true });
    renderAll();
    return;
  }

  /* ── پرانی شکل /cat/subcat/slug → مختصر /slug پر منتقل ── */
  if (parts.length >= 3) {
    const legacy = getArticleBySlug(parts[2]);
    if (legacy) { navigate(routeArticle(legacy), true); return; }
  }

  /* ── ⭐ مضمون: /articles/{slug} ── */
  if (parts.length === 1) {
    const art = getArticleBySlug(parts[0]);
    if (art) {
      const cs = findCatSubcat(art);
      State.view = 'article';
      State.activeCat = cs.cat; State.activeSubcat = cs.subcat;
      State.activeArticle = art;
      updateSEO({ title: art.title, description: art.summary,
                  url: absUrl(routeArticle(art)) });
      renderAll();
      return;
    }
    // زمرہ کا نام دیا گیا → اُس کے پہلے ذیلی موضوع پر
    const c1 = getCat(parts[0]);
    if (c1 && c1.subcategories && c1.subcategories.length) {
      navigate(routeSubcat(c1.id, c1.subcategories[0].id), true);
      return;
    }
  }

  /* ── فہرست: /articles/{cat}/{subcat} ── */
  if (parts.length === 2) {
    const sc = getSubcat(parts[0], parts[1]);
    if (sc) {
      State.view = 'list';
      State.activeCat = parts[0]; State.activeSubcat = parts[1];
      State.activeArticle = null;
      updateSEO({ title: sc.title,
                  description: sc.title + ' — ' + (getCat(parts[0])?.title || ''),
                  url: absUrl(routeSubcat(parts[0], parts[1])) });
      renderAll();
      return;
    }
  }

  /* ── کچھ نہ ملا → صفحہ اول ── */
  if (parts.length) { navigate('/', true); return; }

  State.view = 'home';
  State.activeCat = null; State.activeSubcat = null; State.activeArticle = null;
  updateSEO({ url: absUrl('/') });
  renderAll();
}

/* ============================================================
   5. SIDEBAR
   ============================================================ */
function renderSidebar() {
  const container = document.getElementById('sidebar-categories');
  if (!container || !State.data) return;

  const cats = getFilteredCategories();

  container.innerHTML = cats.map(cat => {
    const isOpen = cat.id === State.activeCat;
    const counts = {};
    cat.subcategories.forEach(sc => { counts[sc.id] = getArticlesBySubcat(sc.id).length; });
    const total = Object.values(counts).reduce((s, n) => s + n, 0);

    const subcatsHTML = cat.subcategories.map(sc => {
      const active = sc.id === State.activeSubcat;
      return `<div class="subcat-item ${active ? 'active' : ''}"
                   data-cat="${cat.id}" data-subcat="${sc.id}"
                   role="menuitem" tabindex="0" aria-selected="${active}">
                <span class="subcat-dot"></span>
                <span class="subcat-title">${sc.title}</span>
                <span class="subcat-count">${counts[sc.id]}</span>
              </div>`;
    }).join('');

    return `<div class="cat-group ${isOpen ? 'open' : ''}" data-cat-id="${cat.id}">
      <button class="cat-header ${isOpen ? 'active' : ''}"
              aria-expanded="${isOpen}">
        <span class="cat-chevron">▼</span>
        <span class="cat-count">${total}</span>
        <div class="cat-header-right">
          <span class="cat-title">${cat.title}</span>
          <span class="cat-icon">${cat.icon}</span>
        </div>
      </button>
      <div class="subcat-list" role="menu">${subcatsHTML}</div>
    </div>`;
  }).join('');

  // Category toggle
  container.querySelectorAll('.cat-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const grp = btn.closest('.cat-group');
      const wasOpen = grp.classList.contains('open');
      container.querySelectorAll('.cat-group').forEach(g => {
        g.classList.remove('open');
        g.querySelector('.cat-header').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        grp.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Subcategory click
  container.querySelectorAll('.subcat-item').forEach(item => {
    const go = () => { navigate(routeSubcat(item.dataset.cat, item.dataset.subcat)); closeMobile(); };
    item.addEventListener('click', go);
    item.addEventListener('keydown', e => e.key === 'Enter' && go());
  });
}

/* ============================================================
   6. MAIN CONTENT RENDERERS
   ============================================================ */
function renderMain() {
  const el = document.getElementById('main-content');
  if (!el) return;
  AdEngine.reset();                 // ہر صفحے کی اشتہاری گنتی نئی
  switch (State.view) {
    case 'home':      el.innerHTML = renderHome();      break;
    case 'list':      el.innerHTML = renderList();      bindListEvents(el); break;
    case 'article':   el.innerHTML = renderArticle();   bindArticleEvents(el); break;
    case 'search':    el.innerHTML = renderSearch();    bindListEvents(el); break;
    case 'bookmarks': el.innerHTML = renderBookmarks(); bindListEvents(el); break;
  }
  el.scrollTop = 0; window.scrollTo(0, 0);
  AdEngine.activate(el);            // lazy observers لگائیں
  initReveal(el);                   // ظاہر ہونے کی animation
}

/* ── Home ── */
function renderHome() {
  const total   = publicArticles().length;
  const catCount = getFilteredCategories().length;
  const scCount  = getFilteredCategories().reduce((s, c) => s + c.subcategories.length, 0);
  const archiveNote = State.archives.length
    ? `<div class="archive-banner">📦 ${State.archives.length} آرکائیو فائل بھی لوڈ ہے — مجموعی مضامین: ${total}</div>`
    : '';

  return `${archiveNote}
    <div class="home-hero">
      <div class="home-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
      <div class="gold-divider"></div>
      <h1 class="home-title">کنز العلم میں خوش آمدید</h1>
      <p class="home-desc">
        یہ ایک بین الاقوامی علمی و تحقیقی مرکز ہے جہاں قرآن و حدیث، سماجی علوم،
        تجارت، سائنس اور عمومی معلومات پر مستند مواد دستیاب ہے۔
      </p>
      <div class="gold-divider"></div>
      <div class="home-stats">
        <div class="home-stat">
          <div class="home-stat-num">${total}+</div>
          <div class="home-stat-label">مضامین</div>
        </div>
        <div class="home-stat">
          <div class="home-stat-num">${catCount}</div>
          <div class="home-stat-label">شعبہ جات</div>
        </div>
        <div class="home-stat">
          <div class="home-stat-num">${scCount}</div>
          <div class="home-stat-label">ذیلی موضوعات</div>
        </div>
      </div>
    </div>
    ${AdEngine.unit('homeRect', { cls: 'ad-home-rect', minHeight: 280 })}
    <div class="arabic-divider">۞ ۞ ۞</div>
    ${AdEngine.unit('multiplex', { cls: 'ad-multiplex', minHeight: 320, format: 'autorelaxed' })}`;
}

/* ── Article List ── */
function renderList() {
  const cat   = getCat(State.activeCat);
  const subcat = getSubcat(State.activeCat, State.activeSubcat);
  const arts  = getArticlesBySubcat(State.activeSubcat);

  if (!cat || !subcat) return `<p class="no-results">زمرہ نہیں ملا۔</p>`;

  const breadcrumb = `<nav class="breadcrumb" aria-label="breadcrumb">
    <a class="breadcrumb-item" href="${urlHome()}" data-route>صفحہ اول</a>
    <span class="breadcrumb-sep">◂</span>
    <span class="breadcrumb-item">${cat.title}</span>
    <span class="breadcrumb-sep">◂</span>
    <span>${subcat.title}</span>
  </nav>`;

  const header = `<div class="section-header">
    <h2 class="section-title">${subcat.title}</h2>
    <span class="section-subtitle">${arts.length} مضامین</span>
  </div>`;

  if (!arts.length) return breadcrumb + header +
    `<div class="no-results">اس موضوع میں ابھی مضامین شامل نہیں ہیں۔</div>`;

  const cards = arts.map(a => `
    <a class="article-card reveal" href="${urlArticle(a)}" data-route data-article-id="${a.id}">
      <div class="article-card-left">
        <span class="ac-badge">${a.type || 'مضمون'}</span>
        ${a.hasPdf
          ? `<span class="ac-pdf-btn" role="button" tabindex="0" data-pdf-id="${a.id}">📄 PDF</span>`
          : ''}
      </div>
      <div class="ac-body">
        <div class="ac-title">${a.title}</div>
        ${a.summary ? `<div class="ac-summary">${a.summary}</div>` : ''}
        <div class="ac-meta">
          <span class="ac-tag">✍️ ${a.author}</span>
          <span>${formatDate(a.date)}</span>
        </div>
      </div>
      <span class="ac-arrow">◀</span>
    </a>`);

  // ⭐ کارڈوں کے درمیان In-feed اشتہار
  const items = AdEngine.injectIntoFeed(cards, arts.length);

  return breadcrumb + header +
    `<div class="article-list" role="list">${items}</div>
     ${AdEngine.unit('afterArticle', { cls: 'ad-list-bottom', minHeight: 280 })}
     ${AdEngine.unit('multiplex', { cls: 'ad-multiplex', minHeight: 320, format: 'autorelaxed' })}`;
}

/* ── Article Reader ── */
function renderArticle() {
  const a     = State.activeArticle;
  const cat   = getCat(State.activeCat);
  const subcat = getSubcat(State.activeCat, State.activeSubcat);

  const breadcrumb = `<nav class="breadcrumb">
    <a class="breadcrumb-item" href="${urlHome()}" data-route>صفحہ اول</a>
    <span class="breadcrumb-sep">◂</span>
    <a class="breadcrumb-item" href="${urlSubcat(State.activeCat, State.activeSubcat)}" data-route>${subcat?.title || ''}</a>
    <span class="breadcrumb-sep">◂</span>
    <span>مضمون</span>
  </nav>`;

  const tags = (a.tags || []).map(t => `<span class="ar-tag">${t}</span>`).join('');
  const pdfCTA = a.hasPdf
    ? `<button class="ar-pdf-cta" onclick="downloadPdf('${a.id}')">📄 PDF ڈاؤنلوڈ کریں</button>`
    : '';

  // Reading time + word count (متن پہلے نکالیں تاکہ نیچے دستیاب ہو)
  let plainText = a.body || '';
  if (a.bodyHtml) {
    const _t = document.createElement('div');
    _t.innerHTML = a.bodyHtml;
    plainText = _t.textContent || _t.innerText || a.body || '';
  }
  const readMins   = calcReadingTime(plainText);
  const updatedStr = a.updatedAt ? formatUpdatedAt(a.updatedAt) : '';

  // Build body HTML — TOC first, then automatic in-article ads
  let tocHTML = '';
  let finalBodyHTML = '';

  if (a.bodyHtml) {
    // Step 0: مرکزی ٹیمپلیٹ کے مطابق صاف کریں (inline styles → کلاسیں)
    const cleanHtml = normalizeArticleHTML(a.bodyHtml);
    // Step 1: Generate TOC (IDs are added to headings in processedContent)
    const tocResult = generateTOC(cleanHtml);
    const baseHTML = tocResult && tocResult.tocHTML
      ? (tocHTML = tocResult.tocHTML, tocResult.processedContent)
      : cleanHtml;

    // Step 2: ⭐ خودکار in-article اشتہار (ہر N پیراگراف، الفاظ کی گنتی کے ساتھ)
    finalBodyHTML = AdEngine.injectIntoArticle(baseHTML);
  } else {
    // سادہ متن — پہلے <p> بنائیں، پھر وہی انجن چلائیں
    const plain = (a.body || '').split('\n\n')
      .filter(t => t.trim())
      .map(para => `<p>${escapeHTML(para)}</p>`).join('');
    finalBodyHTML = AdEngine.injectIntoArticle(plain);
  }

  // فونٹ اب inline style نہیں — ٹیمپلیٹ کلاس سے آتا ہے
  const fontCls = fontClassFor(a.editorFont);

  // SEO per article
  if (a.seo) applyArticleSEO(a);


  // Footnotes + Citations
  const citDB = State.data?.citation_database || [];
  const footnotesHTML = renderFootnotes(a.footnotes, citDB);
  const citationsHTML = renderCitations(a.citations, citDB);

  // PDF & Print buttons
  const printBtn = `<button class="ar-pdf-cta" onclick="printArticle()" style="background:var(--c-accent);margin-right:.5rem">🖨️ Print / PDF</button>`;
  const pdfBtn   = a.hasPdf
    ? `<button class="ar-pdf-cta" onclick="downloadPdf('${a.id}')">📄 PDF ڈاؤنلوڈ کریں</button>`
    : '';

  // Bookmark button
  loadBookmarks();
  const bkMarked = isBookmarked(a.id);
  const bookmarkBtn = `<button id="bookmark-btn-${a.id}" class="ar-pdf-cta ${bkMarked ? 'bookmarked' : ''}"
    onclick="toggleBookmark('${a.id}')"
    style="background:${bkMarked ? 'var(--c-gold)' : 'var(--c-primary-light)'};color:${bkMarked ? '#fff' : 'var(--c-primary)'};border:1.5px solid var(--c-gold);">
    ${bkMarked ? '🔖 محفوظ شدہ' : '🔖 محفوظ کریں'}
  </button>`;

  // AI Summary button
  const aiSummaryBtn = `
    <button id="ai-summary-btn" class="ar-pdf-cta"
      style="background:linear-gradient(135deg,#1a4731,#2d6a4f);margin-right:.5rem"
      onclick="generateAISummary('${a.id}')">
      ✨ AI خلاصہ
    </button>
    <div id="ai-summary-box" class="ai-summary-box" style="display:none;margin-top:.75rem"></div>
  `;

  // Share buttons
  const articleUrl = encodeURIComponent(absUrl(routeArticle(a)));
  const articleTitle = encodeURIComponent(a.title);
  const shareHTML = `
    <div class="ar-share-bar">
      <span class="ar-share-label">📤 شیئر کریں:</span>
      <a class="ar-share-btn ar-share-wa"
         href="https://wa.me/?text=${articleTitle}%20${articleUrl}"
         target="_blank" rel="noopener" title="WhatsApp">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.862L.054 23.7a.75.75 0 0 0 .916.932l5.978-1.57A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.879 0-3.638-.5-5.158-1.375l-.37-.22-3.544.93.947-3.458-.242-.38A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        WhatsApp
      </a>
      <a class="ar-share-btn ar-share-fb"
         href="https://www.facebook.com/sharer/sharer.php?u=${articleUrl}"
         target="_blank" rel="noopener" title="Facebook">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Facebook
      </a>
      <a class="ar-share-btn ar-share-tw"
         href="https://twitter.com/intent/tweet?text=${articleTitle}&url=${articleUrl}"
         target="_blank" rel="noopener" title="Twitter / X">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        X
      </a>
      <a class="ar-share-btn ar-share-tg"
         href="https://t.me/share/url?url=${articleUrl}&text=${articleTitle}"
         target="_blank" rel="noopener" title="Telegram">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        Telegram
      </a>
      <button class="ar-share-btn ar-share-copy" onclick="copyArticleLink()" title="لنک کاپی کریں">
        🔗 لنک
      </button>
    </div>`;

  // ⭐ اشتہاری جگہیں
  const adUnderTitle   = AdEngine.unit('underTitle',   { cls: 'ad-under-title',   minHeight: 100 });
  const adAfterArticle = AdEngine.unit('afterArticle', { cls: 'ad-after-article', minHeight: 280 });
  const adMultiplex    = AdEngine.unit('multiplex',    { cls: 'ad-multiplex', minHeight: 320, format: 'autorelaxed' });
  const adSidebar      = AdEngine.unit('sidebar',      { cls: 'ad-sidebar', minHeight: 600, style: 'min-width:300px;', format: 'vertical', fullWidth: false });

  return `${breadcrumb}
    <button class="btn-back" id="btn-back">◀ واپس فہرست پر</button>

    <div class="ar-layout-wrap">
      <article class="article-reader" dir="rtl"
               itemscope itemtype="https://schema.org/Article">
        <div class="ar-accent-bar"></div>
        <div class="ar-eyebrow" itemprop="articleSection">
          ${cat?.icon || ''} ${cat?.title || ''} — ${subcat?.title || ''}
        </div>
        <h1 class="ar-title" itemprop="headline">${a.title}</h1>
        <div class="ar-meta">
          <span class="ar-meta-item" itemprop="author">✍️ ${a.author}</span>
          <span class="ar-meta-item">📅 <time itemprop="datePublished" datetime="${a.date}">${formatDate(a.date)}</time></span>
          <span class="ar-meta-item">🔖 ${subcat?.title || ''}</span>
        </div>
        <div class="ar-reading-bar">
          <span>⏱️ پڑھنے کا وقت: ${readMins} منٹ</span>
          ${updatedStr ? `<span>🔄 آخری اپ ڈیٹ: ${updatedStr}</span>` : ''}
          <span>📝 ${countWords(plainText)} الفاظ</span>
        </div>
        ${a.featuredImg ? `<img class="ar-featured-img" src="${escapeHTML(a.featuredImg)}"
             alt="${escapeHTML(a.title)}" loading="lazy" itemprop="image"
             onerror="this.style.display='none'">` : ''}
        ${tocHTML}
        ${adUnderTitle}
        <div class="ar-body${a.bodyHtml ? '' : ' plain-text'}${fontCls}" itemprop="articleBody">${finalBodyHTML}</div>
        <div class="ar-tags">${tags}</div>
        ${shareHTML}
        <div style="margin-top:var(--sp-4);display:flex;gap:.5rem;flex-wrap:wrap">
          ${printBtn}${pdfBtn}
        </div>
        ${footnotesHTML}
        ${citationsHTML}
        <div style="margin-top:var(--sp-4);display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
          ${aiSummaryBtn}
          ${bookmarkBtn}
        </div>
        ${adAfterArticle}
        ${renderRelatedArticles(a)}
        ${adMultiplex}
      </article>

      ${adSidebar ? `<aside class="ar-sidebar-ad">
        <div class="ar-sidebar-ad-sticky">${adSidebar}</div>
      </aside>` : ''}
    </div>`;
}

/* ── Search Results ── */
function renderSearch() {
  const q   = State.searchQuery;
  const arts = State.searchResults;

  const header = `<div class="section-header">
    <h2 class="section-title">تلاش کے نتائج</h2>
    <span class="section-subtitle">«${q}» — ${arts.length} نتائج</span>
  </div>`;

  if (!arts.length) return header + `<div class="no-results">
    «${q}» کے لیے کوئی نتیجہ نہیں ملا۔<br>
    <small style="color:var(--c-muted)">مختلف الفاظ سے تلاش کریں۔</small>
  </div>`;

  const cards = arts.map(a => `
    <a class="article-card reveal" href="${urlArticle(a)}" data-route data-article-id="${a.id}">
      <div class="article-card-left">
        <span class="ac-badge">${a.type || 'مضمون'}</span>
        ${a.hasPdf ? `<span class="ac-pdf-btn" role="button" tabindex="0" data-pdf-id="${a.id}">📄 PDF</span>` : ''}
      </div>
      <div class="ac-body">
        <div class="ac-title">${highlightQuery(a.title, q)}</div>
        <div class="ac-meta">
          <span class="ac-tag">${getCatForArticle(a)}</span>
          <span>${a.author}</span>
          <span>${formatDate(a.date)}</span>
        </div>
      </div>
      <span class="ac-arrow">◀</span>
    </a>`);

  return header +
    AdEngine.unit('searchTop', { cls: 'ad-search-top', minHeight: 100 }) +
    `<div class="article-list" role="list">${AdEngine.injectIntoFeed(cards, arts.length)}</div>` +
    AdEngine.unit('multiplex', { cls: 'ad-multiplex', minHeight: 320, format: 'autorelaxed' });
}

/* ── Event binding ── */
function bindListEvents(container) {
  // کارڈ اب اصل <a href> ہیں — کلک/Enter خودکار طور پر روٹر سنبھالتا ہے
  // (a[data-route] ⇒ initRouteLinks)۔ صرف اندرونی PDF بٹن یہاں بائنڈ ہوتا ہے۔
  container.querySelectorAll('.ac-pdf-btn').forEach(btn => {
    const go = e => {
      e.preventDefault();          // کارڈ کے لنک کو کھلنے سے روکیں
      e.stopPropagation();
      downloadPdf(btn.dataset.pdfId);
    };
    btn.addEventListener('click', go);
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(e); });
  });
}

function bindArticleEvents(container) {
  container.querySelector('#btn-back')?.addEventListener('click', () =>
    navigate(routeSubcat(State.activeCat, State.activeSubcat))
  );
  // TOC انکر — hash router کو چھیڑے بغیر سکرول
  container.querySelectorAll('.toc-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById(link.dataset.target)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ============================================================
   7. PDF DOWNLOAD STUB
   ============================================================ */
window.downloadPdf = function(articleId) {
  // Replace this URL pattern with your actual PDF file locations:
  // e.g., https://your-r2-bucket.com/pdfs/{articleId}.pdf
  const pdfUrl = `/pdfs/${articleId}.pdf`;
  const a = document.createElement('a');
  a.href = pdfUrl; a.download = `${articleId}.pdf`;
  a.target = '_blank'; a.click();
};

/* ============================================================
   8. ARCHIVE AUTO-MANAGEMENT HELPER
   (Runs in admin context. On Cloudflare Pages, a GitHub Action
    or Worker would call this. Here we expose the logic for admin.)
   ============================================================ */
window.checkAndArchive = async function(articlesArray, thresholdMB = 20) {
  const sizeBytes = new Blob([JSON.stringify(articlesArray)]).size;
  const sizeMB    = sizeBytes / (1024 * 1024);

  if (sizeMB >= thresholdMB) {
    // Split: keep newest 100 articles in primary, archive the rest
    const toArchive = articlesArray.slice(0, articlesArray.length - 100);
    const toKeep    = articlesArray.slice(articlesArray.length - 100);

    return {
      shouldArchive: true,
      archiveData:   toArchive,
      keepData:      toKeep,
      sizeMB:        sizeMB.toFixed(2),
    };
  }
  return { shouldArchive: false, sizeMB: sizeMB.toFixed(2) };
};

/* ============================================================
   9-A. BOOKMARKS — localStorage based
   ============================================================ */
function loadBookmarks() {
  try {
    State.bookmarks = JSON.parse(localStorage.getItem('kanz_bookmarks') || '[]');
  } catch { State.bookmarks = []; }
}

function saveBookmarks() {
  localStorage.setItem('kanz_bookmarks', JSON.stringify(State.bookmarks));
}

window.toggleBookmark = function(articleId) {
  loadBookmarks();
  const idx = State.bookmarks.indexOf(articleId);
  if (idx === -1) {
    State.bookmarks.push(articleId);
    showToast('🔖 بُک مارک محفوظ ہو گیا!');
  } else {
    State.bookmarks.splice(idx, 1);
    showToast('🗑️ بُک مارک ہٹا دیا گیا');
  }
  saveBookmarks();
  // Update button icon in current view
  const btn = document.getElementById('bookmark-btn-' + articleId);
  if (btn) {
    const on = State.bookmarks.includes(articleId);
    btn.textContent = on ? '🔖 محفوظ شدہ' : '🔖 محفوظ کریں';
    btn.classList.toggle('bookmarked', on);
    btn.style.background = on ? 'var(--c-gold)' : 'var(--c-primary-light)';
    btn.style.color      = on ? '#fff' : 'var(--c-primary)';
  }
  // بُک مارک صفحہ کھلا ہو تو فوراً تازہ کریں
  if (State.view === 'bookmarks') renderMain();
};

function isBookmarked(articleId) {
  return State.bookmarks.includes(articleId);
}

/* ── Toast notification ── */
function showToast(msg) {
  let toast = document.getElementById('kanz-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'kanz-toast';
    toast.style.cssText = `
      position:fixed;bottom:6rem;right:1.5rem;z-index:9999;
      background:var(--c-accent);color:#fff;
      padding:.6rem 1.2rem;border-radius:8px;
      font-size:.85rem;font-family:var(--font-urdu);
      box-shadow:0 4px 18px rgba(0,0,0,.22);
      opacity:0;transition:opacity .25s;pointer-events:none;direction:rtl;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}

/* ── Bookmarks View ── */
function renderBookmarks() {
  loadBookmarks();
  const arts = State.bookmarks
    .map(id => getArticleById(id))     // فلٹر شدہ — غیر شائع شدہ بُک مارک نہیں کھلیں گے
    .filter(Boolean);

  const header = `<div class="section-header">
    <h2 class="section-title">🔖 محفوظ شدہ مضامین</h2>
    <span class="section-subtitle">${arts.length} مضامین</span>
  </div>`;

  if (!arts.length) return header + `<div class="no-results">
    ابھی کوئی مضمون محفوظ نہیں کیا گیا۔<br>
    <small style="color:var(--c-muted)">مضامین میں 🔖 بٹن دباکر محفوظ کریں۔</small>
  </div>`;

  const items = arts.map(a => `
    <a class="article-card reveal" href="${urlArticle(a)}" data-route data-article-id="${a.id}">
      <div class="article-card-left">
        <span class="ac-badge">${a.type || 'مضمون'}</span>
        ${a.hasPdf ? `<span class="ac-pdf-btn" role="button" tabindex="0" data-pdf-id="${a.id}">📄 PDF</span>` : ''}
      </div>
      <div class="ac-body">
        <div class="ac-title">${a.title}</div>
        ${a.summary ? `<div class="ac-summary">${a.summary}</div>` : ''}
        <div class="ac-meta">
          <span class="ac-tag">✍️ ${a.author}</span>
          <span>${formatDate(a.date)}</span>
          <span role="button" tabindex="0" onclick="event.preventDefault();event.stopPropagation();toggleBookmark('${a.id}')" style="background:none;border:none;color:var(--c-primary);cursor:pointer;font-size:.78rem;font-family:var(--font-urdu)">🗑️ ہٹائیں</span>
        </div>
      </div>
      <span class="ac-arrow">◀</span>
    </a>`).join('');

  return header + `<div class="article-list" role="list">${items}</div>`;
}

/* ============================================================
   9-B. AI SUMMARY — Anthropic API
   ============================================================ */
window.generateAISummary = async function(articleId) {
  const art = getArticleById(articleId);
  if (!art) return;

  const btn = document.getElementById('ai-summary-btn');
  const box = document.getElementById('ai-summary-box');
  if (!btn || !box) return;

  btn.disabled = true;
  btn.textContent = '⏳ AI سوچ رہا ہے...';
  box.style.display = 'block';
  box.innerHTML = `<div class="ai-summary-loading">
    <div class="ai-spinner"></div>
    <span>AI خلاصہ تیار ہو رہا ہے...</span>
  </div>`;

  // Get plain text from article
  let plainText = art.body || '';
  if (art.bodyHtml) {
    const tmp = document.createElement('div');
    tmp.innerHTML = art.bodyHtml;
    plainText = tmp.textContent || tmp.innerText || art.body || '';
  }
  // Trim to ~2000 chars for API
  const excerpt = plainText.trim().slice(0, 2000);

  // ⭐ ① براؤزر کیش — وہی صارف دوبارہ کھولے تو صفر نیٹ ورک کال
  const ck = 'kanz_sum_' + articleId;
  try {
    const hit = JSON.parse(localStorage.getItem(ck) || 'null');
    if (hit && Date.now() - hit.t < 30 * 864e5) {   // 30 دن
      showSummary(box, btn, hit.s);
      return;
    }
  } catch {}

  try {
    // ⭐ ② Edge کیش — Function خود Cloudflare کیش سے جواب دیتی ہے
    const response = await fetch(KANZ_CONFIG.aiSummaryEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: art.title,
        prompt: `آپ ایک علمی مضمون کا اردو میں مختصر خلاصہ لکھیں۔
مضمون کا عنوان: "${art.title}"
مضمون کا متن:
${excerpt}

ہدایات:
- خلاصہ 3 سے 5 جملوں میں ہو
- آسان اردو میں ہو
- اہم نکات شامل ہوں
- صرف خلاصہ لکھیں، کوئی مقدمہ نہیں`
      })
    });

    if (!response.ok) throw new Error('API error: ' + response.status);
    const data = await response.json();
    const summary = data.summary || data.content?.[0]?.text || 'خلاصہ دستیاب نہیں۔';
    try { localStorage.setItem(ck, JSON.stringify({ s: summary, t: Date.now() })); } catch {}
    showSummary(box, btn, summary);
  } catch (err) {
    box.innerHTML = `<div style="color:#8b1a1a;padding:.75rem;font-size:.85rem">⚠️ خلاصہ نہیں بن سکا۔ براہِ کرم دوبارہ کوشش کریں۔<br><small style="opacity:.6">${err.message}</small></div>`;
    btn.textContent = '✨ AI خلاصہ';
    btn.disabled = false;
  }
};

/** خلاصہ باکس رینڈر کرتا ہے (کیش اور تازہ، دونوں کے لیے) */
function showSummary(box, btn, summary) {
  box.style.display = 'block';
  box.innerHTML = `
    <div class="ai-summary-header">
      <span class="ai-badge">✨ AI خلاصہ</span>
      <button type="button" class="ai-summary-close" aria-label="بند کریں">✕</button>
    </div>
    <div class="ai-summary-text" dir="rtl">${escapeHTML(summary)}</div>
    <div class="ai-summary-note">🤖 یہ خلاصہ AI نے تیار کیا ہے — تصدیق اصل مضمون سے کریں</div>`;
  box.querySelector('.ai-summary-close')?.addEventListener('click', () => {
    box.style.display = 'none';
  });
  btn.textContent = '✅ خلاصہ دیکھیں';
  btn.disabled = false;
  btn.onclick = () => { box.style.display = box.style.display === 'none' ? 'block' : 'none'; };
}

/* ============================================================
   9-C. RELATED ARTICLES
   ============================================================ */
function getRelatedArticles(article, limit = 4) {
  if (!article || !State.data) return [];
  const allArts = publicArticles().filter(a => a.id !== article.id);

  // Score by: same subcategory (3pts), same category (2pts), shared tags (1pt each)
  const { cat: artCat } = findCatSubcat(article);
  const artTags = article.tags || [];

  return allArts
    .map(a => {
      let score = 0;
      if (a.subcategoryId === article.subcategoryId) score += 3;
      else {
        const { cat: aC } = findCatSubcat(a);
        if (aC === artCat) score += 2;
      }
      const sharedTags = (a.tags || []).filter(t => artTags.includes(t));
      score += sharedTags.length;
      return { art: a, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.art);
}

function renderRelatedArticles(article) {
  const related = getRelatedArticles(article);
  if (!related.length) return '';

  const items = related.map(a => {
    return `<a class="related-card" href="${urlArticle(a)}" data-route>
      <div class="related-card-title">${a.title}</div>
      <div class="related-card-meta">
        <span>✍️ ${a.author}</span>
        <span>${formatDate(a.date)}</span>
      </div>
    </a>`;
  }).join('');

  return `<div class="ar-related">
    <div class="ar-related-title">📚 یہ بھی پڑھیں</div>
    <div class="related-grid">${items}</div>
  </div>`;
}

/* ============================================================
   9-D. SEARCH
   ============================================================ */
let _preSearchUrl = null;

/** تلاش بند کریں → جہاں سے آئے تھے وہیں واپس */
function clearSearch() {
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  State.searchQuery = ''; State.searchResults = [];
  const back = _preSearchUrl || basedPath('/');
  _preSearchUrl = null;
  try { history.replaceState({}, '', back); } catch (e) {}
  handleRoute();
}

function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim();
      if (!q) { clearSearch(); return; }       // خالی تلاش → واپس

      // پہلی بار تلاش شروع ہوئی → موجودہ پتہ یاد رکھیں
      if (State.view !== 'search') _preSearchUrl = location.pathname + location.search;

      // ⭐ تلاش کا اپنا صاف پتہ — /articles/search?q=…
      try {
        history.replaceState({}, '', basedPath('/search') + '?q=' + encodeURIComponent(q));
      } catch (e) {}

      State.view = 'search';
      State.searchQuery = q;
      State.searchResults = searchArticles(q);
      State.activeArticle = null;
      updateSEO({ title: `تلاش: ${q}`, url: absUrl('/search'), noindex: true });
      renderMain();
    }, 300);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') clearSearch();
  });
}

/* ============================================================
   10. AUDIENCE FILTER
   ============================================================ */
function initAudienceFilter() {
  const sel = document.getElementById('audience-filter');
  if (!sel) return;
  sel.addEventListener('change', () => {
    State.audienceFilter = sel.value;
    renderSidebar();
  });
}

/* ============================================================
   11. MOBILE SIDEBAR
   ============================================================ */
function initMobile() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  toggle?.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  overlay?.addEventListener('click', closeMobile);
  // Escape سے سائڈبار بند
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobile(); });
}
function closeMobile() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
  document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'false');
}

/* ============================================================
   12. HELPERS
   ============================================================ */
function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('ur-PK',
      { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return d; }
}

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/** خالی متن پر 1 کے بجائے 0 لوٹاتا ہے */
function countWords(text) {
  const t = (text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

function highlightQuery(text, q) {
  if (!q) return text;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(safe, 'g'),
    m => `<mark class="search-highlight">${m}</mark>`);
}

function findCatSubcat(art) {
  for (const cat of State.data.categories)
    for (const sc of cat.subcategories)
      if (sc.id === art.subcategoryId)
        return { cat: cat.id, subcat: sc.id };
  return { cat: '', subcat: '' };
}

function getCatForArticle(art) {
  for (const cat of State.data.categories)
    for (const sc of cat.subcategories)
      if (sc.id === art.subcategoryId) return cat.title;
  return '';
}

/* ── Copy Article Link ── */
window.copyArticleLink = function() {
  var canon = document.getElementById('seo-canonical');
  var url = (canon && canon.href) || window.location.href;
  navigator.clipboard.writeText(url)
    .then(function() {
      var btn = document.querySelector('.ar-share-copy');
      if (btn) { var orig=btn.textContent; btn.textContent='✅ کاپی ہو گیا!'; setTimeout(function(){btn.textContent=orig;},2000); }
    })
    .catch(function() { prompt('لنک کاپی کریں:', url); });
};

/* ============================================================
   13. ADSENSE PUSH (call after render)
   ============================================================ */
function pushAds() {
  try {
    const ads = window.adsbygoogle = window.adsbygoogle || [];
    // Only push for ins elements that have NOT been initialized yet
    document.querySelectorAll('ins.adsbygoogle').forEach(ins => {
      if (!ins.getAttribute('data-adsbygoogle-status')) {
        ads.push({});
      }
    });
  } catch(e) {}
}

/* ============================================================
   14. RENDER ALL
   ============================================================ */
function renderAll() {
  renderSidebar();
  renderMain();          // AdEngine.activate اندر ہی چلتا ہے
}

/* ============================================================
   15. FOOTER — Academic Branding
   ============================================================ */
function injectFooter() {
  const year = new Date().getFullYear();

  // Gold accent strip above topbar (insert before body first child)
  const accent = document.createElement('div');
  accent.className = 'topbar-accent';
  document.body.insertBefore(accent, document.body.firstChild);

  // Full 3-column academic footer
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.setAttribute('role', 'contentinfo');
  footer.innerHTML = `
    <div class="site-footer-inner">

      <!-- Column 1: Brand -->
      <div class="site-footer-brand">
        <div class="site-footer-logo">
          <div class="site-footer-logo-img">
            <img src="/articles/ur/assets/icons/icon-192.png" width="48" height="48" loading="lazy"
                 alt="Kanz ul Ilm International Logo"
                 onerror="this.parentElement.style.background='#1a4731';this.style.display='none'">
          </div>
          <div>
            <div class="site-footer-name">Kanz ul Ilm International</div>
            <div class="site-footer-tagline">کنز العلم انٹرنیشنل</div>
          </div>
        </div>
        <div class="site-footer-tagline">بین الاقوامی علمی و تحقیقی مرکز</div>
        <div class="site-footer-desc">
          Under the Directorship of<br>
          <strong style="color:rgba(255,255,255,.75)">Mufti Syed Muhammad Usman Bukhari</strong>
        </div>
      </div>

      <!-- Column 2: Academic Sections -->
      <div class="site-footer-col">
        <h4>Academic Sections</h4>
        <ul>
          <li><a href="${urlSubcat('quran-hadith','quran-tafseer')}" data-route>قرآن و حدیث</a></li>
          <li><a href="${urlSubcat('aqaid-fiqh','aqaid-general')}" data-route>عقائد و فقہ</a></li>
          <li><a href="${urlSubcat('namaz-ibadaat','namaz-farz')}" data-route>نماز و عبادات</a></li>
          <li><a href="${urlSubcat('social-studies','history-islam')}" data-route>سماجی علوم</a></li>
          <li><a href="${urlSubcat('business','islamic-finance')}" data-route>تجارت و معیشت</a></li>
          <li><a href="${urlSubcat('science','quran-science')}" data-route>سائنس و ٹیکنالوجی</a></li>
          <li><a href="${urlSubcat('general-knowledge','gk-kids')}" data-route>عمومی معلومات</a></li>
        </ul>
      </div>

      <!-- Column 3: Links -->
      <div class="site-footer-col">
        <h4>Institution</h4>
        <ul>
          <li><a href="https://kanzulilm.com" target="_blank" rel="noopener">🏛️ Main Website</a></li>
          <li><a href="${urlHome()}" data-route>📚 Articles Portal</a></li>
          <li><a href="/privacy-policy.html">Privacy Policy</a></li>
          <li><a href="/terms-of-service.html">Terms of Service</a></li>
        </ul>
      </div>

    </div>

    <!-- Bottom bar -->
    <div class="site-footer-bottom">
      <div class="site-footer-copy">
        © ${year} <strong>Kanz ul Ilm International</strong> — تمام حقوق محفوظ ہیں
      </div>
      <div class="site-footer-bottom-links">
        <a href="https://kanzulilm.com" target="_blank" rel="noopener">kanzulilm.com</a>
        <span style="opacity:.3">|</span>
        <a href="${urlHome()}" data-route>kanzulilm.com/articles</a>
        <span style="opacity:.3">|</span>
        <a href="/privacy-policy.html">Privacy Policy</a>
        <span style="opacity:.3">|</span>
        <a href="/terms-of-service.html">Terms</a>
      </div>
    </div>`;
  document.body.appendChild(footer);
}

/* ============================================================
   16. INIT
   ============================================================ */
let _kanzInitDone = false;
function init() {
  if (_kanzInitDone) return;          // دوہرے initialisation سے تحفظ
  _kanzInitDone = true;
  injectShellAds();
  loadBookmarks();
  initSearch();
  initMobile();
  initAudienceFilter();
  injectFooter();
  injectAccessibilityControls();
  registerSW();
  initRouteLinks();        // ⭐ a[data-route] → History API
  migrateLegacyHash();     // ⭐ پرانے #/… لنک صاف پتے پر
  handleRoute();
}

/* ============================================================
   16-B. SHELL ADS — leaderboard + desktop sidebar
   ============================================================ */
function injectShellAds() {
  // ① اوپر کا leaderboard / موبائل بینر
  const lb = document.getElementById('ad-leaderboard');
  if (lb) {
    const html = AdEngine.unit('leaderboard', {
      cls: 'ad-leaderboard', minHeight: window.innerWidth < 720 ? 100 : 90,
      format: 'horizontal', style: 'width:100%;'
    });
    if (html) { lb.outerHTML = html; } else if (lb) { lb.style.display = 'none'; }
  }

  // ② ڈیسک ٹاپ کا چپکنے والا سائیڈ اشتہار
  const aside = document.getElementById('ad-aside');
  if (aside) {
    const html = AdEngine.unit('sidebar', {
      minHeight: 600, format: 'vertical', fullWidth: false, style: 'min-width:300px;'
    });
    if (html && window.innerWidth >= 1280) {
      aside.innerHTML = `<div class="ar-sidebar-ad-sticky">${html}</div>`;
      aside.style.display = 'block';
    } else { aside.style.display = 'none'; }
  }

  // ③ موبائل anchor (تاخیر سے)
  AdEngine.initAnchor();

  AdEngine.activate(document);
}

/* ============================================================
   16-C. REVEAL ANIMATION
   ============================================================ */
let _revealIO = null;
function initReveal(root = document) {
  if (!('IntersectionObserver' in window)) {
    root.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }
  if (!_revealIO) {
    _revealIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visible');
        _revealIO.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: .05 });
  }
  root.querySelectorAll('.reveal:not(.visible)').forEach(el => _revealIO.observe(el));
}

/* ============================================================
   17. PWA — Service Worker Registration
   ============================================================ */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;      // مقامی پیش نظارہ میں SW نہیں چلتا
  navigator.serviceWorker.register('/articles/ur/sw.js', { scope: '/articles/ur/' }).then(reg => {
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller)
          showToast('🔄 نیا نسخہ دستیاب ہے — صفحہ تازہ کریں');
      });
    });
  }).catch(() => {});
}

/* ============================================================
   18. READING TIME
   ============================================================ */
function calcReadingTime(text) {
  const speed = (State.data?.site?.defaultReadingSpeed) || 150;
  const words = countWords(text);
  const mins  = Math.max(1, Math.round(words / speed));
  return mins;
}

function formatUpdatedAt(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('ur-PK',
      { year:'numeric', month:'long', day:'numeric' });
  } catch { return dateStr; }
}

/* ============================================================
   18-B. ARTICLE NORMALIZER  ·  مضمون کو ٹیمپلیٹ کے مطابق ڈھالنا
   ────────────────────────────────────────────────────────────
   پرانے مضامین میں <font color> اور style="color:…" جیسے
   inline رنگ محفوظ ہیں۔ یہ فنکشن انہیں معنوی کلاسوں میں بدل
   دیتا ہے تاکہ تھیم/ڈارک موڈ بدلنے پر وہ بھی ساتھ بدلیں۔
   ⚠️ اصل ڈیٹا نہیں بدلتا — یہ صرف دکھاتے وقت چلتا ہے۔
   ============================================================ */
const HEX_TO_CLASS = [
  [/^#?(7a1515|5c1010|8b1a1a)$/i, 'txt-primary'],
  [/^#?(1a4731|2d6a4f)$/i,        'txt-accent'],
  [/^#?(9a7b2c|c9a961|d4af37)$/i, 'txt-gold'],
  [/^#?(6b6453|999999|888888)$/i, 'txt-muted']
];
const BG_TO_CLASS = [
  [/^#?(fff3cd|ffe|ffeb3b|fff9c4)/i, 'hl-gold'],
  [/^#?(e8f4ee|d4f4dd|c8e6c9)/i,     'hl-green'],
  [/^#?(fdf2f2|ffebee|ffcdd2)/i,     'hl-red']
];

function rgbToHex(v) {
  const m = String(v).match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!m) return String(v).trim();
  return '#' + [1,2,3].map(i => (+m[i]).toString(16).padStart(2,'0')).join('');
}
function mapColor(val, table, fallback) {
  const hex = rgbToHex(val).toLowerCase();
  for (const [re, cls] of table) if (re.test(hex)) return cls;
  return fallback;
}

/* ⭐ ٹائپوگرافی → utility کلاس (ایڈمن کے نقشے سے مطابق) */
const FS_MAP = [[11,'fs-xs'],[13,'fs-sm'],[17,'fs-base'],[19,'fs-md'],
                [26,'fs-lg'],[30,'fs-xl'],[40,'fs-2xl'],[56,'fs-3xl'],[1e4,'fs-4xl']];
const LH_MAP = [[1.5,'lh-tight'],[1.75,'lh-snug'],[2.05,'lh-normal'],
                [2.35,'lh-relaxed'],[2.7,'lh-loose'],[99,'lh-xloose']];
function fsClass(px)  { for (const [n,c] of FS_MAP) if (px <= n) return c; return 'fs-4xl'; }
function lhClass(v)   { v = parseFloat(v) || 2; for (const [n,c] of LH_MAP) if (v <= n) return c; return 'lh-xloose'; }
function ffClass(f) {
  f = (f || '').toLowerCase();
  if (/amiri|naskh|traditional/.test(f))   return 'ff-naskh';
  if (/cormorant|georgia/.test(f))         return 'ff-display';
  if (/dm sans|sans|system/.test(f))       return 'ff-ui';
  return 'ff-nastaliq';
}
/** CSS سائز کو تقریبی px میں */
function toPx(v) {
  const m = String(v).match(/([\d.]+)\s*(px|em|rem|%)?/);
  if (!m) return 17;
  const n = parseFloat(m[1]);
  if (m[2] === 'em' || m[2] === 'rem') return n * 17;
  if (m[2] === '%') return n * 0.17;
  return n;
}

/** bodyHtml کو مرکزی ٹیمپلیٹ کے مطابق صاف کرتا ہے */
function normalizeArticleHTML(html) {
  const root = document.createElement('div');
  root.innerHTML = html || '';

  // ① <font color=…> → <span class=…>
  root.querySelectorAll('font').forEach(f => {
    const span = document.createElement('span');
    const c = f.getAttribute('color');
    if (c) span.className = mapColor(c, HEX_TO_CLASS, 'txt-accent');
    span.innerHTML = f.innerHTML;
    f.replaceWith(span);
  });

  // ② inline style → کلاس
  root.querySelectorAll('[style]').forEach(el => {
    const st = el.style;
    const add = [];
    if (st.color)            add.push(mapColor(st.color, HEX_TO_CLASS, 'txt-accent'));
    if (st.backgroundColor)  add.push(mapColor(st.backgroundColor, BG_TO_CLASS, 'hl-gold'));
    if (st.fontWeight === 'bold' || +st.fontWeight >= 600) add.push('bold');
    if (st.textAlign === 'center') add.push('center');
    // ⭐ پرانے مضامین کی ٹائپوگرافی بھی ضائع نہ ہو
    if (st.fontSize)   add.push(fsClass(toPx(st.fontSize)));
    if (st.lineHeight) add.push(lhClass(st.lineHeight));
    if (st.fontFamily) add.push(ffClass(st.fontFamily));
    el.removeAttribute('style');          // ⭐ inline اسٹائل مکمل ختم
    add.filter(Boolean).forEach(c => el.classList.add(c));
    if (!el.className) el.removeAttribute('class');
  });

  // ③ خطرناک عناصر و صفات ہٹائیں (XSS تحفظ)
  root.querySelectorAll('script,iframe,object,embed,link,meta,style').forEach(e => e.remove());
  root.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(at => {
      const n = at.name.toLowerCase();
      if (n.startsWith('on')) el.removeAttribute(at.name);
      if ((n === 'href' || n === 'src') && /^\s*javascript:/i.test(at.value))
        el.removeAttribute(at.name);
    });
    if (el.tagName === 'A' && el.getAttribute('href')?.startsWith('http')) {
      el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener nofollow');
    }
  });

  // ④ ننگا متن جو کسی بلاک میں نہیں — <p> میں لپیٹیں (ٹیمپلیٹ لاگو ہونے کے لیے)
  const loose = [...root.childNodes].filter(
    n => n.nodeType === 3 && n.textContent.trim());
  loose.forEach(n => {
    const p = document.createElement('p');
    p.textContent = n.textContent;
    n.replaceWith(p);
  });

  return root.innerHTML;
}

/** editorFont نام → ff-* کلاس — ویور میں بھی وہی فونٹ جو ایڈیٹر میں تھا */
function fontClassFor(font) {
  const f = (font || '').toLowerCase();
  if (!f) return '';
  if (f.includes('jameel') || f.includes('noori'))                          return ' ff-jameel';
  if (f.includes('alvi'))                                                    return ' ff-alvi';
  if (f.includes('mehr'))                                                    return ' ff-mehr';
  if (f.includes('sajid'))                                                   return ' ff-sajid';
  if (f.includes('nafees'))                                                  return ' ff-nafees';
  if (f.includes('naskh unicode') || f.includes('naskhunicode'))            return ' ff-naskh-uni';
  if (f.includes('gulzar'))                                                  return ' ff-gulzar';
  if (f.includes('scheherazade'))                                            return ' ff-scheher';
  if (f.includes('traditional arabic'))                                      return ' ff-trad-arab';
  if (f.includes('arabic typesetting'))                                      return ' ff-arab-type';
  if (f.includes('amiri') || f.includes('naskh'))                           return ' ff-naskh';
  if (f.includes('lora'))                                                    return ' ff-lora';
  if (f.includes('times'))                                                   return ' ff-times';
  if (f.includes('cormorant') || f.includes('georgia'))                     return ' ff-display';
  if (f.includes('arial'))                                                   return ' ff-arial';
  if (f.includes('verdana'))                                                 return ' ff-verdana';
  if (f.includes('dm sans') || f.includes('sans'))                          return ' ff-ui';
  if (f.includes('noto nastaliq') || f.includes('nastaliq') ||
      f.includes('nastaleeq') || f.includes('noto'))                        return ' ff-nastaliq';
  return '';
}

/* ============================================================
   19. TABLE OF CONTENTS
   ============================================================ */
function generateTOC(htmlContent) {
  const tmp = document.createElement('div');
  tmp.innerHTML = htmlContent;
  const headings = tmp.querySelectorAll('h2, h3');
  if (headings.length < 2) return { tocHTML: '', processedContent: htmlContent };

  let toc = `<div class="ar-toc">
    <div class="ar-toc-title">📋 فہرستِ مضامین</div>
    <ol>`;
  headings.forEach((h, i) => {
    const id = `heading-${i}`;
    h.setAttribute('id', id);
    const cls = h.tagName === 'H3' ? ' class="toc-h3"' : '';
    toc += `<li${cls}><a href="#" class="toc-link" data-target="${id}">${escapeHTML(h.textContent)}</a></li>`;
  });
  toc += '</ol></div>';
  return { tocHTML: toc, processedContent: tmp.innerHTML };
}

/* ============================================================
   20. CITATION ENGINE (Chicago 17th Edition)
   ============================================================ */
function formatCitation(ref, style = 'chicago-17') {
  if (!ref) return '';
  const authors = (ref.author || []).join(', ');
  switch (ref.type) {
    case 'book':
      return `${authors}. <em>${ref.title}</em>${ref.edition ? ', ' + ref.edition + ' ed.' : ''}. ${ref.place || ''}: ${ref.publisher || ''}, ${ref.year || ''}.`;
    case 'journal':
      return `${authors}. "${ref.title}." <em>${ref.journal}</em> ${ref.volume || ''}${ref.issue ? ', no. ' + ref.issue : ''} (${ref.year || ''}): ${ref.pages || ''}.`;
    case 'website':
      return `${authors}. "${ref.title}." Accessed ${ref.accessed || ''}. ${ref.url || ''}.`;
    default:
      return `${authors}. ${ref.title}. ${ref.year || ''}.`;
  }
}

function renderFootnotes(footnotes, citationDB) {
  if (!footnotes || !footnotes.length) return '';
  let html = `<div class="ar-footnotes">
    <div class="ar-footnotes-title">حواشی (Footnotes)</div>`;
  footnotes.forEach(fn => {
    html += `<div class="ar-footnote-item">
      <span class="ar-footnote-num">${fn.id}.</span>
      <span>${fn.note || ''}</span>
    </div>`;
  });
  html += '</div>';
  return html;
}

function renderCitations(citationIds, citationDB) {
  if (!citationIds || !citationIds.length || !citationDB) return '';
  const refs = citationIds.map(id => citationDB.find(r => r.id === id)).filter(Boolean);
  if (!refs.length) return '';
  let html = `<div class="ar-citations">
    <div class="ar-citations-title">References (Chicago 17th Ed.)</div>`;
  refs.forEach(ref => {
    html += `<div class="ar-citation-entry">${formatCitation(ref)}</div>`;
  });
  html += '</div>';
  return html;
}

/* ============================================================
   21. SEO PER ARTICLE
   ============================================================ */
function applyArticleSEO(article) {
  const seo = article.seo || {};
  if (seo.metaDescription) setMeta('description', seo.metaDescription);
  if (seo.ogTitle)       setMeta('og:title', seo.ogTitle);
  if (seo.ogDescription) setMeta('og:description', seo.ogDescription);
  if (seo.ogImage)       setMeta('og:image', seo.ogImage);
  /* ⭐ صرف مکمل http(s) پتہ قبول کریں — ایڈمن میں غلطی سے لکھا گیا
     ادھورا لفظ (مثلاً "testinga") canonical کو خراب کر دیتا تھا */
  const validCanonical = (typeof seo.canonicalUrl === 'string' &&
                          /^https?:\/\//i.test(seo.canonicalUrl.trim()))
                          ? seo.canonicalUrl.trim() : '';
  if (validCanonical) {
    let canon = document.getElementById('seo-canonical');
    if (!canon) { canon = document.createElement('link'); canon.id='seo-canonical'; canon.rel='canonical'; document.head.appendChild(canon); }
    canon.href = validCanonical;
  }

  // ⭐ Article JSON-LD — Rich Results کے لیے
  let ldEl = document.getElementById('article-ld-json');
  if (!ldEl) {
    ldEl = document.createElement('script');
    ldEl.type = 'application/ld+json';
    ldEl.id   = 'article-ld-json';
    document.head.appendChild(ldEl);
  }
  const canonUrl = validCanonical || absUrl(routeArticle(article));
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': article.title || '',
    'description': seo.metaDescription || article.summary || '',
    'author': {
      '@type': 'Person',
      'name': article.author || 'Mufti Syed Muhammad Usman Bukhari'
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Kanz ul Ilm International',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://kanzulilm.com/assets/icons/icon-512.png'
      }
    },
    'datePublished': article.date || '',
    'dateModified':  article.updatedAt || article.date || '',
    'inLanguage': 'ur',
    'url': canonUrl,
    'mainEntityOfPage': { '@type': 'WebPage', '@id': canonUrl }
  };
  if (seo.ogImage || article.featuredImg) {
    schema.image = seo.ogImage || article.featuredImg;
  }
  ldEl.textContent = JSON.stringify(schema);
}

/* ============================================================
   22. DARK MODE + FONT SIZE
   ============================================================ */
let currentFontSize = 100; // percent

function injectAccessibilityControls() {
  // تھیم ٹوگل — html[data-theme] پر (kanzulilm.com جیسا)
  const dm = document.createElement('button');
  dm.className = 'dark-toggle';
  dm.title = 'روشن / تاریک';
  dm.setAttribute('aria-label', 'تھیم بدلیں');
  const paint = () => {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    dm.textContent = dark ? '☀️' : '🌙';
  };
  dm.addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
    localStorage.setItem('kanz_theme', dark ? 'light' : 'dark');
    paint();
  });
  paint();
  document.body.appendChild(dm);

  // Font size controls
  const fc = document.createElement('div');
  fc.className = 'font-size-ctrl';
  fc.innerHTML = `
    <button title="بڑا فونٹ" onclick="adjustFont(10)">A+</button>
    <button title="چھوٹا فونٹ" onclick="adjustFont(-10)">A-</button>
    <button title="ڈیفالٹ" onclick="adjustFont(0)">A</button>`;
  document.body.appendChild(fc);

  // Restore font size
  const savedSize = parseInt(localStorage.getItem('kanz_font_size') || '100');
  currentFontSize = savedSize;
  document.documentElement.style.fontSize = savedSize + '%';
}

window.adjustFont = function(delta) {
  if (delta === 0) { currentFontSize = 100; }
  else { currentFontSize = Math.max(80, Math.min(140, currentFontSize + delta)); }
  document.documentElement.style.fontSize = currentFontSize + '%';
  localStorage.setItem('kanz_font_size', currentFontSize);
};

/* ============================================================
   23. PRINT PDF
   ============================================================ */
window.printArticle = function() { window.print(); };

/* ============================================================
   24. TOPBAR BOOKMARK LINK
   (اسٹائل اب مکمل طور پر main.css میں ہیں — یہاں CSS انجیکشن نہیں)
   ============================================================ */
(function () {
  const addBookmarkLink = () => {
    const meta = document.querySelector('.topbar-meta');
    if (meta && !meta.querySelector('.topbar-bookmark-link')) {
      const bkLink = document.createElement('a');
      bkLink.className = 'topbar-bookmark-link';
      bkLink.href = basedPath('/bookmarks');
      bkLink.setAttribute('data-route', '');
      bkLink.title = 'محفوظ شدہ مضامین';
      bkLink.innerHTML = '🔖 محفوظ';
      meta.appendChild(bkLink);
    }
  };
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', addBookmarkLink, { once: true });
  else addBookmarkLink();
})();

/* ── تھیم فوراً لگائیں (صفحہ چمکنے سے پہلے) ── */
(function applyStoredTheme() {
  try {
    const saved = localStorage.getItem('kanz_theme');
    if (saved) { document.documentElement.setAttribute('data-theme', saved); return; }
    // پہلی بار: نظام کی ترجیح
    const prefersLight = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
  } catch { document.documentElement.setAttribute('data-theme', 'dark'); }
})();

/* ── BOOT ── DOMContentLoaded پہلے ہی گزر چکا ہو تب بھی چلے ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadData, { once: true });
} else {
  loadData();
}

