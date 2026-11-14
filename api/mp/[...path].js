// Server-side proxy to the Mapaprop Express API.
//
// WHY THIS FILE EXISTS, and why the token is not in the browser:
// a Mapaprop account has exactly ONE API token, and it carries every scope the account's plan
// grants. On an account with the Property API add-on (service 46) that same token can also CREATE
// properties and PUBLISH them to portals, and it never expires. Shipping it to the browser would
// publish a permanent write credential. So the browser talks to this function, and only this
// function knows the token.
//
// Two bonuses: the visitor never needs the `cors` scope enabled, and this function can fill the
// three fields the POSTs require that a browser cannot know about itself (ip, user agent,
// referer).

// Production by default. `MAPAPROP_API_BASE` only exists so the kit can be pointed at a local
// backend while developing; a deployed site should never set it.
const API_BASE = process.env.MAPAPROP_API_BASE || 'https://mapaprop.app/api/action/express-v1';

// 🔴 El gemelo de entrada de `pick`: lo que el visitante manda en el cuerpo viaja upstream CON EL
// TOKEN DE LA CUENTA, asi que vale el mismo argumento que la lista de rutas -- "sin esa lista, algo
// armado a mano podria llegar mas lejos con tu token". Una clave que el endpoint lea y no este
// documentada (un `branchId`, un `userId` de asignacion) dejaria a un visitante dirigiendo el lead.
// Las dos listas salen de la wiki publica de cada endpoint, no de memoria.
const MESSAGE_FIELDS = [
  'propertyHash', 'name', 'email', 'phone', 'message',
  'url', 'ip', 'userAgent', 'referer',
];

// La consulta GENERICA (`POST contact`, nueva el 2026-11-13). Misma forma que `messages` menos el
// `propertyHash`, porque justamente no es sobre una propiedad.
//
// 🔴 `subject` NO esta en la lista, y es a proposito: el endpoint lo acepta y es opcional -- sin el
// arma "Nueva consulta general de <nombre>" -- pero es el ASUNTO DEL MAIL que le llega a la
// inmobiliaria. Dejarlo pasar le permite a un visitante elegir ese asunto, que es el mismo
// argumento por el que `websiteId` esta afuera de SELLER_FIELDS: el kit no lo necesita y regalarlo
// no compra nada. Si tu sitio de verdad necesita asuntos propios, agregalo aca deliberadamente.
const CONTACT_FIELDS = [
  'name', 'email', 'phone', 'message',
  'url', 'ip', 'userAgent', 'referer',
];

// The allowlist is a security boundary, not housekeeping. Without it, a crafted path could reach a
// different web service carrying the same token. Add a row here before using a new action.
const SELLER_FIELDS = [
  'name', 'email', 'phone', 'contactHours',
  'propertyType', 'propertyOperation', 'propertyAddress', 'propertyZone', 'propertyZipcode',
  'propertyBetweenStreets', 'propertyCurrency', 'propertyPrice', 'propertyBuildingArea',
  'propertyLandArea', 'propertyRooms', 'propertyBathrooms', 'propertyAmbiences',
  'propertyYearsOld', 'propertyStatus', 'propertyDescription', 'propertyLegalId',
  'propertyAttributes', 'propertyListed', 'propertyValuation', 'availabilityDate',
  'image', 'pdf',
  'domain', 'url', 'ip', 'userAgent', 'referer',
  // `websiteId` esta documentado y NO esta aca a proposito: el kit no lo manda, y dejarlo pasar
  // permitiria que un visitante elija a cual de tus sitios se asocia la captacion. Agregalo si tu
  // sitio de verdad necesita elegir.
];

