/**
 * ================================================================
 * KANZ UL ILM — functions/articles/ur/[[path]].js
 * ⭐ SPA fallback — /articles/ur/… کے صاف پتوں کے لیے
 * ================================================================
 *
 * یہ _redirects کی جگہ لیتا ہے۔
 *
 * _redirects میں یہ اصول:
 *     /articles/ur/*   /articles/ur/index.html   200
 * Cloudflare "Infinite loop detected … has been ignored" کہہ کر
 * نظرانداز کر دیتا ہے (کیونکہ Pages خود `/index` اور `.html` ہٹا کر
 * دوبارہ redirect کرتا ہے) — اسی لیے ریفریش پر 404 / صفحہ اول آتا تھا۔
 *
 * Function اس loop-detector سے آزاد ہے:
 *   ① پہلے اصل فائل آزماؤ  (CSS/JS/تصاویر/admin — سب معمول کے مطابق)
 *   ② نہ ملے تو index.html کا مواد **بغیر redirect** بھیج دو
 *      → براؤزر کا URL جوں کا توں رہتا ہے، app.js slug پڑھ لیتا ہے
 *      → HTTP status 200 (SEO کے لیے درست)
 *
 * نوٹ: api/summary اور api/write زیادہ مخصوص راستے ہیں،
 *      اس لیے وہ اس catch-all سے پہلے چلتے ہیں۔
 */

export async function onRequest(context) {
  const shellUrl = new URL(context.request.url);
  shellUrl.pathname = '/articles/ur/index.html';
  shellUrl.search = '';
  shellUrl.hash = '';

  // چھوٹا مددگار — دونوں طریقے آزماتا ہے، کبھی throw نہیں کرتا
  async function getAsset(req) {
    try {
      if (context.env && context.env.ASSETS) {
        const r = await context.env.ASSETS.fetch(req);
        if (r) return r;
      }
    } catch (e) { /* اگلا طریقہ آزماؤ */ }
    try {
      return await context.next(req);
    } catch (e) { return null; }
  }

  // ── ① اصل فائل موجود ہو تو وہی بھیجو ──
  let assetResponse = null;
  try {
    assetResponse = await context.next();
  } catch (e) {
    assetResponse = await getAsset(context.request);
  }

  // 404 کے علاوہ سب کچھ (200 / 301 / 304 …) جوں کا توں واپس
  if (assetResponse && assetResponse.status !== 404) return assetResponse;

  // ── ② فائل نہیں ملی → SPA خول بھیجو (redirect کے بغیر) ──
  const shell = await getAsset(new Request(shellUrl.toString(), { method: 'GET' }));

  if (!shell || !shell.ok) {
    // خول بھی نہ ملے تو اصل جواب واپس — کبھی 500 نہ دو
    return assetResponse || new Response('Not found', { status: 404 });
  }

  return new Response(shell.body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache'
    }
  });
}
