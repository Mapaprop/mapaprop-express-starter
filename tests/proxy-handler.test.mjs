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
let nextFetchError = null;

// Makes the NEXT fetch blow up, to exercise the 502 branch.
function failNextFetch(error) {
  nextFetchError = error;
}

beforeEach(() => {
  calls = [];
  nextFetchError = null;
  process.env.MAPAPROP_API_TOKEN = 'token-de-prueba';
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (nextFetchError) {
      const error = nextFetchError;
      nextFetchError = null;
      throw error;
    }
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
  // The API requires these three and a browser cannot know them. 🔴 The ip is the LAST hop, not
  // the first: the first is whatever the CLIENT put in its own `X-Forwarded-For`, because nginx
  // appends rather than replaces. Here '200.1.2.3' is the spoofed value and '10.0.0.9' is what our
  // own edge added.
  assert.equal(sent.get('ip'), '10.0.0.9');
  assert.equal(sent.get('userAgent'), 'Mozilla/5.0 (prueba)');
  assert.equal(sent.get('referer'), 'https://misitio.com/propiedad.html?hash=abc');
  assert.equal(sent.get('url'), 'https://misitio.com/propiedad.html?hash=abc');
});

test('contact sale form-encoded, sin propertyHash y descartando el subject del cliente', async () => {
  const res = fakeRes();
  await handler(fakeReq({
    method: 'POST',
    path: ['contact'],
    body: {
      name: 'Ana', email: 'ana@example.com', message: 'Quiero vender mi depto',
      // las dos que el proxy TIENE que descartar
      subject: 'URGENTE: responder ya', propertyHash: 'abc',
    },
    headers: {
      'x-forwarded-for': '200.1.2.3, 10.0.0.9',
      'user-agent': 'Mozilla/5.0 (prueba)',
      referer: 'https://misitio.com/contacto/',
    },
  }), res);

  assert.equal(res.statusCode, 200);
  const { url, init } = calls[0];
  assert.ok(url.endsWith('/contact'), `fue a ${url}`);
  assert.equal(init.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const sent = new URLSearchParams(init.body);
  assert.equal(sent.get('name'), 'Ana');
  assert.equal(sent.get('message'), 'Quiero vender mi depto');
  // 🔴 lo que el visitante no puede elegir
  assert.equal(sent.get('subject'), null);
  assert.equal(sent.get('propertyHash'), null);
  // y los tres que pone el servidor
  assert.equal(sent.get('ip'), '10.0.0.9');
  assert.equal(sent.get('userAgent'), 'Mozilla/5.0 (prueba)');
  assert.equal(sent.get('referer'), 'https://misitio.com/contacto/');
  assert.equal(sent.get('url'), 'https://misitio.com/contacto/');
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


test('🔴 un X-Forwarded-For inventado por el visitante NO se usa como su ip', async () => {
  // Es el ataque concreto: el proxy manda ese valor a Mapaprop como la ip que su antispam puntua,
  // y ademas es la clave del throttle de escritura. Si gana el primer hop, el visitante elige su
  // propia identidad y estrena un cupo nuevo en cada envio.
  const res = fakeRes();
  await handler(fakeReq({
    method: 'POST',
    path: ['messages'],
    body: { message: 'Hola' },
    headers: { 'x-forwarded-for': '6.6.6.6, 6.6.6.7, 198.51.100.4' },
  }), res);
  assert.equal(new URLSearchParams(calls.at(-1).init.body).get('ip'), '198.51.100.4');
});

test('🔴 por defecto X-Real-IP se IGNORA: el visitante tambien la puede mandar', async () => {
  // Es la otra puerta del mismo spoofing. En la configuracion mas comun -- un nginx que setea
  // X-Forwarded-For y NO setea X-Real-IP -- preferirla siempre deja al visitante eligiendo su
  // identidad otra vez. El ultimo salto del XFF lo agrega siempre nuestro propio borde.
  delete process.env.TRUST_X_REAL_IP;
  const res = fakeRes();
  await handler(fakeReq({
    method: 'POST', path: ['messages'], body: { message: 'Hola' },
    headers: { 'x-real-ip': '6.6.6.6', 'x-forwarded-for': '9.9.9.9, 10.0.0.9' },
  }), res);
  assert.equal(new URLSearchParams(calls.at(-1).init.body).get('ip'), '10.0.0.9');
});

test('con TRUST_X_REAL_IP=1 si se usa: es opt-in de quien configuro el proxy', async () => {
  process.env.TRUST_X_REAL_IP = '1';
  try {
    const res = fakeRes();
    await handler(fakeReq({
      method: 'POST', path: ['messages'], body: { message: 'Hola' },
      headers: { 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '6.6.6.6, 10.0.0.9' },
    }), res);
    assert.equal(new URLSearchParams(calls.at(-1).init.body).get('ip'), '203.0.113.9');
  } finally {
    delete process.env.TRUST_X_REAL_IP;
  }
});

// ---------------------------------------------------------------------------------------------
// El gemelo de entrada de la proyeccion: lo que el visitante manda en el cuerpo viaja upstream CON
// EL TOKEN DE LA CUENTA. Vale el mismo argumento que la lista de rutas.
// ---------------------------------------------------------------------------------------------

test('🔴 una clave que el visitante inventa NO viaja upstream con el token', async () => {
  const res = fakeRes();
  await handler(fakeReq({
    method: 'POST', path: ['messages'],
    body: { propertyHash: 'abc', message: 'Hola', branchId: 7, userId: 99, customerId: 11458 },
  }), res);
  const sent = new URLSearchParams(calls.at(-1).init.body);
  assert.equal(sent.get('propertyHash'), 'abc');
  for (const inventada of ['branchId', 'userId', 'customerId']) {
    assert.equal(sent.get(inventada), null, `viajo "${inventada}" al backend`);
  }
});

test('🔴 seller-submissions: tampoco deja elegir a que sitio se asocia la captacion', async () => {
  const res = fakeRes();
  await handler(fakeReq({
    method: 'POST', path: ['seller-submissions'],
    body: { name: 'Ana', propertyType: 'Casa', websiteId: 999, loQueSea: 'x' },
  }), res);
  const sent = JSON.parse(calls.at(-1).init.body);
  assert.equal(sent.name, 'Ana');
  assert.equal(sent.propertyType, 'Casa');
  assert.equal(sent.websiteId, undefined, 'el visitante eligio el sitio destino');
  assert.equal(sent.loQueSea, undefined);
});

test('el filtro corre ANTES de rellenar la identidad, asi no se la puede excluir', async () => {
  const res = fakeRes();
  await handler(fakeReq({
    method: 'POST', path: ['messages'], body: { message: 'Hola', ip: '1.2.3.4' },
    headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.9', 'user-agent': 'UA' },
  }), res);
  const sent = new URLSearchParams(calls.at(-1).init.body);
  assert.equal(sent.get('ip'), '10.0.0.9', 'el cliente piso la ip');
  assert.equal(sent.get('userAgent'), 'UA');
});

test('🔴 el 502 no le cuenta al navegador contra que host fallo', async () => {
  // Un error de fetch arrastra el hostname que intento alcanzar. En un sitio apuntado a un backend
  // interno, devolverlo es regalar el mapa de la infraestructura.
  const res = fakeRes();
  failNextFetch(new Error('getaddrinfo ENOTFOUND backend-interno.corp'));
  await handler(fakeReq({ path: ['types'] }), res);
  assert.equal(res.statusCode, 502);
  const cuerpo = JSON.stringify(res.body);
  assert.ok(!cuerpo.includes('backend-interno.corp'), `el 502 filtro el host: ${cuerpo}`);
  assert.ok(!cuerpo.includes('ENOTFOUND'), `el 502 filtro el error crudo: ${cuerpo}`);
});

// ---------------------------------------------------------------------------------------------
// 🔴 Lo que el proxy devuelve lo puede leer CUALQUIERA: un visitante abre /api/mp/settings-v2 con
// curl, y con `s-maxage` el CDN se lo sirve desde el borde sin que la cuenta vea el pedido. El
// endpoint trae los datos FISCALES del titular (el CUIT) y las claves de Mapbox y reCAPTCHA de la
// cuenta. El kit usa seis campos; el resto no tiene por que salir.
// ---------------------------------------------------------------------------------------------

const SETTINGS_UPSTREAM = {
  customer: {
    name: 'Inmobiliaria Modelo', email: 'hola@ejemplo.test', phone1: '+54 11 5555-0100',
    mobile: '5491155550100', address: 'Av. Ejemplo 1234',
    zone1Description: 'Buenos Aires', zone2Description: 'CABA', tempRental: true,
    // Lo que NO puede salir:
    taxId: '20123456789', taxIdType: 'cuit', taxName: 'Modelo S.R.L.',
    taxAddress: 'Fiscal 999', taxCondition: 'responsable-inscripto',
    custId: 11458, websiteId: 329, seoUrl: 'inmobiliaria-modelo',
  },
  settings: [
    { category: 'mapbox', name: 'token', value: 'pk.eyJ1IjoiZWplbXBsbyJ9.secreto' },
    { category: 'reCaptchaV3', name: 'siteKey', value: '6LcEJEMPLOsitekey' },
  ],
};

function conSettings() {
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return {
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify(SETTINGS_UPSTREAM),
    };
  };
}

test('🔴 settings-v2 NO le entrega los datos fiscales del titular al navegador', async () => {
  conSettings();
  const res = fakeRes();
  await handler(fakeReq({ path: ['settings-v2'] }), res);

  assert.equal(res.statusCode, 200);
  const cuerpo = String(res.body);
  for (const secreto of ['20123456789', 'Modelo S.R.L.', 'Fiscal 999', 'responsable-inscripto', 'cuit']) {
    assert.ok(!cuerpo.includes(secreto), `settings-v2 filtro "${secreto}" al navegador`);
  }
});

test('🔴 settings-v2 tampoco entrega las claves de Mapbox y reCAPTCHA de la cuenta', async () => {
  // Son publicables por diseño, pero ESTE kit no usa ninguna de las dos: publicarlas es un costo
  // sin beneficio, y el token de Mapbox se consume como cuota ajena.
  conSettings();
  const res = fakeRes();
  await handler(fakeReq({ path: ['settings-v2'] }), res);
  const cuerpo = String(res.body);
  assert.ok(!cuerpo.includes('pk.eyJ'), 'salio el token de Mapbox');
  assert.ok(!cuerpo.includes('6LcEJEMPLO'), 'salio la site key de reCAPTCHA');
  assert.ok(!cuerpo.includes('settings'), 'salio el array settings[] entero');
});

test('settings-v2 SI entrega lo que el kit necesita para pintar la marca', async () => {
  conSettings();
  const res = fakeRes();
  await handler(fakeReq({ path: ['settings-v2'] }), res);
  const { customer } = JSON.parse(String(res.body));
  assert.equal(customer.name, 'Inmobiliaria Modelo');
  assert.equal(customer.email, 'hola@ejemplo.test');
  assert.equal(customer.phone1, '+54 11 5555-0100');
  assert.equal(customer.mobile, '5491155550100');
  assert.equal(customer.address, 'Av. Ejemplo 1234');
  assert.equal(customer.zone2Description, 'CABA');
  assert.equal(customer.tempRental, true);
});

test('🔴 un cuerpo que no parsea en una ruta proyectada NO se reenvia crudo', async () => {
  // Falla CERRADO: reenviarlo es exactamente lo que la proyeccion existe para evitar.
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => '<html>error</html>' };
  };
  const res = fakeRes();
  await handler(fakeReq({ path: ['settings-v2'] }), res);
  assert.equal(res.statusCode, 502);
  assert.ok(!String(JSON.stringify(res.body)).includes('<html>'), 'reenvio el cuerpo sin proyectar');
});

