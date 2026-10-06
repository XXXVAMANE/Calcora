import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExplainer } from '../lib/explain.mjs';
import handler, { config } from '../netlify/functions/explain.mjs';

const request = (data = { expression: '2+2=4', locale: 'en' }) => new Request('https://calcora-ai.netlify.app/api/explain', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
});
const env = { OPENAI_API_KEY: 'test-only-placeholder' };

test('Netlify exposes the existing UI route and a callable handler', () => {
  assert.equal(config.path, '/api/explain');
  assert.equal(typeof handler, 'function');
});

test('missing configuration and previews never call the provider', async () => {
  for (const settings of [{}, { ...env, NETLIFY: 'true', CONTEXT: 'deploy-preview' }]) {
    const explain = createExplainer({ env: settings, fetchProvider: () => { throw Error('Unexpected provider call'); } });
    assert.equal((await explain(request())).status, 503);
  }
});

test('English and Russian explanations use server credentials and plain text output', async () => {
  for (const locale of ['en', 'ru']) {
    const explain = createExplainer({ env, fetchProvider: async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      assert.equal(options.headers.Authorization, `Bearer ${env.OPENAI_API_KEY}`);
      const payload = JSON.parse(options.body);
      assert.equal(payload.model, 'gpt-4.1-mini');
      assert.equal(payload.store, false);
      assert.match(payload.instructions, locale === 'ru' ? /Russian/ : /English/);
      assert.equal(payload.input, '2+2=4');
      return Response.json({ output: [{ content: [{ type: 'output_text', text: 'Two plus two is four.' }] }] });
    } });
    const response = await explain(request({ expression: '2+2=4', locale }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { explanation: 'Two plus two is four.' });
  }
});

test('rejects malformed, oversized and unsupported requests before provider calls', async () => {
  const explain = createExplainer({ env, fetchProvider: () => assert.fail('Unexpected provider call') });
  assert.equal((await explain(new Request('https://site/api/explain'))).status, 405);
  for (const data of [null, {}, { expression: '2+2', locale: 'fr' }, { expression: 'x'.repeat(701), locale: 'en' }]) {
    assert.equal((await explain(request(data))).status, 400);
  }
  assert.equal((await explain(request({ expression: 'x'.repeat(3000), locale: 'en' }))).status, 413);
  assert.equal((await explain(new Request('https://site/api/explain', { method: 'POST', body: 'invalid' }))).status, 415);
  assert.equal((await explain(new Request('https://site/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }))).status, 400);
});

test('provider errors never expose upstream details or credentials', async () => {
  for (const fetchProvider of [
    async () => new Response('sensitive upstream detail', { status: 401 }),
    async () => { throw Error(env.OPENAI_API_KEY); },
    async () => Response.json({ output: [] }),
  ]) {
    const response = await createExplainer({ env, fetchProvider })(request());
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /test-only-placeholder|sensitive/);
  }
});

test('concurrent calls are bounded and capacity is released after completion', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const explain = createExplainer({ env, fetchProvider: async () => {
    await gate; return Response.json({ output: [{ content: [{ type: 'output_text', text: '4' }] }] });
  } });
  const first = explain(request()), second = explain(request());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await explain(request())).status, 429);
  release();
  assert.equal((await first).status, 200);
  assert.equal((await second).status, 200);
  assert.equal((await explain(request())).status, 200);
});