const ROUTES = [
  // inventory
  { method: 'GET', match: /^properties$/, sMaxAge: 60 },
  { method: 'GET', match: /^properties\/[A-Za-z0-9_-]+$/, sMaxAge: 60 },
  // La lectura por propertyId. Existe porque el sitemap NO puede devolver el `hash` (el índice de
  // búsqueda no tiene ese campo), así que una ficha que se abre desde el sitemap llega por el id.
  { method: 'GET', match: /^properties\/id\/[0-9]+$/, sMaxAge: 60 },
  { method: 'GET', match: /^developments$/, sMaxAge: 60 },
  { method: 'GET', match: /^development\/properties$/, sMaxAge: 60 },
  // The showcase the agency arranged. The response IS the `properties` list -- same objects, same
  // shape -- so it gets the same 60s as the inventory and not the catalogs' day: the agency
  // reorders its featured properties and expects to see the new order.
  { method: 'GET', match: /^featureds$/, sMaxAge: 60 },
  // catalogs: the API caches these for a day upstream, so cache them here too
  { method: 'GET', match: /^types$/, sMaxAge: 86400 },
  { method: 'GET', match: /^operations$/, sMaxAge: 86400 },
  { method: 'GET', match: /^zones$/, sMaxAge: 86400 },
  { method: 'GET', match: /^branches$/, sMaxAge: 86400 },
  { method: 'GET', match: /^features$/, sMaxAge: 3600 },
  // the blog. `posts` already comes WITHOUT the body -- ExpressLogic#getPosts clears HTML, custId
  // and websiteId before answering -- so the list needs no projection here. The body travels only
  // in the detail. An hour of cache and not a day: an agency that publishes a post expects to see
  // it, and the upstream day-long cache is theirs to keep, not ours to extend.
  { method: 'GET', match: /^posts$/, sMaxAge: 3600 },
  { method: 'GET', match: /^posts\/[A-Za-z0-9_-]+$/, sMaxAge: 3600 },
  // identity and site design
  // 🔴 `settings-v2` is PROJECTED, not forwarded whole. See `pickSettings` below.
  { method: 'GET', match: /^settings-v2$/, sMaxAge: 3600, pick: pickSettings },
  { method: 'GET', match: /^design$/, sMaxAge: 3600 },
  // the two entry points: a lead on a property, and the seller form
  { method: 'POST', match: /^messages$/, sMaxAge: 0, form: true, fields: MESSAGE_FIELDS },
  // La tercera puerta: consulta general, sin propiedad. `form: true` como `messages` -- el endpoint
  // lee parametros de request, no JSON.
  { method: 'POST', match: /^contact$/, sMaxAge: 0, form: true, fields: CONTACT_FIELDS },
  { method: 'POST', match: /^seller-submissions$/, sMaxAge: 0, json: true, fields: SELLER_FIELDS },
];

// 🔴 Everything this proxy returns is readable by ANYONE: a visitor can open
// /api/mp/settings-v2 with curl, and with `s-maxage` the CDN serves it from the edge without the
// account ever seeing the request. So what the site does not use must not be forwarded.
//
// `settings-v2` is the one action where that matters. Besides the six fields the kit reads, it
// carries the account's TAX DATA -- `taxId` (the CUIT), `taxName`, `taxAddress`, `taxCondition` --
// and a `settings[]` array with the account's Mapbox token and reCAPTCHA site key. Those two keys
// are publishable by design (a browser needs them), but THIS KIT USES NEITHER, so publishing them
// is a cost with no benefit. The tax data is not publishable at all: for a monotributista the CUIT
// is their national id with a prefix.
//
// If you add a feature that needs another field, add it HERE, deliberately. The allowlist is the
// same idea as the route list above: say what goes out, not what does not.
const CUSTOMER_FIELDS = [
  'name', 'email', 'phone1', 'phone2', 'mobile',
  'address', 'zone1Description', 'zone2Description', 'zone3Description', 'zip',
  'tempRental', 'bio',
];

// Un telefono que llega como NUMERO rompe cualquier `.replace()` del otro lado. Se normaliza aca,
// en el borde, en vez de en cada lugar que lo consume: es un arreglo y no tres, y vale para
// cualquier consumidor futuro de este endpoint.
const PHONE_FIELDS = ['phone1', 'phone2', 'mobile'];

