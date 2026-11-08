// Local preview server. It exists so the kit can be opened without installing the Vercel CLI, and
// it dispatches to the SAME proxy handler that runs in production -- there is no second
// implementation of the token logic to drift.
//
//   npm run dev        ->  http://localhost:3000
//
// Reads the token from .env.local (same file name the Vercel CLI uses) and never prints it.
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

const { default: handler } = await import('./api/mp/[...path].js');

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

http.createServer(async (req, res) => {
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
}).listen(PORT, () => {
  const configured = Boolean(process.env.MAPAPROP_API_TOKEN);
  console.log(`\n  Sitio en  http://localhost:${PORT}`);
  console.log(`  API       ${process.env.MAPAPROP_API_BASE || 'https://mapaprop.app/api/action/express-v1'}`);
  console.log(`  Token     ${configured ? 'cargado desde .env.local' : '⚠️  FALTA: cargá MAPAPROP_API_TOKEN en .env.local'}\n`);
});
