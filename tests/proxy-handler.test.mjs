// Exercises the proxy end to end against a stubbed fetch: no token and no network. What is being
// checked is the glue -- how the upstream URL is built, which header carries the token, and how each
// of the two POST endpoints is encoded (they do not agree on a content type).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/mp/[...path].js';

function fakeRes() {
  const res = { statusCode: null, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  res.send = (text) => { res.body = text; return res; };
  return res;
}

function fakeReq({ method = 'GET', path, url, body, headers = {} } = {}) {
  return {
    method,
    url: url || `/api/mp/${[].concat(path).join('/')}`,
    query: { path },
    body,
    headers: { host: 'misitio.com', ...headers },
    socket: { remoteAddress: '10.0.0.1' },
  };
}

let calls = [];
beforeEach(() => {
  calls = [];
  process.env.MAPAPROP_API_TOKEN = 'token-de-prueba';
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: async () => '{"total":0,"properties":[]}',
    };
  };
});

test('a read is forwarded to express-v1 with the token in the header, never in the query', async () => {
  const req = fakeReq({ path: ['properties'], url: '/api/mp/properties?operation=1&size=20&path=properties' });
  const res = fakeRes();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1);
  const { url, init } = calls[0];
  assert.ok(url.startsWith('https://mapaprop.app/api/action/express-v1/properties?'), url);
  assert.match(url, /operation=1/);
  assert.match(url, /size=20/);
  // The injected catch-all parameter must not travel on to the API.
  assert.doesNotMatch(url, /[?&]path=/);
  assert.equal(init.headers.Authorization, 'Bearer token-de-prueba');
  assert.doesNotMatch(url, /token/);
});

test('an action outside the allowlist is refused without calling the API', async () => {
  const res = fakeRes();
  await handler(fakeReq({ method: 'POST', path: ['properties'], body: { title: 'x' } }), res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'NOT_ALLOWED');
  assert.equal(calls.length, 0, 'no debería haber llamado a la API');
});

test('a path that tries to escape express-v1 is refused', async () => {
  const res = fakeRes();
  await handler(fakeReq({ path: ['..', 'oauth2-v1', 'authorize'] }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('messages goes out form-encoded with ip, userAgent and referer filled by the server', async () => {
  const res = fakeRes();
  await handler(fakeReq({
    method: 'POST',
    path: ['messages'],
    body: { propertyHash: 'abc', name: 'Ana', email: 'ana@example.com', message: 'Hola' },
    headers: {
      'x-forwarded-for': '200.1.2.3, 10.0.0.9',
      'user-agent': 'Mozilla/5.0 (prueba)',
      referer: 'https://misitio.com/propiedad.html?hash=abc',
    },
  }), res);

  assert.equal(res.statusCode, 200);
  const { init } = calls[0];
  assert.equal(init.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const sent = new URLSearchParams(init.body);
  assert.equal(sent.get('propertyHash'), 'abc');
  assert.equal(sent.get('name'), 'Ana');
  // The API requires these three and a browser cannot know them: the first hop of the forwarded
  // chain is the visitor.
  assert.equal(sent.get('ip'), '200.1.2.3');
  assert.equal(sent.get('userAgent'), 'Mozilla/5.0 (prueba)');
  assert.equal(sent.get('referer'), 'https://misitio.com/propiedad.html?hash=abc');
  assert.equal(sent.get('url'), 'https://misitio.com/propiedad.html?hash=abc');
});

test('a client cannot spoof its own ip through the proxy', async () => {
  const res = fakeRes();
  await handler(fakeReq({
    method: 'POST',
    path: ['messages'],
    body: { propertyHash: 'abc', name: 'Ana', message: 'Hola', ip: '1.1.1.1' },
    headers: { 'x-forwarded-for': '200.1.2.3' },
  }), res);
  assert.equal(new URLSearchParams(calls[0].init.body).get('ip'), '200.1.2.3');
});

test('seller-submissions goes out as JSON, with the domain filled in', async () => {
  const res = fakeRes();
  await handler(fakeReq({
    method: 'POST',
    path: ['seller-submissions'],
    body: { name: 'Ana', email: 'a@b.com', phone: '1', propertyType: 'Casa',
            propertyOperation: 'Venta', propertyAddress: 'Calle 1' },
    headers: { 'x-forwarded-for': '200.1.2.3' },
  }), res);

  const { init } = calls[0];
  assert.equal(init.headers['Content-Type'], 'application/json');
  const sent = JSON.parse(init.body);
  assert.equal(sent.propertyType, 'Casa');
  assert.equal(sent.ip, '200.1.2.3');
  assert.equal(sent.domain, 'misitio.com');
});

test('catalogs come back cacheable and the entry points do not', async () => {
  const read = fakeRes();
  await handler(fakeReq({ path: ['types'] }), read);
  assert.match(read.headers['cache-control'], /s-maxage=86400/);

  const write = fakeRes();
  await handler(fakeReq({ method: 'POST', path: ['messages'],
    body: { propertyHash: 'a', name: 'b', message: 'c' } }), write);
  assert.equal(write.headers['cache-control'], 'no-store');
});

test('without the token the answer says exactly what is missing', async () => {
  delete process.env.MAPAPROP_API_TOKEN;
  const res = fakeRes();
  await handler(fakeReq({ path: ['properties'] }), res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'MISSING_TOKEN');
  assert.match(res.body.message, /MAPAPROP_API_TOKEN/);
  assert.equal(calls.length, 0);
});
