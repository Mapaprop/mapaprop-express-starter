// Serves the fixtures in this folder as if they came from the Express API, so the kit runs with no
// token and no backend:
//
//   npm run dev:mock
//
// WHY THIS EXISTS: a Mapaprop API token belongs to a paying account. Without this, anyone who
// clones the repo can read the code and nothing else -- they cannot start it, cannot see their own
// change, and cannot tell whether they broke something.
//
// It is a SHAPE server, not a second implementation of the API. It honours the proxy's allowlist by
// importing it (one boundary, not two), pages and filters over the fixture so the UI is usable, and
// does not reproduce the API's search semantics: relevance, accents and stemming on `term` are the
// backend's and are not emulated here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAction, findRoute } from '../api/mp/[...path].js';

const DIR = path.dirname(fileURLToPath(import.meta.url));

function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), 'utf8'));
}

const warned = new Set();
function warnOnce(filter) {
  if (warned.has(filter)) return;
  warned.add(filter);
  console.log(`  [mock] el filtro "${filter}" no se emula (ver fixtures/README.md); se ignora.`);
}

const int = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

// Only the filters `properties` actually reads. A filter that silently did nothing would read as a
// broken filter, which is the one thing a preview must not teach.
function matches(property, query) {
  const eq = (key, field) => {
    if (!query[key]) return true;
    return int(property[field]) === int(query[key]);
  };
  const atLeast = (key, field) => {
    if (!query[key]) return true;
    return (int(property[field]) || 0) >= int(query[key]);
  };

  if (!eq('operation', 'operation') || !eq('type', 'type')) return false;
  if (!atLeast('bedrooms', 'bedrooms') || !atLeast('bathrooms', 'bathrooms')) return false;
  if (!eq('branchId', 'branchId')) return false;
  if (!eq('stateId', 'stateId') || !eq('countyId', 'countyId')) return false;
  // `cityId` is NOT emulated, and that is a measured fact about the API, not a shortcut: the
  // listing row carries `stateId` and `countyId` but no `cityId`, so there is nothing here to
  // compare against. The backend filters by it server-side. Ignoring it beats returning an empty
  // list, which would look like the filter is broken.
  if (query.cityId) warnOnce('cityId');

  const price = Number(property.price);
  if (query.priceFrom && !(price >= Number(query.priceFrom))) return false;
  if (query.priceTo && !(price <= Number(query.priceTo))) return false;

  if (query.term) {
    const haystack = [property.title, property.description, property.address, property.zone, property.code]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(String(query.term).toLowerCase())) return false;
  }
  return true;
}

// `total` is recomputed from the fixture instead of echoing the captured 818: a pager offering 41
// pages where only one has data is worse than a short honest list.
function page(list, query) {
  const from = Math.max(0, int(query.from) || 0);
  const size = Math.min(20, Math.max(1, int(query.size) || 20));
  return { took: 0, total: list.length, properties: list.slice(from, from + size) };
}

function propertyByHash(hash) {
  for (const name of ['properties', 'developments']) {
    const found = (fixture(name).properties || []).find((p) => p.propertyHash === hash);
    if (!found) continue;
    // The detail endpoint returns more than the listing does (branch, customer*, blueprints), so a
    // detail fixture is layered under the listing row rather than faking those fields.
    const base = fixture(found.development === true ? 'development-detail' : 'property-detail');
    return { ...base, ...found, developmentProperties: found.developmentProperties ?? base.developmentProperties };
  }
  return null;
}

