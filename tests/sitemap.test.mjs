// What is pinned here is the one thing that makes a sitemap worse than having none: answering a
// VALID but EMPTY xml when the API fails. A crawler reads that as "this site has no pages" and acts
// on it, so the error branch has to be a 5xx -- that is the assertion this file exists for.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../api/sitemap.xml.js';
import robots from '../api/robots.txt.js';

function fakeRes() {
  const res = { statusCode: null, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.send = (text) => { res.body = text; return res; };
  return res;
}

const req = { headers: { host: 'misitio.com', 'x-forwarded-proto': 'https' } };

let properties = [];
let posts = [];
let failWith = null;

beforeEach(() => {
  process.env.MAPAPROP_API_TOKEN = 'token-de-prueba';
  delete process.env.MAPAPROP_API_BASE;
  properties = [];
  posts = [];
  failWith = null;
  globalThis.fetch = async (url) => {
    if (failWith && String(url).includes(failWith)) {
      return { ok: false, status: 500, json: async () => ({}) };
    }
    // La forma REAL de cada uno, medida: `properties/sitemap` devuelve un array pelado y `posts`
    // devuelve `{ posts: [...] }`. Con las dos iguales, este stub escondía el bug de los 0 posts.
    const body = String(url).includes('properties/sitemap') ? properties : { posts };
    return { ok: true, status: 200, json: async () => body };
  };
});

test('las secciones del sitio entran siempre, con el host del request', async () => {
  const res = fakeRes();
  await sitemap(req, res);

  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/xml/);
  for (const path of ['/', '/propiedades', '/destacados', '/emprendimientos', '/vender', '/contacto', '/blog']) {
    assert.ok(res.body.includes(`<loc>https://misitio.com${path}</loc>`), `falta ${path}`);
  }
});

test('una propiedad sale como /propiedad?id= y su fecha en ISO', async () => {
  // Por `propertyId` y no por `hash`: el sitemap de la API no devuelve el hash (el índice de
  // búsqueda no tiene ese campo), y para eso existe la lectura por id. `ficha.js` acepta los dos.
  properties = [{ propertyId: 2617750, lastUpdate: '26-11-2025 18:29:41' }];
  const res = fakeRes();
  await sitemap(req, res);

  assert.ok(res.body.includes('<loc>https://misitio.com/propiedad?id=2617750</loc>'));
  // Mapaprop manda dd-MM-yyyy y <lastmod> exige ISO: una fecha al revés le dice al crawler que la
  // página es de 2041 y deja de volver.
  assert.ok(res.body.includes('<lastmod>2025-11-26</lastmod>'));
});

test('una fecha que no se puede parsear se OMITE, no se inventa', async () => {
  properties = [{ propertyId: 2617750, lastUpdate: 'ayer' }];
  const res = fakeRes();
  await sitemap(req, res);

  assert.ok(res.body.includes('id=2617750'));
  assert.ok(!res.body.includes('<lastmod>'), 'una fecha ilegible no debe producir lastmod');
});

test('una propiedad sin identificador se saltea en vez de emitir una url rota', async () => {
  properties = [{ lastUpdate: '26-11-2025 18:29:41' }, { propertyId: 7 }];
  const res = fakeRes();
  await sitemap(req, res);

  assert.equal((res.body.match(/\/propiedad\?id=/g) || []).length, 1);
});

test('🔴 si la API falla, NO se emite un sitemap vacío: 503', async () => {
  failWith = 'properties/sitemap';
  const res = fakeRes();
  await sitemap(req, res);

  assert.equal(res.statusCode, 503);
  assert.ok(!res.body.includes('<urlset'), 'no debe emitir un urlset vacío');
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('los posts salen del objeto { posts: [...] }, no de un array pelado', async () => {
  posts = [{ url: 'una-nueva-noticia', date: '2026-10-01' }];
  const res = fakeRes();
  await sitemap(req, res);

  assert.ok(res.body.includes('/post?url=una-nueva-noticia'),
    'el payload de posts viene envuelto: leerlo como array da un sitemap sin posts y sin error');
});

test('un sitio sin blog no es un error: el sitemap sale igual', async () => {
  properties = [{ propertyId: 2617750 }];
  failWith = 'posts';
  const res = fakeRes();
  await sitemap(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.body.includes('id=2617750'));
});

test('sin token no se responde un sitemap vacío tampoco', async () => {
  delete process.env.MAPAPROP_API_TOKEN;
  const res = fakeRes();
  await sitemap(req, res);

  assert.equal(res.statusCode, 503);
});

test('robots.txt apunta al sitemap con URL absoluta y bloquea el proxy', async () => {
  const res = fakeRes();
  robots(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.body.includes('Sitemap: https://misitio.com/sitemap.xml'));
  assert.ok(res.body.includes('Disallow: /api/'));
});
