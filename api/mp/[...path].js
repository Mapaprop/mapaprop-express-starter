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
// three fields `POST messages` requires that a browser cannot know about itself (ip, user agent,
// referer).

// Production by default. `MAPAPROP_API_BASE` only exists so the kit can be pointed at a local
// backend while developing; a deployed site should never set it.
const API_BASE = process.env.MAPAPROP_API_BASE || 'https://mapaprop.app/api/action/express-v1';

// The allowlist is a security boundary, not housekeeping. Without it, a crafted path could reach a
// different web service carrying the same token. Add a row here before using a new action.
const ROUTES = [
  // inventory
  { method: 'GET', match: /^properties$/, sMaxAge: 60 },
  { method: 'GET', match: /^properties\/[A-Za-z0-9_-]+$/, sMaxAge: 60 },
  { method: 'GET', match: /^developments$/, sMaxAge: 60 },
  { method: 'GET', match: /^development\/properties$/, sMaxAge: 60 },
  // catalogs: the API caches these for a day upstream, so cache them here too
  { method: 'GET', match: /^types$/, sMaxAge: 86400 },
  { method: 'GET', match: /^operations$/, sMaxAge: 86400 },
  { method: 'GET', match: /^zones$/, sMaxAge: 86400 },
  { method: 'GET', match: /^branches$/, sMaxAge: 86400 },
  { method: 'GET', match: /^features$/, sMaxAge: 3600 },
  // identity and site design
  { method: 'GET', match: /^settings-v2$/, sMaxAge: 3600 },
  { method: 'GET', match: /^design$/, sMaxAge: 3600 },
  // the two entry points: a lead on a property, and the seller form
  { method: 'POST', match: /^messages$/, sMaxAge: 0, form: true },
  { method: 'POST', match: /^seller-submissions$/, sMaxAge: 0, json: true },
];

// Minimal in-process throttle for the write paths. Serverless instances are not shared, so this
// only slows down a single warm instance: it is a speed bump, not a defense. The real antispam runs
// on Mapaprop's side, and reCAPTCHA v3 is available if you want a stronger gate (see README).
const WRITE_WINDOW_MS = 60 * 1000;
const WRITE_MAX_PER_WINDOW = 10;
const writeHits = new Map();

function throttled(ip) {
  const now = Date.now();
  const hits = (writeHits.get(ip) || []).filter((t) => now - t < WRITE_WINDOW_MS);
  hits.push(now);
  writeHits.set(ip, hits);
  if (writeHits.size > 500) writeHits.clear();
  return hits.length > WRITE_MAX_PER_WINDOW;
}

function visitorIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '0.0.0.0';
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

    const sent = typeof req.body === 'object' && req.body !== null ? { ...req.body } : {};

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
    return res.status(upstreamResponse.status).send(text);
  } catch (error) {
    return res
      .status(502)
      .json({ error: 'UPSTREAM_UNAVAILABLE', message: 'No pudimos contactar a Mapaprop.', detail: String(error) });
  }
}
