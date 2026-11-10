// Guards the two things that rot in a hand-rolled i18n: a key that exists in one language and not
// in another, and inline markup that drifts away from the dictionary.
//
// The Spanish text stays inline in the HTML on purpose (the page reads before any module runs and
// with JavaScript off), so there ARE two copies of it. These tests are what keeps them equal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { STRINGS, t, lang, formatNumber, LANG_LABEL, LANG_SHORT } from '../public/js/i18n.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const LANGS = Object.keys(STRINGS);

const html = () => fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.html'))
  .map((f) => [f, fs.readFileSync(path.join(PUBLIC, f), 'utf8')]);

const js = () => fs.readdirSync(path.join(PUBLIC, 'js')).filter((f) => f.endsWith('.js'))
  .map((f) => [f, fs.readFileSync(path.join(PUBLIC, 'js', f), 'utf8')]);

test('los tres idiomas tienen exactamente las mismas claves', () => {
  const es = Object.keys(STRINGS.es).sort();
  assert.ok(es.length > 150, 'el diccionario quedo sospechosamente corto');
  for (const other of LANGS.filter((l) => l !== 'es')) {
    assert.deepEqual(Object.keys(STRINGS[other]).sort(), es, `${other} no tiene las mismas claves que es`);
  }
});

test('ningun valor quedo vacio en ningun idioma', () => {
  for (const l of LANGS) {
    for (const [key, value] of Object.entries(STRINGS[l])) {
      assert.ok(typeof value === 'string' && value.trim() !== '', `${l}.${key} esta vacio`);
    }
  }
});

test('los placeholders {x} de cada traduccion son los mismos que en es', () => {
  const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const l of LANGS.filter((x) => x !== 'es')) {
    for (const [key, value] of Object.entries(STRINGS.es)) {
      assert.deepEqual(vars(STRINGS[l][key]), vars(value),
        `${l}.${key} no interpola las mismas variables que es`);
    }
  }
});

test('toda clave con plural tiene sus dos formas en los tres idiomas', () => {
  const bases = new Set(Object.keys(STRINGS.es).filter((k) => k.endsWith('_one') || k.endsWith('_other'))
    .map((k) => k.replace(/_(one|other)$/, '')));
  assert.ok(bases.size > 5);
  for (const l of LANGS) {
    for (const base of bases) {
      assert.ok(STRINGS[l][`${base}_one`], `falta ${l}.${base}_one`);
      assert.ok(STRINGS[l][`${base}_other`], `falta ${l}.${base}_other`);
    }
  }
});

test('toda clave usada en el HTML existe en el diccionario', () => {
  const used = new Set();
  for (const [, source] of html()) {
    for (const m of source.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) used.add(m[1]);
  }
  assert.ok(used.size > 50, `el HTML solo declara ${used.size} claves: faltan textos sin marcar`);
  for (const key of used) {
    assert.ok(STRINGS.es[key] !== undefined, `el HTML usa "${key}" y no esta en es`);
  }
});

test('toda clave usada en el JS existe en el diccionario', () => {
  const used = new Set();
  for (const [file, source] of js()) {
    if (file === 'i18n.js') continue;
    // Only the literal calls can be checked statically; `specs.${key}` and friends are covered by
    // the plural test above.
    for (const m of source.matchAll(/\bt\('([a-zA-Z][\w.]*)'/g)) used.add(m[1]);
  }
  assert.ok(used.size > 50, `el JS solo usa ${used.size} claves`);
  for (const key of used) {
    const exists = STRINGS.es[key] !== undefined
      || STRINGS.es[`${key}_one`] !== undefined;
    assert.ok(exists, `el JS usa "${key}" y no esta en es`);
  }
});

test('🔴 el texto que quedo escrito en el HTML es EXACTAMENTE el del diccionario es', () => {
  let checked = 0;
  for (const [file, source] of html()) {
    for (const m of source.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)) {
      const [, key, inline] = m;
      assert.equal(inline.trim(), String(STRINGS.es[key]).trim(),
        `${file}: el texto inline de "${key}" no coincide con el diccionario`);
      checked += 1;
    }
    for (const m of source.matchAll(/data-i18n-placeholder="([^"]+)"\s+placeholder="([^"]*)"/g)) {
      assert.equal(m[2], STRINGS.es[m[1]], `${file}: el placeholder de "${m[1]}" no coincide`);
      checked += 1;
    }
    for (const m of source.matchAll(/data-i18n-content="([^"]+)"\s+content="([^"]*)"/g)) {
      assert.equal(m[2], STRINGS.es[m[1]], `${file}: el content de "${m[1]}" no coincide`);
      checked += 1;
    }
  }
  assert.ok(checked > 60, `solo se verificaron ${checked} textos`);
});