function pickSettings(payload) {
  const customer = payload?.customer;
  if (!customer || typeof customer !== 'object') return { customer: null };
  const out = {};
  for (const field of CUSTOMER_FIELDS) {
    if (customer[field] === undefined) continue;
    out[field] = PHONE_FIELDS.includes(field) && customer[field] !== null
      ? String(customer[field])
      : customer[field];
  }
  return { customer: out };
}

// Minimal in-process throttle for the write paths. Serverless instances are not shared, so this
// only slows down a single warm instance: it is a speed bump, not a defense. The real antispam runs
// on Mapaprop's side. If you want a stronger gate, reCAPTCHA v3 is the usual one -- note the kit
// does NOT wire it: the site key your account has configured no longer reaches the browser (it is
// not in CUSTOMER_FIELDS above), so you would add it to that list first, on purpose.
const UNKNOWN_IP = 'unknown';
const WRITE_WINDOW_MS = 60 * 1000;
const WRITE_MAX_PER_WINDOW = 10;
const writeHits = new Map();

function throttled(ip) {
  // Sin IP no se puede distinguir a un visitante de otro, asi que throttlear los juntaria a todos
  // en un cupo compartido y le rechazaria la consulta a un cliente real por una condicion que no
  // sabemos reproducir. Preferimos que pase y que el log grite: el antispam de verdad corre del
  // lado de Mapaprop, y este throttle esta declarado como lomo de burro, no como defensa.
  if (ip === UNKNOWN_IP) return false;
  const now = Date.now();
  const hits = (writeHits.get(ip) || []).filter((t) => now - t < WRITE_WINDOW_MS);
  hits.push(now);
  writeHits.set(ip, hits);
  if (writeHits.size > 500) writeHits.clear();
  return hits.length > WRITE_MAX_PER_WINDOW;
}

