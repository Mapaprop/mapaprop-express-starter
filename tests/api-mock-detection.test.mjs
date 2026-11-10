// El kit NO se comporta distinto porque le conteste el mock -- eso haria que el demo deje de ser un
// demo. La unica excepcion es no CACHEAR una fixture por una hora mientras la estas editando, y eso
// depende de detectar bien la cabecera. Medido: una pestaña abierta se quedo con una marca sin logo
// cuando la fixture ya tenia uno, y se leyo como "el cambio no funciono".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const API_URL = new URL('../public/js/api.js', import.meta.url).href;

function conRespuesta(headers) {
  const script = `
    globalThis.window = { location: { origin: 'http://sitio' } };
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: (name) => (${JSON.stringify(headers)})[name] ?? null },
      text: async () => '{}',
    });
    const m = await import(${JSON.stringify(API_URL)});
    const antes = m.servedByMock();
    await m.api.design();
    console.log(JSON.stringify({ antes, despues: m.servedByMock() }));
  `;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }).trim());
}

test('arranca asumiendo produccion: el default seguro es cachear', () => {
  assert.equal(conRespuesta({}).antes, false);
});

test('la cabecera X-Mapaprop-Mock marca la respuesta como del mock', () => {
  assert.equal(conRespuesta({ 'X-Mapaprop-Mock': '1' }).despues, true);
});

test('🔴 sin la cabecera NO se marca: contra la API real el kit cachea como siempre', () => {
  assert.equal(conRespuesta({}).despues, false);
});

test('un valor distinto de "1" no cuenta', () => {
  assert.equal(conRespuesta({ 'X-Mapaprop-Mock': '0' }).despues, false);
});

// ---------------------------------------------------------------------------------------------
// Los DOS POST no reportan el error de la misma forma, y la wiki lo documenta asi:
//   messages            -> { success: false, error: "INVALID_EMAIL" }   <- `error` ES el codigo
//   seller-submissions  -> { error: true, message: "...", code: "NOT_FOUND" }  <- `error` es bool
// Leer `error` primero deja `code` en `true` para el segundo, y entonces NINGUNA comparacion contra
// un codigo puede dar: toda la traduccion de errores de "Vender" queda inalcanzable.
// ---------------------------------------------------------------------------------------------

function conError(status, payload) {
  const script = `
    globalThis.window = { location: { origin: 'http://sitio' } };
    globalThis.fetch = async () => ({
      ok: false, status: ${status},
      headers: { get: () => null },
      text: async () => ${JSON.stringify(JSON.stringify(payload))},
    });
    const m = await import(${JSON.stringify(API_URL)});
    try { await m.api.sendSellerSubmission({}); }
    catch (e) { console.log(JSON.stringify({ code: e.code, status: e.status })); }
  `;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }).trim());
}

test('🔴 seller-submissions: el codigo sale de `code`, no del booleano `error`', () => {
  const e = conError(404, { error: true, message: 'Website not found', code: 'NOT_FOUND' });
  assert.equal(e.code, 'NOT_FOUND', 'sin esto, vender.js no puede explicar el error mas probable de esa pagina');
  assert.equal(e.status, 404);
});

test('messages: cuando `error` ES el codigo, se sigue leyendo de ahi', () => {
  const e = conError(400, { success: false, error: 'INVALID_EMAIL' });
  assert.equal(e.code, 'INVALID_EMAIL');
});

test('un error sin codigo de ninguna de las dos formas queda en null, no en true', () => {
  const e = conError(500, { error: true, message: 'boom' });
  assert.equal(e.code, null);
});

test('🔴 una respuesta que no es JSON nunca llega al visitante como texto', async () => {
  // Cuando corta una capa de infraestructura -- un 413 del host, un 502 de un balanceador -- el
  // cuerpo es HTML. Pasarlo como mensaje le muestra "<!DOCTYPE html>..." en el formulario a alguien
  // que acaba de respetar los dos limites que la pantalla le mostro.
  const script = `
    globalThis.window = { location: { origin: 'http://sitio' } };
    globalThis.console.error = () => {};
    globalThis.fetch = async () => ({
      ok: false, status: 413,
      headers: { get: () => 'text/html' },
      text: async () => '<!DOCTYPE html><html><head><title>413 Request Entity Too Large</title>',
    });
    const m = await import(${JSON.stringify(API_URL)});
    try { await m.api.sendSellerSubmission({}); }
    catch (e) { console.log(JSON.stringify({ code: e.code, message: e.message })); }
  `;
  const e = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }).trim());
  assert.equal(e.code, 'BAD_RESPONSE');
  assert.ok(!/DOCTYPE|<html|<title/i.test(e.message), `el HTML llego al mensaje: ${e.message}`);
});