// 🔴 `design` is the only fixture whose images are read through `brand.js`, and `usableImage()`
// there accepts ONLY absolute URLs. That filter is RIGHT for the real API: it returns the hero
// slides and the logo as paths relative to the customer's own Mapaprop site, and no Express action
// -- `settings-v2` included -- carries that site's domain, so there is nothing to resolve them
// against. From a third-party site those paths point at the third-party site and 404. In other
// words: with real data the hero is unusable today, and that is a measured limitation of the API,
// not of the kit.
//
// So the mock rewrites them against its OWN host. That is the one place where the mock is
// deliberately MORE capable than the API: it shows the hero the kit would paint the day the API
// returns a URL that can be used from outside. Documented in fixtures/README.md.
function absoluteImages(design, req) {
  // The scheme comes from `x-forwarded-proto`, not from a hardcoded "http". This server runs BEHIND
  // a TLS terminator in any real deployment (an ALB, nginx, Vercel), so its own socket is always
  // plain http even while the site is served over HTTPS -- sniffing the socket would get it wrong
  // in exactly the case that matters.
  //
  // Why it matters: an `http://` image inside an https page is MIXED CONTENT. The browser drops it
  // with no network error and no server-side trace, so the logo and the entire hero vanish while
  // every endpoint still answers 200. Measured in production on 2026-11-11 (express.mapaprop.com):
  // four blocked URLs, and the page looked broken with nothing in the logs to explain it.
  const forwarded = String(req.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwarded === 'https' || forwarded === 'http' ? forwarded : 'http';
  const origin = `${proto}://${req.headers?.host || 'localhost:3000'}`;
  const toUrl = (value) => (typeof value === 'string' && value.startsWith('/') ? origin + value : value);
  const images = design.images || {};
  return {
    ...design,
    images: {
      ...images,
      logo: toUrl(images.logo),
      slides: (images.slides || []).map((slide) => ({ ...slide, image: toUrl(slide.image) })),
    },
  };
}

export default async function handler(req, res) {
  const action = buildAction(req.query.path);
  if (!action) return res.status(400).json({ error: 'BAD_PATH', message: 'Ruta inválida.' });

  const route = findRoute(req.method, action);
  if (!route) {
    return res.status(404).json({
      error: 'NOT_ALLOWED',
      message: `La acción "${req.method} ${action}" no está habilitada en el proxy.`,
    });
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Mapaprop-Mock', '1');

  if (req.method === 'POST') {
    // Nothing leaves the machine, and nothing reaches anyone's CRM. The kit treats any response
    // without an error flag as success, so an empty object is enough -- inventing a richer payload
    // would be inventing a contract.
    // Se loguea lo que REALMENTE viajaría, o sea el cuerpo ya filtrado contra la lista de campos
    // de la ruta. Mostrar el crudo escondería la allowlist justo en el modo donde más se mira la
    // consola -- es el mismo motivo por el que el mock aplica la proyección de las respuestas.
    const enviado = {};
    for (const field of route.fields || []) {
      if (req.body?.[field] !== undefined) enviado[field] = req.body[field];
    }
    const descartadas = Object.keys(req.body || {}).filter((k) => !(k in enviado));
    console.log(`  [mock] ${action} recibido, NO se envió a ninguna parte:`, JSON.stringify(enviado).slice(0, 160));
    if (descartadas.length) {
      console.log(`  [mock] el proxy descartó estas claves (no están en la lista de la ruta): ${descartadas.join(', ')}`);
    }
    return res.status(200).json({});
  }

  try {
    if (action === 'properties') {
      const list = (fixture('properties').properties || []).filter((p) => matches(p, req.query));
      return res.status(200).json(page(list, req.query));
    }

    if (action.startsWith('properties/')) {
      const property = propertyByHash(decodeURIComponent(action.slice('properties/'.length)));
      if (!property) return res.status(404).json({ error: 'NOT_FOUND', message: 'Esa propiedad no está en las fixtures.' });
      return res.status(200).json(property);
    }

    if (action === 'developments') {
      return res.status(200).json(page(fixture('developments').properties || [], req.query));
    }

    if (action === 'development/properties') {
      const wanted = String(req.query.propertyIds || '').split(',').map((id) => int(id)).filter(Boolean);
      // Empty `propertyIds` is rejected by the API instead of returning the whole index, and that
      // is a security behaviour (it closed a cross-customer leak), so the mock rejects it too.
      if (!wanted.length) {
        return res.status(400).json({ error: 'SYSTEM_ERROR', description: 'Error: parametro propertyIds no definido.' });
      }
      // 🔴 Measured: the rows this endpoint returns do NOT carry `propertyId` -- the ids only exist
      // in the parent's `developmentProperties`. So the requested ids cannot be matched against the
      // response, and the fixture is served whole (it is the unit set of the captured development).
      warnOnce('propertyIds');
      return res.status(200).json(page(fixture('development-properties').properties || [], { ...req.query, from: 0 }));
    }

    if (action.startsWith('posts/')) {
      const url = decodeURIComponent(action.slice('posts/'.length));
      const meta = (fixture('posts').posts || []).find((p) => p.url === url);
      if (!meta) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ese post no está en las fixtures.' });
      // Same convention as `property-detail`: the fixtures carry ONE detail per action, so every
      // post is served with the same body. The METADATA is the requested post's own -- title,
      // cover, date and author -- so the page reads correctly and only the prose repeats.
      console.log(`  [mock] el cuerpo del post sale de post-detail.json; la metadata es la de "${url}".`);
      return res.status(200).json({ post: { ...meta, html: fixture('post-detail').post.html } });
    }

    if (action === 'design') {
      return res.status(200).json(absoluteImages(fixture('design'), req));
    }

    // The projection of a route is part of the SAME boundary as its allowlist, so the mock applies
    // it too: a fixture served whole would hide, in the one mode a contributor runs most, exactly
    // the leak that `pick` exists to close.
    const body = fixture(action);
    return res.status(200).json(route.pick ? route.pick(body) : body);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(501).json({
        error: 'NO_FIXTURE',
        message: `No hay fixture para "${action}". Agregá fixtures/${action}.json (ver fixtures/README.md).`,
      });
    }
    throw error;
  }
}
