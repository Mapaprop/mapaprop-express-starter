// Serves /sitemap.xml for this site. It is a function and not a static file because the content is
// the account's own inventory: it changes when the agency publishes a property, and nobody is going
// to regenerate a file by hand.
//
// Why it runs here and not in the browser: the sitemap is read by crawlers, and a crawler does not
// run JavaScript before asking for it. It also needs the API token, which never leaves the server
// (same argument as the proxy next to this file).
const API_BASE = process.env.MAPAPROP_API_BASE || 'https://mapaprop.app/api/action/express-v1';

// The site's own sections. `changefreq`/`priority` are hints and crawlers largely ignore them, so
// only `priority` is set, and only to say which page matters most.
const SECTIONS = [
  { path: '/', priority: '1.0' },
  { path: '/propiedades', priority: '0.9' },
  { path: '/destacados', priority: '0.7' },
  { path: '/emprendimientos', priority: '0.7' },
  { path: '/vender', priority: '0.6' },
  { path: '/contacto', priority: '0.5' },
  { path: '/blog', priority: '0.5' },
];

async function fromApi(action, token) {
  const res = await fetch(`${API_BASE}/${action}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${action} answered ${res.status}`);
  return res.json();
}

function xmlEscape(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
}

// Mapaprop dates travel as `dd-MM-yyyy HH:mm:ss`; <lastmod> wants ISO (W3C Datetime). A value we
// cannot parse is DROPPED rather than guessed: a wrong date is worse than no date, because a
// crawler uses it to decide whether to come back.
function lastmod(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const iso = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return iso ? iso[0] : null;
}

function urlEntry(loc, mod, priority) {
  const parts = [`    <loc>${xmlEscape(loc)}</loc>`];
  if (mod) parts.push(`    <lastmod>${mod}</lastmod>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

export default async function handler(req, res) {
  const token = process.env.MAPAPROP_API_TOKEN;
  if (!token) {
    // Same reasoning as the proxy: a missing token is a configuration problem, and answering an
    // empty-but-valid sitemap would tell the crawler this site has no pages.
    res.status(503).send('MAPAPROP_API_TOKEN is not configured');
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  // Deployed, the platform sets the header. Running locally there is none, and defaulting to https
  // would print urls nobody can open.
  const proto = (req.headers['x-forwarded-proto']
    || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https')).split(',')[0];
  const base = `${proto}://${host}`;

  try {
    const [properties, postsPayload] = await Promise.all([
      fromApi('properties/sitemap', token),
      fromApi('posts', token).catch(() => []), // a site without a blog is not an error
    ]);
    // 🔴 The two shapes are NOT the same: `properties/sitemap` answers a bare array, `posts` answers
    // `{ "posts": [...] }`. Reading the second one as an array produced a sitemap with ZERO posts and
    // no error at all -- measured 2026-11-13 against a site that has them.
    const posts = Array.isArray(postsPayload) ? postsPayload : (postsPayload?.posts || []);

    const entries = SECTIONS.map((s) => urlEntry(base + s.path, null, s.priority));

    // Las fichas se publican por `propertyId` y no por `hash`: el sitemap no puede devolver el hash
    // (el índice de búsqueda no tiene ese campo), y para eso existe la lectura por id de la API.
    // `ficha.js` acepta los dos, así que un link viejo con `?hash=` sigue funcionando.
    for (const p of [].concat(properties || [])) {
      const id = p.propertyId;
      if (!id) continue;
      entries.push(urlEntry(`${base}/propiedad?id=${encodeURIComponent(id)}`,
        lastmod(p.lastUpdate || p.timestamp), '0.8'));
    }

    for (const post of [].concat(posts || [])) {
      if (!post.url) continue;
      entries.push(urlEntry(`${base}/post?url=${encodeURIComponent(post.url)}`,
        lastmod(post.date || post.timestamp), '0.4'));
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // One day of CDN cache: a crawler re-reads this often and every miss costs the account an API
    // call. A newly published property shows up within a day, which is what a sitemap is for.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=3600');
    res.status(200).send(
      `<?xml version="1.0" encoding="UTF-8"?>\n`
      + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
      + `${entries.join('\n')}\n</urlset>\n`);
  } catch (error) {
    // 🔴 NEVER answer a valid-but-empty sitemap. A crawler reads it as "this site has no pages" and
    // acts on it; a 5xx makes it keep the previous one and come back.
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send(`<!-- sitemap unavailable: ${xmlEscape(error.message)} -->`);
  }
}
