// Node server for the kit. It dispatches to the SAME proxy handler that runs on Vercel -- there is
// no second implementation of the token logic to drift. Three uses:
//
//   npm run dev:mock                                       -> fixtures, NO token and NO backend
//   npm run dev                                            -> local preview, http://localhost:3000
//   MAPAPROP_API_TOKEN=... PORT=3000 node dev-local.mjs     -> self-hosting, behind nginx/Apache
//
// The token comes from the environment, or from .env.local when the environment does not set it
// (same file name the Vercel CLI uses). It is never printed. In mock mode no token is read at all.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 🔴 Node 18 o más nuevo, y se chequea acá en vez de confiar en el `engines` del package.json:
// `engines` sólo avisa al instalar, y este kit no tiene dependencias, así que mucha gente nunca
// corre un `npm install`. Sin el chequeo, el proxy falla con `fetch is not defined` -- un mensaje
// que no dice qué hacer. Medido: la caja donde vamos a desplegar el demo trae Node 10.19.
const MAJOR = Number(process.versions.node.split('.')[0]);
if (MAJOR < 18) {
  console.error(`\n  Este kit necesita Node 18 o más nuevo, y estás corriendo ${process.versions.node}.`);
  console.error('  Node 18 es el primero que trae `fetch`, que es con lo que el proxy le habla a Mapaprop.');
  console.error('  Si no podés actualizar el Node del sistema, nvm es la salida más corta:');
  console.error('    nvm install 20 && nvm use 20\n');
  process.exit(1);
}

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);

for (const file of ['.env.local', '.env']) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

// `--mock` is a flag and not an env var so the npm script works the same on Windows.
const MOCK = process.argv.includes('--mock') || process.env.MAPAPROP_MOCK === '1';
const { default: handler } = MOCK
  ? await import('./fixtures/mock-handler.mjs')
  : await import('./api/mp/[...path].js');

// Leidas de vercel.json para que haya UNA sola definicion: dos copias de una CSP divergen, y la
// que se queda vieja es siempre la que nadie mira.
const SECURITY_HEADERS = Object.fromEntries(
  (JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers?.[0]?.headers || [])
    .map((h) => [h.key, h.value]),
);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

// 🔴 A body limit is not optional in a server that faces the internet. `seller-submissions` takes
// base64 attachments, so the body is legitimately large -- but without a ceiling a single request
// can buffer until the process dies. Vercel caps this for you at 4.5 MB; nothing does when you run
// this yourself behind nginx, which is a supported way to deploy the kit.
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 6 * 1024 * 1024);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        // PAUSE, do not destroy: destroying the request tears down the socket, and then the 413 we
        // are about to write never reaches the client -- it sees a connection reset and cannot tell
        // "too big" from "server died". The socket is closed after the response is flushed.
        req.pause();
        const error = new Error('BODY_TOO_LARGE');
        error.tooLarge = true;
        return reject(error);
      }
      chunks.push(chunk);
    });
    req.on('error', reject);
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      const type = req.headers['content-type'] || '';
      if (type.includes('json')) {
        try { return resolve(JSON.parse(raw)); } catch { return resolve({}); }
      }
      return resolve(Object.fromEntries(new URLSearchParams(raw)));
    });
  });
}

// Shapes a Node request/response pair like the one the Vercel runtime hands the function.
function adapt(req, res, url) {
  req.query = {};
  url.searchParams.forEach((value, key) => { req.query[key] = value; });
  // `path` is assigned AFTER the query string, never before: on Vercel it is the catch-all segment
  // list, so letting a `?path=` from the caller overwrite it would make this server pick a
  // different action than the URL says -- and then local and deployed stop behaving the same.
  req.query.path = url.pathname.replace('/api/mp/', '').split('/').filter(Boolean);
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(payload)); return res; };
  res.send = (text) => { res.end(text); return res; };
  return res;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/api/mp/')) {
    try {
      req.body = await readBody(req);
    } catch (error) {
      if (error?.tooLarge) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        // The rest of the upload is never read, so the connection cannot be reused: say so, and
        // drop it once the answer is out.
        res.setHeader('Connection', 'close');
        res.once('finish', () => req.destroy());
        res.end(JSON.stringify({ error: 'BODY_TOO_LARGE', message: 'El envío es demasiado grande.' }));
        return;
      }
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'BAD_REQUEST', message: 'No pudimos leer el pedido.' }));
      return;
    }
    adapt(req, res, url);
    try {
      await handler(req, res);
    } catch (error) {
      // The reason goes to the log, not to the visitor: an exception message can name an internal
      // host or a file path.
      console.error('[api] handler error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'HANDLER_ERROR', message: 'Error interno.' }));
    }
    return;
  }

  // A trailing slash is the same page: `/destacados/` and `/destacados` are one URL.
  const asked = url.pathname.replace(/\/+$/, '') || '/';
  const requested = asked === '/' ? '/index.html' : asked;
  let file = path.join(PUBLIC_DIR, path.normalize(requested).replace(/^(\.\.[/\\])+/, ''));
  // Clean URLs. The agency configures `/destacados` in Mapaprop, its websites-v3 site serves that
  // path, and an agency MIGRATING to this kit has `/destacados`, `/contacto` and `/vender` already
  // indexed -- answering 404 to those is losing traffic it already had. `cleanUrls` in vercel.json
  // does the same on the platform, so the demo and a Vercel deploy behave alike.
  // The containment check below runs on the RESOLVED path, so appending here cannot escape.
  if (!path.extname(file) && fs.existsSync(`${file}.html`)) file += '.html';
  // `startsWith(PUBLIC_DIR)` alone is not enough: a sibling directory called `public-anything`
  // also starts with it. The separator is what makes it mean "inside".
  if (!(file + path.sep).startsWith(PUBLIC_DIR + path.sep)
      || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    res.end('No encontrado');
    return;
  }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  // Las mismas cabeceras que declara vercel.json: si sólo viajaran ahí, la defensa dependería de
  // en qué plataforma desplegaste, y el self-hosting es un camino soportado.
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
  res.end(fs.readFileSync(file));
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n  El puerto ${PORT} ya está ocupado.`);
    console.error(`  Probá con otro:  PORT=${PORT + 1} npm run dev`);
    console.error('  O averiguá quién lo tiene:  ss -ltnp | grep :' + PORT + '\n');
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, () => {
  console.log(`\n  Sitio en  http://localhost:${PORT}`);
  if (MOCK) {
    console.log('  Datos    fixtures de ./fixtures (modo mock: sin token y sin backend)');
    console.log('  Ojo      los formularios NO envían nada a ningún CRM\n');
    return;
  }
  const configured = Boolean(process.env.MAPAPROP_API_TOKEN);
  console.log(`  API       ${process.env.MAPAPROP_API_BASE || 'https://mapaprop.app/api/action/express-v1'}`);
  console.log(`  Token     ${configured ? 'cargado' : '⚠️  FALTA: cargá MAPAPROP_API_TOKEN en .env.local o en el entorno, o probá sin token con npm run dev:mock'}\n`);
});
