/**
 * KANZ UL ILM — functions/api/write.js
 * ایڈمن AI مضمون نگار (Edge-cached)
 *
 * 🔒 نوٹ: یہ endpoint Anthropic کریڈٹ خرچ کرتا ہے۔
 *    اسے Cloudflare Access یا WAF Rule سے محفوظ کریں —
 *    تفصیل SECURITY.md میں ہے۔
 */
import { json, cachedCompletion, sameOriginOnly } from './_shared.js';

export async function onRequestPost({ request, env, waitUntil }) {
  if (!sameOriginOnly(request))
    return json({ error: 'forbidden', text: 'اجازت نہیں۔' }, 403);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'bad_json', text: 'درخواست درست نہیں۔' }, 400); }

  return cachedCompletion({
    env, ctx: { waitUntil },
    prompt:    body?.prompt,
    maxTokens: body?.maxTokens || 2000,
    prefix:    'write',
    field:     'text'
  });
}

export async function onRequest({ request }) {
  if (request.method === 'POST') return;
  return json({ error: 'method_not_allowed' }, 405);
}
