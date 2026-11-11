// Exercises the mock server against the fixtures that ship with the repo: no token, no network.
// What is being checked is that `npm run dev:mock` is actually usable by someone who just cloned
// the repo -- the preview renders, the filters do something, the pager pages, and the write paths
// stay local.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from '../fixtures/mock-handler.mjs';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

function fakeRes() {
  const res = { statusCode: null, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  res.send = (text) => { res.body = text; return res; };
  return res;
}

async function get(pathSegments, query = {}, headers = {}) {
  const res = fakeRes();
  await handler({ method: 'GET', query: { path: pathSegments, ...query }, headers }, res);
  return res;
}

test('las fixtures parsean y traen las acciones que el kit usa', () => {
  const needed = ['properties', 'property-detail', 'developments', 'development-properties',
    'development-detail', 'types', 'operations', 'zones', 'branches', 'features', 'settings-v2', 'design'];
  for (const name of needed) {
    const file = path.join(FIXTURES, `${name}.json`);
    assert.ok(fs.existsSync(file), `falta fixtures/${name}.json`);
    JSON.parse(fs.readFileSync(file, 'utf8'));
  }
});

test('ninguna fixture lleva datos de contacto reales ni claves de integracion', () => {
  const forbidden = [/@mapaprop\.com/i, /s3\.amazonaws/i, /pk\.eyJ/, /\bAIza[\w-]{30}/];
  for (const name of fs.readdirSync(FIXTURES).filter((f) => f.endsWith('.json'))) {
    const raw = fs.readFileSync(path.join(FIXTURES, name), 'utf8');
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(raw), `fixtures/${name} matchea ${pattern}`);
    }
  }
});

test('cada propiedad tiene SU direccion, no la de la inmobiliaria', async () => {
  // Regresion: el discriminador de la anonimizacion keyeaba en `branchId`, que una PROPIEDAD
  // tambien trae, asi que las 20 salieron con la direccion de la agencia. Un demo donde todo esta
  // en la misma calle se lee como un bug del kit.
  const res = await get(['properties'], { size: '20' });
  const addresses = res.body.properties.map((p) => p.address).filter(Boolean);
  assert.ok(addresses.length >= 10, 'la fixture necesita direcciones para que el test valga');
  assert.equal(new Set(addresses).size, addresses.length, 'hay direcciones repetidas');
  const branches = await get(['branches']);
  assert.ok(!addresses.includes(branches.body.branches[0].address),
    'una propiedad quedo con la direccion de la sucursal');
});

test('GET properties devuelve una pagina y su total', async () => {
  const res = await get(['properties']);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.properties.length > 0);
  assert.equal(res.body.total, res.body.properties.length);
  assert.equal(res.headers['x-mapaprop-mock'], '1');
});

test('el tope de 20 por request se respeta igual que en la API', async () => {
  const res = await get(['properties'], { size: '500' });
  assert.ok(res.body.properties.length <= 20);
});

test('from pagina de verdad: la segunda pagina no repite la primera', async () => {
  const first = await get(['properties'], { size: '5', from: '0' });
  const second = await get(['properties'], { size: '5', from: '5' });
  const hashes = new Set(first.body.properties.map((p) => p.propertyHash));
  assert.equal(first.body.properties.length, 5);
  assert.ok(second.body.properties.every((p) => !hashes.has(p.propertyHash)));
});

test('el filtro de operacion filtra, y no devuelve todo', async () => {
  const all = await get(['properties'], { size: '20' });
  const operations = new Set(all.body.properties.map((p) => Math.round(Number(p.operation))));
  assert.ok(operations.size > 1, 'la fixture necesita mas de una operacion para que el test valga');
  const [one] = [...operations];
  const filtered = await get(['properties'], { size: '20', operation: String(one) });
  assert.ok(filtered.body.properties.length > 0);
  assert.ok(filtered.body.properties.every((p) => Math.round(Number(p.operation)) === one));
  assert.ok(filtered.body.total < all.body.total);
});

test('priceTo filtra por precio', async () => {
  const res = await get(['properties'], { size: '20', priceTo: '70000' });
  assert.ok(res.body.properties.every((p) => Number(p.price) <= 70000));
});

test('la ficha se resuelve por hash y trae los campos que solo da el detalle', async () => {
  const list = await get(['properties']);
  const hash = list.body.properties[0].propertyHash;
  const res = await get(['properties', hash]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.propertyHash, hash);
  assert.ok(res.body.branch, 'el detalle tiene que traer la sucursal');
});