test('no quedan literales en castellano sueltos en el JS', () => {
  // Words that only appear in prose, never in an identifier or a key.
  const SPANISH = /'[^']*\b(Propiedades|propiedades|Emprendimiento|Sucursal|Consultar|Enviar|Buscar|Dormitorios|Teléfono|dormitorio|ambiente|cochera|Vendida|Alquilada|Reservada|pudimos|Todavía|quiero más)\b[^']*'/;
  for (const [file, source] of js()) {
    if (file === 'i18n.js') continue;
    const lines = source.split('\n');
    lines.forEach((line, index) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
      // The seller form sends the type and the operation as free text to the agency's CRM, which
      // reads them in its own language: translating those would file an unmatchable lead.
      if (file === 'vender.js' && /Casa|Venta/.test(line)) return;
      // A file name is not prose: `propiedades.html?operation=1` is a route, not a label.
      const candidate = line.replace(/'[^']*\.html[^']*'/g, "''");
      const hit = candidate.match(SPANISH);
      assert.ok(!hit, `${file}:${index + 1} tiene un literal en castellano: ${hit?.[0]}`);
    });
  }
});

test('el idioma por defecto es es, y una clave que falta cae a es', () => {
  assert.equal(lang, 'es');
  assert.equal(t('nav.home'), 'Inicio');
  assert.equal(t('clave.que.no.existe'), 'clave.que.no.existe');
});

test('el plural elige la forma por el valor de n', () => {
  assert.equal(t('specs.bedrooms', { n: 1 }), '1 dormitorio');
  assert.equal(t('specs.bedrooms', { n: 3 }), '3 dormitorios');
  assert.equal(t('pager.total', { n: 1 }), '1 propiedad');
  assert.equal(t('pager.total', { n: 0 }), '0 propiedades');
});

test('la interpolacion reemplaza lo que le pasan y deja lo que no', () => {
  assert.equal(t('detail.loadError', { message: 'timeout' }), 'No pudimos cargar la propiedad: timeout');
  assert.equal(t('detail.loadError'), 'No pudimos cargar la propiedad: {message}');
});

test('el formato de numero sigue al idioma y no trae moneda', () => {
  const formatted = formatNumber(1234567);
  assert.ok(/1[.,  ]?234/.test(formatted), `formato inesperado: ${formatted}`);
  assert.ok(!/USD|ARS|\$/.test(formatted), 'el formato de numero no debe inventar una moneda');
});

test('los textos de la API no estan en el diccionario', () => {
  // Amenity labels, property types and zone names arrive translated from the account. If any of
  // them showed up as a key here, the kit would be overriding the agency's own vocabulary.
  // Field names and a zone name -- not common nouns: "Departamentos por piso" is OUR label and
  // belongs here, so checking for the word "Departamento" was a bug in this test.
  const forbidden = ['propertyType', 'propertyOperation', 'attributes[]', 'Agronomía', 'Capital Federal'];
  const values = Object.values(STRINGS.es).join(' | ');
  for (const word of forbidden) {
    assert.ok(!values.includes(word), `el diccionario contiene "${word}", que viene de la API`);
  }
});

test('la atribucion es una marca: esta prendida, no se traduce y no es configurable', () => {
  const layout = fs.readFileSync(path.join(PUBLIC, 'js', 'layout.js'), 'utf8');
  assert.ok(layout.includes('Powered by Mapaprop API'), 'falta la atribucion en el footer');
  // Not a dictionary key and not read from config: a product name does not change language, and
  // the line has to survive a fork.
  for (const l of LANGS) {
    assert.ok(!Object.values(STRINGS[l]).some((v) => v.includes('Powered by Mapaprop')),
      `la atribucion esta en el diccionario de ${l}`);
  }
  assert.ok(!/SITE_CONFIG[^\n]*powered/i.test(layout));
});

// ---------------------------------------------------------------------------------------------
// El selector de idioma. `lang` y `languages` se resuelven UNA vez, al importar el modulo, asi que
// cada escenario necesita su propio proceso con sus propios globals: no alcanza con reasignar
// `globalThis.SITE_CONFIG` entre tests.
// ---------------------------------------------------------------------------------------------

const I18N_URL = new URL('../public/js/i18n.js', import.meta.url).href;