// 🔴 `X-Forwarded-For` is a header, so the CLIENT can send one. Reading its FIRST entry -- the
// usual reflex -- reads whatever the visitor typed: nginx's `$proxy_add_x_forwarded_for` APPENDS
// the real address to what arrived, so the first entry is attacker-controlled. That matters twice
// here: the throttle below is keyed by it, and the value is forwarded to Mapaprop as the `ip` its
// antispam scores. So we read the LAST entry, the one our own edge appended, and prefer
// `X-Real-IP` when the reverse proxy sets it (single value, overwritten on every hop).
//
// If you put a CDN in front of nginx, set `X-Real-IP` there or this returns the CDN's address.
// 🔴 `X-Real-IP` SOLO si lo pediste explicitamente. El codigo no puede distinguir si esa cabecera
// la puso tu reverse proxy o el visitante: si se prefiere siempre, alcanza con mandar un
// `X-Real-IP` distinto en cada pedido para volver al spoofing por la otra puerta -- y pasa
// justamente en la configuracion mas comun, un nginx que setea `X-Forwarded-For` y no setea
// `X-Real-IP`. El ultimo salto del XFF lo agrega SIEMPRE nuestro propio borde, asi que es la mas
// confiable de las dos sin pedir nada. Activalo con TRUST_X_REAL_IP=1 cuando sepas que tu proxy la
// escribe (la receta de nginx del README la escribe).
function visitorIp(req) {
  if (process.env.TRUST_X_REAL_IP === '1') {
    const real = req.headers['x-real-ip'];
    if (typeof real === 'string' && real.trim()) return real.trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const hops = forwarded.split(',').map((h) => h.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  // 🔴 Sentinela, NO una IP inventada. Si se llega aca, todos los visitantes se keyean con la misma
  // cadena y el throttle pasa a ser global: el 11º envio de CUALQUIERA devuelve 429 a todos, y eso
  // se lee exactamente igual que un rate limit sano. `0.0.0.0` lo escondia detras de algo plausible.
  const direct = req.socket?.remoteAddress;
  if (direct) return direct;
  console.warn('[proxy] sin IP de visitante: el throttle queda deshabilitado para este pedido');
  return UNKNOWN_IP;
}

// Path building and route lookup are exported so they can be tested on their own: this pair IS the
// security boundary, and a boundary that is never exercised is a boundary nobody has checked.
export function buildAction(segments) {
  const list = [].concat(segments || []);
  if (!list.length) return null;
  // Rebuilt from whitelisted segments only, so "..", a slash or an absolute URL can never widen
  // the upstream target.
  const safe = list.filter((s) => typeof s === 'string' && /^[A-Za-z0-9_-]+$/.test(s));
  if (safe.length !== list.length) return null;
  return safe.join('/');
}

export function findRoute(method, action) {
  if (!action) return null;
  return ROUTES.find((r) => r.method === method && r.match.test(action)) || null;
}

export default async function handler(req, res) {
  const token = process.env.MAPAPROP_API_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'MISSING_TOKEN',
      message:
        'Falta la variable de entorno MAPAPROP_API_TOKEN. Cargala en Vercel > Settings > Environment Variables con el token de Configuración > Token de API.',
    });
  }

  // Vercel hands the catch-all segments in req.query.path.
  const action = buildAction(req.query.path);
  if (!action) {
    return res.status(400).json({ error: 'BAD_PATH', message: 'Ruta inválida.' });
  }

  const route = findRoute(req.method, action);
  if (!route) {
    return res
      .status(404)
      .json({ error: 'NOT_ALLOWED', message: `La acción "${req.method} ${action}" no está habilitada en el proxy.` });
  }

  // Forward the caller's query string, minus the segments Vercel injected.
  const incoming = new URL(req.url, 'http://localhost');
  incoming.searchParams.delete('path');
  const upstream = new URL(`${API_BASE}/${action}`);
  incoming.searchParams.forEach((value, key) => upstream.searchParams.append(key, value));

  const init = {
    method: req.method,
    headers: { Authorization: `Bearer ${token}` },
  };

  if (req.method === 'POST') {
    const ip = visitorIp(req);
    if (throttled(ip)) {
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Demasiados envíos. Probá de nuevo en un minuto.' });
    }

    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    // Se filtra ANTES de rellenar la identidad, para que lo nuestro no se pueda excluir desde afuera.
    const sent = {};
    for (const field of route.fields) {
      if (body[field] !== undefined) sent[field] = body[field];
    }

    // The browser cannot know these three, and `messages` requires all of them for its antispam
    // check. Fill them here from the real request and ignore whatever the client sent.
    sent.ip = ip;
    sent.userAgent = req.headers['user-agent'] || 'unknown';
    sent.referer = req.headers.referer || req.headers.origin || 'direct';
    if (!sent.url) sent.url = sent.referer;
    if (route.json && !sent.domain) sent.domain = req.headers.host || '';

    if (route.form) {
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      init.body = new URLSearchParams(
        Object.entries(sent).filter(([, v]) => v !== undefined && v !== null && v !== '')
      ).toString();
    } else {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(sent);
    }
  }

  try {
    const upstreamResponse = await fetch(upstream, init);
    const text = await upstreamResponse.text();

    if (route.sMaxAge > 0 && upstreamResponse.ok) {
      res.setHeader('Cache-Control', `public, s-maxage=${route.sMaxAge}, stale-while-revalidate=60`);
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }
    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json');

    if (route.pick && upstreamResponse.ok) {
      // Fails CLOSED: a body we cannot parse is not forwarded as-is, because forwarding it is
      // exactly what the projection exists to prevent.
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        console.error('[proxy] unparseable body on a projected route:', action, error);
        return res.status(502).json({ error: 'UPSTREAM_UNAVAILABLE', message: 'No pudimos contactar a Mapaprop.' });
      }
      return res.status(upstreamResponse.status).send(JSON.stringify(route.pick(parsed)));
    }

    return res.status(upstreamResponse.status).send(text);
  } catch (error) {
    // The reason goes to the log, NOT to the browser: a fetch error can carry the hostname it tried
    // to reach, which on a site pointed at an internal backend is a free map of the infrastructure.
    console.error('[proxy] upstream unavailable:', error);
    return res
      .status(502)
      .json({ error: 'UPSTREAM_UNAVAILABLE', message: 'No pudimos contactar a Mapaprop.' });
  }
}
