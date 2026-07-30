/**
 * ================================================================
 * KANZ UL ILM — functions/articles/en/[[path]].js
 * ⭐ SPA fallback — /articles/en/… clean URLs
 * ================================================================
 *
 * Same proven formula as /articles/ur/[[path]].js
 * Serves index.html for all /articles/en/* routes WITHOUT redirect
 * so app.js can read the slug from the URL and display the article.
 */

export async function onRequest(context) {
  const shellUrl = new URL(context.request.url);
  shellUrl.pathname = '/articles/en/index.html';
  shellUrl.search = '';
  shellUrl.hash = '';

  async function getAsset(req) {
    try {
      if (context.env && context.env.ASSETS) {
        const r = await context.env.ASSETS.fetch(req);
        if (r) return r;
      }
    } catch (e) { /* try next */ }
    try {
      return await context.next(req);
    } catch (e) { return null; }
  }

  // ① Serve real file if it exists (CSS/JS/images/admin)
  let assetResponse = null;
  try {
    assetResponse = await context.next();
  } catch (e) {
    assetResponse = await getAsset(context.request);
  }

  if (assetResponse && assetResponse.status !== 404) return assetResponse;

  // ② File not found → serve SPA shell WITHOUT redirect
  const shell = await getAsset(new Request(shellUrl.toString(), { method: 'GET' }));

  if (!shell || !shell.ok) {
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
