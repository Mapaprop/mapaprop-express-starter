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