test('🔴 sin IP de visitante NO se throttlea a todos juntos', async () => {
  // Con una IP inventada ('0.0.0.0') todos los visitantes caen en el mismo bucket: el 11º envio de
  // CUALQUIERA devuelve 429 a todos, y el sintoma es indistinguible de un rate limit sano. Preferimos
  // dejar pasar -- el antispam de verdad corre del lado de Mapaprop -- y que el log lo diga.
  const sinIp = () => ({
    method: 'POST', url: '/api/mp/messages', query: { path: ['messages'] },
    body: { message: 'Hola' }, headers: { host: 'misitio.com' }, socket: {},
  });
  for (let i = 0; i < 15; i += 1) {
    const res = fakeRes();
    await handler(sinIp(), res);
    assert.equal(res.statusCode, 200, `el envio ${i + 1} fue rechazado sin poder identificar al visitante`);
  }
});

test('con IP, el throttle sigue cortando', async () => {
  const conIp = () => ({
    method: 'POST', url: '/api/mp/messages', query: { path: ['messages'] },
    body: { message: 'Hola' },
    headers: { host: 'misitio.com', 'x-forwarded-for': '203.0.113.77' },
    socket: { remoteAddress: '10.0.0.1' },
  });
  let rechazados = 0;
  for (let i = 0; i < 15; i += 1) {
    const res = fakeRes();
    await handler(conIp(), res);
    if (res.statusCode === 429) rechazados += 1;
  }
  assert.ok(rechazados > 0, 'el throttle dejo de cortar');
});

test('🔴 un telefono que llega como numero sale normalizado a string', async () => {
  // Un `.replace()` sobre un numero tira TypeError del lado del cliente. Se cierra en el borde, una
  // vez, en vez de en cada lugar que lo consume.
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({
        customer: { name: 'X', phone1: 541155550100, phone2: null, mobile: 5491155550100 },
      }),
    };
  };
  const res = fakeRes();
  await handler(fakeReq({ path: ['settings-v2'] }), res);
  const { customer } = JSON.parse(String(res.body));
  assert.equal(typeof customer.phone1, 'string', 'phone1 salio como numero');
  assert.equal(typeof customer.mobile, 'string', 'mobile salio como numero');
  assert.equal(customer.phone1, '541155550100');
  assert.equal(customer.phone2, null, 'un null no se convierte en la cadena "null"');
});