test('un hash que no existe da 404 y no un 200 vacio', async () => {
  const res = await get(['properties', 'noexiste']);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'NOT_FOUND');
});

test('un emprendimiento trae developmentProperties para poder pedir sus unidades', async () => {
  const list = await get(['developments']);
  assert.ok(list.body.properties.length > 0);
  const withUnits = list.body.properties.find((p) => (p.developmentProperties || []).length);
  assert.ok(withUnits, 'la fixture necesita un emprendimiento con unidades');
  const res = await get(['properties', withUnits.propertyHash]);
  assert.ok((res.body.developmentProperties || []).length > 0);
});

test('development/properties sin propertyIds rechaza, igual que la API', async () => {
  const res = await get(['development', 'properties']);
  assert.equal(res.statusCode, 400);
});

test('development/properties con ids devuelve unidades', async () => {
  const res = await get(['development', 'properties'], { propertyIds: '2605702,2605705' });
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.properties.length > 0);
});

test('los catalogos salen tal cual de la fixture', async () => {
  for (const [action, key] of [['types', 'types'], ['operations', 'operations'], ['branches', 'branches'], ['features', 'features']]) {
    const res = await get([action]);
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body[key]) && res.body[key].length > 0, `${action} vino vacio`);
  }
  const zones = await get(['zones']);
  assert.ok(zones.body.states.length > 0);
});

test('settings-v2 y design alcanzan para pintar la marca', async () => {
  const settings = await get(['settings-v2']);
  assert.ok(settings.body.customer.name);
  assert.ok(settings.body.customer.email.endsWith('.example'), 'el email tiene que ser de fantasia');
  const design = await get(['design']);
  assert.ok(design.body.colors.primary);
});

test('detras de un terminador TLS el logo y el hero salen en https, no en http', async () => {
  // An `http://` image inside an https page is mixed content: the browser drops it silently and the
  // whole brand disappears while every endpoint still answers 200. Production, 2026-11-11.
  const res = await get(['design'], {}, { host: 'demo.example', 'x-forwarded-proto': 'https' });
  assert.equal(res.body.images.logo, 'https://demo.example/img/logo-sample.svg');
  assert.ok(res.body.images.slides.length > 0, 'sin slides el test no asevera nada');
  for (const slide of res.body.images.slides) {
    assert.ok(slide.image.startsWith('https://'), `slide servida en http: ${slide.image}`);
  }
});

test('sin x-forwarded-proto sigue siendo http, que es el caso de localhost', async () => {
  const res = await get(['design'], {}, { host: 'localhost:3000' });
  assert.ok(res.body.images.logo.startsWith('http://localhost:3000/'));
});

test('el mock respeta la MISMA allowlist del proxy: una accion no habilitada da 404', async () => {
  const res = await get(['customers']);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'NOT_ALLOWED');
});

test('un path con caracteres fuera del juego permitido se rechaza antes de tocar el disco', async () => {
  const res = await get(['..', 'etc', 'passwd']);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'BAD_PATH');
});

test('POST messages responde ok y no sale de la maquina', async () => {
  const res = fakeRes();
  await handler({ method: 'POST', query: { path: ['messages'] }, headers: {}, body: { propertyHash: 'x', name: 'Ana' } }, res);
  assert.equal(res.statusCode, 200);
  assert.notEqual(res.body.success, false);
});

test('POST seller-submissions responde sin la bandera de error que el kit mira', async () => {
  const res = fakeRes();
  await handler({ method: 'POST', query: { path: ['seller-submissions'] }, headers: {}, body: { name: 'Ana' } }, res);
  assert.equal(res.statusCode, 200);
  assert.notEqual(res.body.error, true);
});

test('el modo mock no lee ningun token', async () => {
  const saved = process.env.MAPAPROP_API_TOKEN;
  delete process.env.MAPAPROP_API_TOKEN;
  try {
    const res = await get(['properties']);
    assert.equal(res.statusCode, 200);
  } finally {
    if (saved !== undefined) process.env.MAPAPROP_API_TOKEN = saved;
  }
});

test('las imagenes de las fixtures apuntan a placeholders que existen en el repo', async () => {
  const res = await get(['properties']);
  const images = res.body.properties.flatMap((p) => (p.images || []).map((i) => i.image)).filter(Boolean);
  assert.ok(images.length > 0);
  for (const src of new Set(images)) {
    assert.ok(src.startsWith('/img/placeholder-'), `imagen no anonimizada: ${src}`);
    const file = path.join(FIXTURES, '..', 'public', src);
    assert.ok(fs.existsSync(file), `falta el archivo ${src}`);
  }
});
