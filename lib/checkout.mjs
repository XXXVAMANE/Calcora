import catalog from './catalog.json' with { type: 'json' };

const response = (status, data) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
// Test-only while product prices, inventory and fulfillment are demonstration data.
export function createCheckout({ env = process.env, fetchProvider = fetch } = {}) {
  return async request => {
    if (!['POST', 'GET'].includes(request.method)) return response(405, { error: 'METHOD_NOT_ALLOWED' });
    if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || (env.NETLIFY === 'true' && env.CONTEXT !== 'production')) return response(503, { error: 'CHECKOUT_NOT_CONFIGURED' });
    let origin;
    try {
      const site = new URL(env.NETLIFY === 'true' ? env.URL : env.PUBLIC_SITE_URL || request.url);
      if (site.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(site.hostname)) throw Error();
      origin = site.origin;
    } catch { return response(503, { error: 'CHECKOUT_NOT_CONFIGURED' }); }
    const source = request.headers.get('origin');
    if (source && source !== origin) return response(403, { error: 'INVALID_ORIGIN' });
    const stripe = async (path, params, idempotency) => {
      const result = await fetchProvider(`https://api.stripe.com/v1/${path}`, {
        method: params ? 'POST' : 'GET', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotency } : {}) },
        ...(params ? { body: params.toString() } : {}),
      });
      if (!result.ok) throw Error('Stripe request failed');
      return result.json();
    };
    try {
      if (request.method === 'GET') {
        const id = new URL(request.url).searchParams.get('session_id') || '';
        if (!/^cs_test_[A-Za-z0-9_]{1,200}$/.test(id)) return response(400, { error: 'INVALID_SESSION' });
        const session = await stripe(`checkout/sessions/${id}`);
        if (session.livemode !== false || session.metadata?.store !== 'calcora-demo' || session.currency !== 'usd') return response(404, { error: 'ORDER_NOT_FOUND' });
        return response(200, { paid: session.status === 'complete' && session.payment_status === 'paid', test: true, amount: session.amount_total, currency: 'USD' });
      }
      if (!(request.headers.get('content-type') || '').startsWith('application/json')) return response(400, { error: 'INVALID_CART' });
      let bytes = 0; const chunks = []; const reader = request.body?.getReader();
      if (!reader) return response(400, { error: 'INVALID_CART' });
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        bytes += value.byteLength; if (bytes > 4096) { await reader.cancel(); return response(413, { error: 'INVALID_CART' }); }
        chunks.push(value);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return response(400, { error: 'INVALID_CART' }); }
      if (!body || typeof body !== 'object') return response(400, { error: 'INVALID_CART' });
      if (!Array.isArray(body.items) || !body.items.length || body.items.length > 3 || !['en', 'ru'].includes(body.locale) || !/^[a-f0-9-]{36}$/.test(body.attempt || '')) return response(400, { error: 'INVALID_CART' });
      const seen = new Set();
      for (const item of body.items) {
        if (!item || typeof item.slug !== 'string' || !Object.hasOwn(catalog, item.slug) || seen.has(item.slug) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return response(400, { error: 'INVALID_CART' });
        seen.add(item.slug);
      }
      const root = body.locale === 'ru' ? '/ru' : '';
      const params = new URLSearchParams({ mode: 'payment', 'payment_method_types[0]': 'card',
        success_url: `${origin}${root}/checkout/success/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}${root}/checkout/cancel/`, locale: body.locale, 'metadata[store]': 'calcora-demo', 'payment_intent_data[metadata][store]': 'calcora-demo',
        'payment_intent_data[description]': body.items.map(item => `${catalog[item.slug].name} × ${item.quantity}`).join(', '),
        'shipping_address_collection[allowed_countries][0]': 'US', 'billing_address_collection': 'auto',
        'shipping_options[0][shipping_rate_data][type]': 'fixed_amount', 'shipping_options[0][shipping_rate_data][fixed_amount][amount]': '0',
        'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'usd',
        'shipping_options[0][shipping_rate_data][display_name]': 'Simulated US delivery (test only)',
      });
      body.items.forEach((item, index) => {
        const prefix = `line_items[${index}]`; const product = catalog[item.slug];
        params.set(`${prefix}[quantity]`, String(item.quantity));
        params.set(`${prefix}[price_data][currency]`, 'usd');
        params.set(`${prefix}[price_data][unit_amount]`, String(product.unitAmount));
        params.set(`${prefix}[price_data][product_data][name]`, product.name);
        params.set(`${prefix}[price_data][product_data][metadata][slug]`, item.slug);
      });
      const session = await stripe('checkout/sessions', params, `calcora-${body.attempt}`);
      const checkoutUrl = new URL(session.url);
      if (session.livemode !== false || checkoutUrl.origin !== 'https://checkout.stripe.com' || !/^cs_test_/.test(session.id)) throw Error('Invalid checkout response');
      return response(200, { url: checkoutUrl.href, id: session.id, test: true });
    } catch { return response(502, { error: 'CHECKOUT_FAILED' }); }
  };
}