function enUnaPagina({ config = {}, search = '', stored = null, htmlLang = 'es' } = {}) {
  const script = `
    globalThis.SITE_CONFIG = ${JSON.stringify(config)};
    globalThis.location = { search: ${JSON.stringify(search)}, href: 'http://sitio/p.html' + ${JSON.stringify(search)} };
    globalThis.document = { documentElement: { lang: ${JSON.stringify(htmlLang)} } };
    let guardado = ${JSON.stringify(stored)};
    globalThis.localStorage = { getItem: () => guardado, setItem: (k, v) => { guardado = v; } };
    const m = await import(${JSON.stringify(I18N_URL)});
    console.log(JSON.stringify({
      lang: m.lang,
      languages: m.languages,
      htmlLang: globalThis.document.documentElement.lang,
      guardado,
    }));
  `;
  const salida = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  return JSON.parse(salida.trim().split('\n').pop());
}

test('languages descarta los codigos que el kit no habla y no repite', () => {
  const { languages } = enUnaPagina({ config: { languages: ['es', 'EN', 'en-US', 'de', 'pt'] } });
  assert.deepEqual(languages, ['es', 'en', 'pt']);
});

test('🔴 sin selector, lo guardado en el browser NO le gana al idioma configurado', () => {
  // Un sitio que ofrece un solo idioma no puede quedar en otro porque el visitante clickeo algo
  // en una version anterior del sitio. El valor sigue en localStorage y debe ser ignorado.
  const { lang: resultado } = enUnaPagina({ config: { lang: 'es' }, stored: 'en' });
  assert.equal(resultado, 'es');
});

test('🔴 sin selector, un ?lang= de un link ajeno tampoco cambia el idioma', () => {
  const { lang: resultado } = enUnaPagina({ config: { lang: 'es' }, search: '?lang=en' });
  assert.equal(resultado, 'es');
});

test('con selector, la eleccion del visitante le gana a la configuracion', () => {
  const { lang: resultado } = enUnaPagina({ config: { lang: 'es', languages: ['es', 'en'] }, stored: 'en' });
  assert.equal(resultado, 'en');
});

test('con selector, ?lang= le gana a lo guardado y queda recordado', () => {
  const r = enUnaPagina({ config: { languages: ['es', 'en', 'pt'] }, search: '?lang=pt', stored: 'en' });
  assert.equal(r.lang, 'pt');
  assert.equal(r.guardado, 'pt', 'el idioma que llego por link tiene que quedar recordado');
});

test('un idioma que el sitio NO ofrece se ignora aunque el kit lo hable', () => {
  const r = enUnaPagina({ config: { languages: ['es', 'en'] }, search: '?lang=pt', stored: 'pt' });
  assert.equal(r.lang, 'es');
});

test('el <html lang> queda sincronizado con el idioma que el kit realmente escribe', () => {
  const r = enUnaPagina({ config: { languages: ['es', 'en'] }, search: '?lang=en', htmlLang: 'es' });
  assert.equal(r.htmlLang, 'en', 'dejar lang="es" le miente al lector de pantalla y al buscador');
});

test('el kit arranca aunque localStorage explote (ventana privada, datos bloqueados)', () => {
  const script = `
    globalThis.SITE_CONFIG = { languages: ['es', 'en'] };
    globalThis.location = { search: '', href: 'http://sitio/p.html' };
    globalThis.document = { documentElement: { lang: 'es' } };
    globalThis.localStorage = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
    const m = await import(${JSON.stringify(I18N_URL)});
    console.log(m.lang);
  `;
  const salida = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(salida.trim(), 'es');
});

test('cada idioma tiene su nombre escrito EN ese idioma, no traducido', () => {
  for (const code of LANGS) {
    assert.ok(LANG_LABEL[code], `falta el nombre de ${code}`);
    assert.ok(LANG_SHORT[code], `falta la sigla de ${code}`);
  }
  assert.equal(LANG_LABEL.en, 'English');
  assert.equal(LANG_LABEL.pt, 'Português');
});

test('los idiomas que config.js ofrece son idiomas que el kit habla', () => {
  const config = fs.readFileSync(path.join(PUBLIC, 'js', 'config.js'), 'utf8');
  const declarados = /languages:\s*\[([^\]]*)\]/.exec(config);
  assert.ok(declarados, 'config.js dejo de declarar `languages`');
  for (const code of [...declarados[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1])) {
    assert.ok(STRINGS[code], `config.js ofrece "${code}" y el kit no lo habla`);
  }
});

test('🔴 las fotos de ejemplo no llevan texto: una imagen no se traduce', () => {
  const img = path.join(PUBLIC, 'img');
  const samples = fs.readdirSync(img).filter((f) => f.startsWith('placeholder-'));
  assert.ok(samples.length >= 4, 'desaparecieron las fotos de ejemplo');
  for (const file of samples) {
    const svg = fs.readFileSync(path.join(img, file), 'utf8');
    assert.ok(!/<text/.test(svg), `${file} tiene texto adentro: en ingles o portugues quedaria en castellano`);
  }
});
