// Arranca el servidor de verdad y le pega por HTTP. Es el unico test que ejercita el camino que va
// a correr detras de nginx: ahi NO hay plataforma que ponga un techo al cuerpo del pedido, asi que
// el techo tiene que ser del kit. Sin esto, un POST grande bufferea hasta matar el proceso.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3977;
const BASE = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, ['dev-local.mjs', '--mock'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), MAX_BODY_BYTES: '2048' },
    stdio: 'ignore',
  });
  // Esperar a que escuche, sin dormir un tiempo fijo.
  for (let intento = 0; intento < 60; intento++) {
    try {
      await fetch(`${BASE}/api/mp/types`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('el servidor no levanto');
});

after(() => server?.kill());

test('🔴 un cuerpo por encima del techo se corta con 413, no se bufferea', async () => {
  const res = await fetch(`${BASE}/api/mp/seller-submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: 'A'.repeat(50 * 1024) }),
  });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).error, 'BODY_TOO_LARGE');
});

test('un cuerpo normal pasa sin problema', async () => {
  const res = await fetch(`${BASE}/api/mp/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ana', message: 'Hola' }),
  });
  assert.equal(res.status, 200);
});

test('🔴 un ?path= del visitante no elige una accion distinta a la de la URL', async () => {
  // En Vercel `path` ES el catch-all. Si la query lo pisa, local y desplegado dejan de comportarse
  // igual y el visitante elige que accion corre.
  const res = await fetch(`${BASE}/api/mp/types?path=design`);
  const body = await res.json();
  assert.ok(Array.isArray(body.types), `respondio otra accion: ${JSON.stringify(body).slice(0, 120)}`);
});

test('no se sirven archivos de fuera de public/', async () => {
  for (const ruta of ['/../package.json', '/..%2fpackage.json', '/../.env.local', '/../fixtures/properties.json']) {
    const res = await fetch(`${BASE}${ruta}`);
    assert.equal(res.status, 404, `sirvio ${ruta}`);
  }
});

test('🔴 el modo mock tambien proyecta settings-v2: un solo borde, no dos', async () => {
  // Si la fixture se sirviera entera, el modo que mas corre un colaborador escondería justamente la
  // filtracion que `pick` cierra.
  const res = await fetch(`${BASE}/api/mp/settings-v2`);
  const body = await res.json();
  assert.deepEqual(Object.keys(body), ['customer'], `el mock devolvio ${Object.keys(body).join(', ')}`);
  for (const prohibido of ['taxId', 'taxName', 'taxAddress', 'taxCondition', 'taxIdType']) {
    assert.ok(!(prohibido in body.customer), `el mock filtro ${prohibido}`);
  }
  assert.ok(body.customer.name, 'se perdio el nombre, que el kit si necesita');
});
