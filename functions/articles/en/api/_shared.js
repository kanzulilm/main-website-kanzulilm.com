/**
 * ================================================================
 * KANZ UL ILM — functions/api/_shared.js
 * AI endpoints کے لیے مشترکہ منطق + ⭐ EDGE CACHING
 * ================================================================
 *
 * ⭐ کیشنگ کیوں اہم ہے (آپ کے سوال کا اصل نکتہ):
 *
 * Cloudflare Pages پر **جامد فائلیں (HTML/CSS/JS/تصاویر) لامحدود
 * اور مفت** ہیں — وہ Workers کوٹا خرچ *نہیں* کرتیں۔
 * کوٹا صرف یہ Functions خرچ کرتی ہیں (100,000 درخواستیں/دن)۔
 *
 * اس لیے اصل خطرہ صرف یہی AI endpoints ہیں۔ حل:
 *
 *   ① Edge Cache (Cache API) — ایک ہی مضمون کا خلاصہ ایک بار بنتا ہے،
 *      پھر 30 دن تک Cloudflare کے کیش سے آتا ہے۔
 *      1,000 قاری = 1 Anthropic کال (999 کیش سے) → 99.9% بچت
 *
 *   ② اس سے Anthropic کا بل بھی اُتنا ہی کم ہوتا ہے۔
 * ================================================================
 */

export const MODEL      = 'claude-sonnet-4-6';
export const CACHE_TTL  = 60 * 60 * 24 * 30;   // 30 دن

export const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });

/** prompt کا مستحکم SHA-256 کیش کلید */
export async function cacheKeyFor(prefix, prompt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prompt));
  const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  // Cache API کو ایک درست URL چاہیے
  return new Request(`https://kanz-cache.internal/${prefix}/${hex}`, { method: 'GET' });
}

/**
 * Anthropic کو کال کرتا ہے — Edge cache کے ساتھ۔
 * @returns {Promise<Response>}
 */
export async function cachedCompletion({ env, ctx, prompt, maxTokens, prefix, field }) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({
      error: 'not_configured',
      [field]: 'AI فیچر ابھی فعال نہیں۔ منتظم سے رابطہ کریں۔'
    }, 503);
  }

  const clean = String(prompt || '').slice(0, 12000);
  if (clean.trim().length < 20) {
    return json({ error: 'empty_prompt', [field]: 'متن بہت مختصر ہے۔' }, 400);
  }

  // ── ① پہلے Edge cache دیکھیں ──
  const cache = caches.default;
  const key   = await cacheKeyFor(prefix, clean);
  const hit   = await cache.match(key);
  if (hit) {
    const body = await hit.json();
    return json({ ...body, cached: true });
  }

  // ── ② کیش میں نہیں → Anthropic کو کال ──
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':          env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: Math.min(Math.max(+maxTokens || 500, 100), 4000),
        messages: [{ role: 'user', content: clean }]
      })
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Anthropic error', res.status, detail.slice(0, 300));
      return json({
        error: 'upstream',
        [field]: 'AI جواب تیار نہیں ہو سکا۔ کچھ دیر بعد کوشش کریں۔'
      }, 502);
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text').map(b => b.text).join('\n').trim();

    if (!text) return json({ error: 'empty', [field]: 'AI نے خالی جواب دیا۔' }, 502);

    const payload = { [field]: text };

    // ── ③ ⭐ نتیجہ Edge cache میں 30 دن کے لیے محفوظ ──
    const toCache = new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type':  'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`
      }
    });
    // waitUntil: جواب صارف کو فوراً جاتا ہے، کیشنگ پس منظر میں
    ctx?.waitUntil?.(cache.put(key, toCache));

    return json({ ...payload, cached: false });

  } catch (err) {
    console.error('AI function error:', err);
    return json({ error: 'network', [field]: 'رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں۔' }, 502);
  }
}

/** ایڈمن-صرف endpoints کے لیے سادہ Origin چیک */
export function sameOriginOnly(request) {
  const origin  = request.headers.get('Origin');
  const referer = request.headers.get('Referer') || '';
  const host    = new URL(request.url).origin;
  if (origin && origin !== host) return false;
  if (!origin && referer && !referer.startsWith(host)) return false;
  return true;
}
