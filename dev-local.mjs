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

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
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
  req.query = { path: url.pathname.replace('/api/mp/', '').split('/').filter(Boolean) };
  url.searchParams.forEach((value, key) => { req.query[key] = value; });
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(payload)); return res; };
  res.send = (text) => { res.end(text); return res; };
  return res;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/api/mp/')) {
    req.body = await readBody(req);
    adapt(req, res, url);
    try {
      await handler(req, res);
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'HANDLER_ERROR', message: String(error) }));
    }
    return;
  }

  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.join(PUBLIC_DIR, path.normalize(requested).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    res.end('No encontrado');
    return;
  }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
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
