/**
 * KANZ UL ILM — functions/api/summary.js
 * عوامی AI خلاصہ endpoint (Edge-cached)
 *
 * ⚠️ سیٹ اپ: Cloudflare → Pages پروجیکٹ → Settings →
 *    Environment variables → ANTHROPIC_API_KEY (✅ Encrypt)
 */
import { json, cachedCompletion } from './_shared.js';

export async function onRequestPost({ request, env, waitUntil }) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'bad_json', summary: 'درخواست درست نہیں۔' }, 400); }

  return cachedCompletion({
    env, ctx: { waitUntil },
    prompt:    body?.prompt,
    maxTokens: 500,
    prefix:    'summary',
    field:     'summary'
  });
}

export async function onRequest({ request }) {
  if (request.method === 'POST') return;
  return json({ error: 'method_not_allowed' }, 405);
}
