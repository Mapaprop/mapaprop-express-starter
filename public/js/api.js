// Thin client over the proxy. Every call goes to our own origin: the token lives server-side.
const BASE = '/api/mp';

// Set once the proxy answers as the mock. It starts false, so a caller that asks before the first
// response gets the production answer -- which is the safe default: it caches.
let isMock = false;
export const servedByMock = () => isMock;

async function call(action, { params = {}, method = 'GET', body = null } = {}) {
  const url = new URL(`${BASE}/${action}`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });

  const init = { method };
  if (body) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  // The mock answers with `X-Mapaprop-Mock: 1`. Nothing in the kit BEHAVES differently because of
  // it -- that would make the demo stop being a demo. The one thing it is used for is not CACHING
  // a fixture for an hour while you are editing it (see brand.js).
  if (response.headers.get('X-Mapaprop-Mock') === '1') isMock = true;
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    // 🔴 El cuerpo NO se usa como mensaje. Cuando una capa de infraestructura corta -- un 413 del
    // host, un 502 de un balanceador -- contesta HTML, y pasarlo al visitante le muestra
    // "<!DOCTYPE html>..." en el formulario. Va al log, que es donde sirve.
    console.error('[api] respuesta que no es JSON:', response.status, text.slice(0, 300));
    payload = { error: 'BAD_RESPONSE' };
  }

  if (!response.ok) {
    const error = new Error(payload.message || payload.error || `HTTP ${response.status}`);
    error.status = response.status;
    // 🔴 Los dos POST no tienen la misma forma de error, y leer `error` primero rompe uno de los
    // dos: `messages` devuelve `{success:false, error:"INVALID_EMAIL"}` -- ahi `error` ES el codigo
    // -- y `seller-submissions` devuelve `{error:true, code:"NOT_FOUND"}` -- ahi `error` es un
    // booleano y el codigo esta en `code`. Con `payload.error || payload.code`, el `true` del
    // segundo cortaba el `||` y `code` quedaba en `true`, asi que ninguna comparacion contra un
    // codigo podia dar nunca.
    error.code = payload.code
      || (typeof payload.error === 'string' ? payload.error : null);
    error.payload = payload;
    throw error;
  }
  return payload;
}

export const api = {
  // Inventory. `size` is capped at 20 per request by the API; pass `from` to page through `total`.
  properties: (params) => call('properties', { params }),
  property: (hash) => call(`properties/${encodeURIComponent(hash)}`),
  developments: (params) => call('developments', { params }),
  developmentUnits: (propertyIds, params = {}) =>
    call('development/properties', { params: { ...params, propertyIds: [].concat(propertyIds).join(',') } }),

  // Catalogs. These return only what THIS account has in use, not the country catalog.
  types: () => call('types'),
  operations: () => call('operations'),
  zones: () => call('zones'),
  branches: () => call('branches'),

  // Identity and design. Both need an active website on the account; callers must tolerate a 400.
  settings: () => call('settings-v2'),
  design: () => call('design'),

  // The two entry points. `ip`, `userAgent` and `referer` are filled by the proxy.
  sendMessage: (payload) => call('messages', { method: 'POST', body: payload }),
  sendSellerSubmission: (payload) => call('seller-submissions', { method: 'POST', body: payload }),
};

export const PAGE_SIZE = 20; // hard cap of the API
