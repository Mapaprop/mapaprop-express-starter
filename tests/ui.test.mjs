// Unit tests for the property-object conventions this kit has to respect. They run with Node's
// built-in runner, no dependencies: `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  amenities, blueprints, collectZones, cover, escapeHtml, money, multiline, num, photos, specs,
  statusBadge, videoEmbed, isActive, contrast, luminance, readableOn, safeUrl, siteUrl,
} from '../public/js/ui.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

test('num treats 0 as "not informed", because that is what the API means by it', () => {
  assert.equal(num(0), null);
  assert.equal(num('0'), null);
  assert.equal(num(undefined), null);
  assert.equal(num(''), null);
  assert.equal(num(3), 3);
  assert.equal(num('2'), 2);
});

test('a price of 0 or 1 reads as "Consultar precio", not as a number', () => {
  assert.equal(money(0, 'USD'), 'Consultar precio');
  assert.equal(money(1, 'USD'), 'Consultar precio');
  assert.equal(money(null, 'USD'), 'Consultar precio');
  assert.match(money(120000, 'USD'), /^USD/);
  assert.match(money(120000, 'USD'), /120\.000/); // es-AR grouping
});

test('blueprints are kept out of the photo gallery (image.type 2)', () => {
  const property = {
    images: [
      { image: 'a.jpg', thumbnail: 'a-t.jpg', type: 1 },
      { image: 'plan.jpg', thumbnail: 'plan-t.jpg', type: 2 },
      { image: 'b.jpg', thumbnail: 'b-t.jpg', type: 1 },
    ],
  };
  assert.equal(photos(property).length, 2);
  assert.equal(blueprints(property).length, 1);
  assert.equal(blueprints(property)[0].image, 'plan.jpg');
});

test('cover ignores a mainImage that is a bare filename or the placeholder', () => {
  // The detail endpoint can answer "noimage.gif" or a bare name; only a real URL is trusted.
  assert.equal(cover({ images: [], mainImage: 'noimage.gif' }), '');
  assert.equal(cover({ images: [], mainImage: '1342116.jpg' }), '');
  assert.equal(cover({ images: [], mainImage: 'https://x/photos/1.jpg' }), 'https://x/photos/1.jpg');
  assert.equal(
    cover({ images: [{ image: 'full.jpg', thumbnail: 'thumb.jpg', type: 1 }], mainImage: 'https://x/1.jpg' }),
    'thumb.jpg',
  );
});

test('commercial state is surfaced: the API returns sold and rented properties too', () => {
  assert.equal(statusBadge({ sold: true }), 'Vendida');
  assert.equal(statusBadge({ rented: true }), 'Alquilada');
  assert.equal(statusBadge({ reserved: true }), 'Reservada');
  assert.equal(statusBadge({ suspended: true }), 'Suspendida');
  assert.equal(statusBadge({}), '');
});

test('amenities prefer attributes[] (already translated) over the raw labels[] keys', () => {
  const withAttributes = {
    attributes: [
      { label: 'Parrilla', status: true },
      { label: 'Pileta', status: true },
      { label: 'Apagado', status: false },
    ],
    labels: ['grill', 'swimming-pool'],
  };
  assert.deepEqual(amenities(withAttributes), ['Parrilla', 'Pileta']);
  assert.deepEqual(amenities({ labels: ['party-saloon'] }), ['party saloon']);
  assert.deepEqual(amenities({}), []);
});

test('specs skip the fields the agency did not inform', () => {
  const list = specs({ ambiences: 3, bedrooms: 0, bathrooms: 1, buildingArea: 0, landArea: 250 });
  assert.deepEqual(list, ['3 ambientes', '1 baño', '250 m² de terreno']);
});

test('videoEmbed normalises the four shapes the API can return', () => {
  assert.equal(videoEmbed('https://www.youtube.com/watch?v=gLcP6qqulhA&ab_channel=X'),
    'https://www.youtube.com/embed/gLcP6qqulhA');
  assert.equal(videoEmbed('https://www.youtube.com/shorts/DV5mG3XGPZU'),
    'https://www.youtube.com/embed/DV5mG3XGPZU');
  assert.equal(videoEmbed('<iframe width="560" src="https://www.youtube.com/embed/abc123XYZ"></iframe>'),
    'https://www.youtube.com/embed/abc123XYZ');
  assert.equal(videoEmbed('https://my.matterport.com/show?play=1&m=CmhKN1eSdqR'),
    'https://my.matterport.com/show?play=1&m=CmhKN1eSdqR');
  // Anything that is not embeddable is dropped rather than rendered broken.
  assert.equal(videoEmbed(''), '');
  assert.equal(videoEmbed('<iframe></iframe>'), '');
  assert.equal(videoEmbed('javascript:alert(1)'), '');
});

test('text from the API is escaped, and typed line breaks survive', () => {
  assert.equal(escapeHtml('<script>x</script>'), '&lt;script&gt;x&lt;/script&gt;');
  assert.equal(multiline('uno\ndos'), 'uno<br>dos');
  assert.equal(multiline('<b>\n'), '&lt;b&gt;<br>');
});

test('collectZones walks states -> counties -> cities and orders by count', () => {
  const payload = {
    states: [{
      id: 1, description: 'Capital Federal', count: 30,
      counties: [{
        id: 18, description: 'Caballito', count: 20,
        cities: [{ id: 900, description: 'Centro', count: 5 }],
      }],
    }],
  };
  const zones = collectZones(payload);
  assert.deepEqual(zones.map((z) => [z.level, z.id, z.count]), [
    ['stateId', 1, 30],
    ['countyId', 18, 20],
    ['cityId', 900, 5],
  ]);
  assert.equal(zones[1].name, 'Caballito, Capital Federal');
  assert.deepEqual(collectZones({}), []);
  assert.deepEqual(collectZones(null), []);
});

test('only one nav item is active, even though three links share a page', () => {
  const search = (q) => new URLSearchParams(q);
  // On /propiedades?operation=1 only "Ventas" lights up.
  assert.equal(isActive('propiedades.html?operation=1', 'propiedades.html', search('operation=1')), true);
  assert.equal(isActive('propiedades.html?operation=2', 'propiedades.html', search('operation=1')), false);
  assert.equal(isActive('propiedades.html?operation=3', 'propiedades.html', search('operation=1')), false);
  // The plain listing is not any of the three operations.
  assert.equal(isActive('propiedades.html?operation=1', 'propiedades.html', search('')), false);
  assert.equal(isActive('index.html', 'index.html', search('')), true);
  assert.equal(isActive('index.html', 'contacto.html', search('')), false);
});

test('a pale palette does not become unreadable text', () => {
  // Measured on a real account: primary #dfe1d6 over white is a 1.32 ratio.
  assert.ok(contrast('#dfe1d6', '#ffffff') < 1.5);
  assert.ok(contrast('#9d0c21', '#ffffff') > 4.5);
  // With a pale primary the accent falls through to the secondary.
  assert.equal(readableOn('#ffffff', ['#dfe1d6', '#9d0c21', '#16202b']), '#9d0c21');
  // With a dark primary it is kept.
  assert.equal(readableOn('#ffffff', ['#195fa9', '#4a7fe8', '#16202b']), '#195fa9');
  // If nothing passes, the last candidate is the guaranteed-dark ink.
  assert.equal(readableOn('#ffffff', ['#eeeeee', '#dddddd', '#16202b']), '#16202b');
  // Garbage from the API must not blow up the page.
  assert.equal(luminance('nope'), null);
  assert.equal(contrast('nope', '#ffffff'), 0);
  assert.equal(readableOn('#ffffff', [null, undefined, '#16202b']), '#16202b');
});

// --- Contraste de superficies llenas ----------------------------------------------------------
// Regresion medida el 2026-11-10 mirando el demo renderizado: `design` devolvio `primary: #ededed`
// y NINGUN `primaryText`, asi que el default blanco dejo los botones "Buscar" y "Enviar consulta"
// en blanco sobre casi-blanco. El contraste ya se derivaba para el TEXTO sobre fondo blanco
// (--accent-ink) pero no para el texto SOBRE una superficie llena.
test('el texto de un boton es legible aunque la paleta de la cuenta sea palida', () => {
  const derive = (bg, configured) => readableOn(bg, [configured, '#ffffff', '#16202b']);

  const pale = derive('#ededed', undefined);
  assert.ok(contrast(pale, '#ededed') >= 4.5, `un boton palido quedo en ${contrast(pale, '#ededed')}`);

  // Lo que la inmobiliaria configuro gana cuando se lee.
  assert.equal(derive('#195fa9', '#ffffff'), '#ffffff');
  // Y pierde cuando no.
  assert.notEqual(derive('#ededed', '#ffffff'), '#ffffff');
});

// ---------------------------------------------------------------------------------------------
// safeUrl: escapeHtml alcanza para no ROMPER un atributo, no para decidir si un href es seguro.
// `javascript:alert(1)` no tiene ninguno de los cinco caracteres que escapeHtml reemplaza, asi que
// lo atraviesa intacto. Los links sociales los tipea a mano cualquier usuario de la cuenta en el
// admin de Mapaprop y le llegan a TODO visitante del sitio publico: es XSS almacenado.
// ---------------------------------------------------------------------------------------------

test('🔴 safeUrl descarta todo lo que no sea http(s)', () => {
  for (const peligroso of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    '  javascript:alert(1)',
    '\njavascript:alert(1)',
    '\tjavascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ]) {
    assert.equal(safeUrl(peligroso), '', `safeUrl dejo pasar ${JSON.stringify(peligroso)}`);
  }
});

test('safeUrl deja pasar lo legitimo, y nada mas', () => {
  assert.equal(safeUrl('https://instagram.com/inmobiliaria'), 'https://instagram.com/inmobiliaria');
  assert.equal(safeUrl('http://ejemplo.test/x?a=1'), 'http://ejemplo.test/x?a=1');
});

test('🔴 un valor vacio NO se convierte en un link a la pagina actual', () => {
  // Resolver "" contra la base devuelve la URL actual: un link social que la inmobiliaria nunca
  // configuro quedaria apuntando al propio sitio.
  for (const vacio of ['', '   ', null, undefined]) {
    assert.equal(safeUrl(vacio), '', `safeUrl invento un link para ${JSON.stringify(vacio)}`);
  }
});

// 🔴 El guard que importa NO es "brand.js valida las redes": es que NINGUN href construido con
// dato de la API se escriba sin validar el esquema. El primer arreglo tapo el sink de las redes y
// dejo pasar el del boton de la home, que era identico. Un test por sink no cierra una clase de
// bug; esto barre TODOS los archivos y falla con el que falte.
const HREF_PERMITIDOS = [
  // Esquema fijo escrito por nosotros: el dato no puede elegir el protocolo.
  /^(['"`]?)(tel|mailto|https?):/i,
  /^`https:\/\//,
  // Helpers que ya garantizan la forma.
  /^\$\{safeUrl\(/,
  /^\$\{escapeHtml\(safeUrl\(/,
  // `siteUrl` traduce las rutas del sitio Mapaprop a las paginas del kit. Entra aca porque sus
  // TRES salidas son seguras y estan probadas abajo: un literal de SITE_ROUTES escrito por
  // nosotros, lo que devuelva safeUrl, o vacio. Si alguna vez deja de cumplirlo, el test de
  // "siteUrl nunca devuelve un esquema peligroso" se pone en rojo antes que este.
  /^\$\{escapeHtml\(siteUrl\(/,
  /^\$\{propertyUrl\(/,
  // Rutas literales del propio kit: el dato entra por query, no elige el destino.
  /^`?[a-z0-9._-]+\.html/i,
  /^\$\{l\.href\}/,
  // `url("…")` de CSS con el valor ya validado.
  /^`url\("\$\{safeUrl\(/,
  // Asignacion por propiedad: ahi el valor es una expresion pelada, no un template literal.
  /^safeUrl\(/,
  /^escapeHtml\(safeUrl\(/,
  /^['"][^'"]*['"]\s*;?$/,
];

// ⚠️ Los atributos de este repo se parten en varias lineas (ficha.js abre `data-full=` y cierra
// `class=` en el renglon siguiente), asi que un barrido por linea pierde cualquier caso donde el
// `href="` quede al final de un renglon. Por eso se colapsan los saltos antes de buscar.
// Valvula de escape EXPLICITA: un sink cuyo esquema esta garantizado de otra forma se marca con
// `// url-ok: <motivo>` en la linea de arriba. Es a proposito que haya que escribir el motivo y que
// viva PEGADO al codigo: una excepcion por nombre de variable, metida en este archivo, queda lejos
// de lo que exceptua y nadie la vuelve a mirar.
// Se busca sobre el codigo ORIGINAL, no sobre el colapsado: el marcador tiene que valer para el
// sink que viene DEBAJO, y medir por distancia en caracteres depende del largo del comentario.
function marcadosConValvula(codigo) {
  const lineas = codigo.split('\n');
  const alcanzados = [];
  lineas.forEach((linea, i) => {
    if (!/\/\/ url-ok:\s*\S.{3,}/.test(linea)) return;   // exige que haya un motivo escrito
    alcanzados.push(lineas.slice(i + 1, i + 7).join(' '));
  });
  return alcanzados;
}

function sinksDeUrl(codigo) {
  const plano = codigo.replace(/\s*\n\s*/g, ' ');
  const valvulas = marcadosConValvula(codigo);
  const exceptuado = (valor) => valvulas.some((bloque) => bloque.includes(valor));
  const out = [];
  // 1) atributos: href= y src= (un <iframe src> enmarca contenido arbitrario, no es solo decorado)
  for (const m of plano.matchAll(/\b(href|src)\s*=\s*["']?(\$\{[^"'>]{0,120})/g)) {
    out.push({ tipo: m[1], valor: m[2].trim(), index: m.index, exceptuado: exceptuado(m[2].trim()) });
  }
  // 2) asignacion por PROPIEDAD: invisible a cualquier barrido de atributos
  for (const m of plano.matchAll(/\.(href|src)\s*=\s*([^;\n]{0,120})/g)) {
    if (/\.(href|src)\s*=\s*=/.test(m[0])) continue;   // comparacion, no asignacion
    out.push({ tipo: 'prop', valor: m[2].trim(), index: m.index, exceptuado: exceptuado(m[2].trim()) });
  }
  // 3) url() de CSS: tampoco es href ni src
  for (const m of plano.matchAll(/backgroundImage\s*=\s*([^;\n]{0,120})/g)) {
    out.push({ tipo: 'css-url', valor: m[1].trim(), index: m.index, exceptuado: exceptuado(m[1].trim()) });
  }
  return out;
}

test('🔴 ningun href, src, .href=, .src= ni url() de CSS se arma sin validar el esquema', () => {
  const sospechosos = [];
  for (const archivo of fs.readdirSync(path.join(PUBLIC, 'js')).filter((f) => f.endsWith('.js'))) {
    const codigo = fs.readFileSync(path.join(PUBLIC, 'js', archivo), 'utf8');
    for (const sink of sinksDeUrl(codigo)) {
      // 🔴 El `${` solo se exige en los ATRIBUTOS. Una asignacion por propiedad
      // (`el.src = thumb.dataset.full`) no usa template literal, asi que pedirselo dejaba ciego al
      // barrido justo en la familia de sinks que un grep de atributos ya no ve. Lo aprendi
      // mutando: el arreglo estaba puesto y el test no lo defendia.
      if (sink.tipo !== 'prop' && sink.tipo !== 'css-url' && !sink.valor.includes('${')) continue;
      if (HREF_PERMITIDOS.some((re) => re.test(sink.valor))) continue;
      if (sink.exceptuado) continue;
      sospechosos.push(`${archivo}  ${sink.tipo}=${sink.valor.slice(0, 70)}`);
    }
  }
  assert.deepEqual(sospechosos, [],
    'un sink de URL se arma con una expresion que no pasa por safeUrl ni por un esquema fijo:\n  '
    + sospechosos.join('\n  '));
});

test('🔴 y el barrido de hrefs detecta de verdad un sink sin validar', () => {
  // Valida el test de arriba: si el escaner no reconoce este patron, no reconoce ninguno.
  const malo = 'host.innerHTML = `<a href="${escapeHtml(block.buttonLink)}">x</a>`;';
  const valor = /href=(?:"|')?([^"'\n]{0,80})/.exec(malo)[1].trim();
  assert.ok(valor.includes('${'), 'el escaner no vio la interpolacion');
  assert.ok(!HREF_PERMITIDOS.some((re) => re.test(valor)),
    'el escaner acepta escapeHtml() solo, que es justo el bug que buscamos');
});

test('🔴 los ids y counts de zona llegan como numeros: se interpolan en un href sin escapar', () => {
  const zonas = collectZones({
    states: [{
      id: '21" onmouseover="alert(1)', description: 'Santa Fe', count: '5',
      counties: [{ id: '312"x', description: 'Rosario', count: 'x' }],
    }],
  });
  for (const z of zonas) {
    assert.equal(typeof z.id, 'number', `el id de ${z.name} no es numero: ${JSON.stringify(z.id)}`);
    assert.equal(typeof z.count, 'number', `el count de ${z.name} no es numero`);
    assert.ok(!String(z.id).includes('"'), 'un id con comillas llegaria al atributo href');
  }
});

test('🔴 videoEmbed decide Matterport por el HOST, no por el string', () => {
  // Es el unico caso que devuelve la URL cruda, asi que es el unico donde un regex suelto deja
  // enmarcar contenido ajeno dentro de la ficha del cliente.
  assert.ok(videoEmbed('https://my.matterport.com/show/?m=abc'));
  assert.ok(videoEmbed('https://matterport.com/show/x'));
  for (const falso of [
    'https://evil.example/phishing?r=matterport.com/show',
    'https://evil.example/x#matterport.com/show',
    '<iframe src="https://evil.example/x?u=matterport.com/show"></iframe>',
    'https://matterport.com.evil.example/show/x',
    'https://my.matterport.com/otra-cosa',
  ]) {
    assert.equal(videoEmbed(falso), '', `videoEmbed embebio ${falso}`);
  }
});

// 🔴 `t` es la funcion de i18n y esta importada en casi todos los archivos. Un `.forEach((t) => …)`
// la tapa, y un parametro renombrado a medias deja el CUERPO usando la funcion como si fuera el
// dato: `t.id` es `undefined` y no explota. Paso de verdad en home.js, y la home se veia bien en
// una captura porque un <select> CERRADO no muestra sus opciones. Esto lo mira en el codigo.
test('🔴 ningun archivo usa `t` como si fuera un dato (la funcion de i18n, tapada por un parametro)', () => {
  const sospechosos = [];
  for (const archivo of fs.readdirSync(path.join(PUBLIC, 'js')).filter((f) => f.endsWith('.js'))) {
    if (archivo === 'i18n.js') continue;
    const codigo = fs.readFileSync(path.join(PUBLIC, 'js', archivo), 'utf8');
    if (!/\bimport\s*\{[^}]*\bt\b[^}]*\}\s*from\s*'\.\/i18n\.js'/.test(codigo)) continue;
    for (const match of codigo.matchAll(/\bt\.[A-Za-z_$][\w$]*/g)) {
      const linea = codigo.slice(0, match.index).split('\n').length;
      sospechosos.push(`${archivo}:${linea}  ${match[0]}`);
    }
  }
  assert.deepEqual(sospechosos, [],
    '`t` se esta usando como objeto; o es la funcion de i18n tapada por un parametro, o un '
    + 'parametro llamado `t` que deberia tener un nombre propio:\n  ' + sospechosos.join('\n  '));
});

test('🔴 ningun parametro de callback se llama `t` y tapa la funcion de i18n', () => {
  const sospechosos = [];
  for (const archivo of fs.readdirSync(path.join(PUBLIC, 'js')).filter((f) => f.endsWith('.js'))) {
    if (archivo === 'i18n.js') continue;
    const codigo = fs.readFileSync(path.join(PUBLIC, 'js', archivo), 'utf8');
    for (const match of codigo.matchAll(/\(\s*t\s*(?:,[^)]*)?\)\s*=>/g)) {
      const linea = codigo.slice(0, match.index).split('\n').length;
      sospechosos.push(`${archivo}:${linea}`);
    }
  }
  assert.deepEqual(sospechosos, [], `un callback usa \`t\` como parametro:\n  ${sospechosos.join('\n  ')}`);
});

test('🔴 el orden es escapeHtml(safeUrl(x)), nunca al reves', () => {
  // `safeUrl` parsea con `new URL`. Si le llega el string YA escapado, el `&amp;` entra como parte
  // del query y vuelve literal en el link: se rompe todo href con mas de un parametro, que es
  // justo el caso de los links sociales. Un test que solo exija que aparezca `safeUrl(` deja pasar
  // el orden invertido en verde.
  const conDosParametros = 'https://ejemplo.test/x?a=1&b=2';
  assert.equal(escapeHtml(safeUrl(conDosParametros)), 'https://ejemplo.test/x?a=1&amp;b=2');
  assert.ok(safeUrl(escapeHtml(conDosParametros)).includes('&amp;'),
    'si esto deja de ser cierto, el orden invertido ya no rompe y este test sobra');
});

test('🔴 ningun archivo invierte el orden a safeUrl(escapeHtml(...))', () => {
  const culpables = [];
  for (const archivo of fs.readdirSync(path.join(PUBLIC, 'js')).filter((f) => f.endsWith('.js'))) {
    const codigo = fs.readFileSync(path.join(PUBLIC, 'js', archivo), 'utf8');
    if (/safeUrl\s*\(\s*escapeHtml\s*\(/.test(codigo)) culpables.push(archivo);
  }
  assert.deepEqual(culpables, [], `el orden invertido rompe los links con mas de un parametro: ${culpables.join(', ')}`);
});

// Los ids que entran a un ATRIBUTO se coercionan en el origen (collectZones) o en el sink. El
// renglon de al lado escapa el TEXTO y no el atributo, que es justo el patron que alguien copia.
test('🔴 ningun id de catalogo entra crudo a un atributo value=', () => {
  const crudos = [];
  for (const archivo of ['home.js', 'listado.js', 'emprendimientos.js']) {
    const codigo = fs.readFileSync(path.join(PUBLIC, 'js', archivo), 'utf8').replace(/\s*\n\s*/g, ' ');
    for (const m of codigo.matchAll(/value="\$\{([^}]{0,60})\}/g)) {
      const expr = m[1].trim();
      if (/^(Number\(|escapeHtml\(|index$|z\.level)/.test(expr)) continue;
      crudos.push(`${archivo}  value="\${${expr}}"`);
    }
  }
  assert.deepEqual(crudos, [], `un id de la API entra crudo a un atributo:\n  ${crudos.join('\n  ')}`);
});

test('🔴 el chrome se inyecta ANTES de pintar la marca, y pintar no puede tumbarlo', () => {
  // ⚠️ El orden es lo que protege la atribucion, no el catch: el footer se inyecta nueve lineas
  // antes de que `applyBrand` pueda tirar. Si alguien invirtiera ese orden -- pintar primero,
  // inyectar despues -- un `mobile` numerico o un `colors` nulo se llevarian puesto el footer, y
  // con el la atribucion, que es un requisito del producto. Por eso el assert del orden es el que
  // importa; los dos `try` son la red de abajo.
  const codigo = fs.readFileSync(path.join(PUBLIC, 'js', 'layout.js'), 'utf8');
  const cuerpo = codigo.slice(codigo.indexOf('export async function layout'));
  assert.match(cuerpo, /try\s*\{\s*data = await getBrand\(\)/, 'getBrand() quedo sin proteger');
  assert.match(cuerpo, /try\s*\{\s*applyBrand\(data\)/, 'applyBrand() quedo sin proteger');
  const insert = cuerpo.indexOf('insertAdjacentHTML');
  assert.ok(insert > 0 && insert < cuerpo.indexOf('applyBrand(data)'),
    'el chrome tiene que inyectarse ANTES de pintar la marca');
});

test('🔴 applyBrand aguanta una respuesta con forma inesperada', () => {
  // Medido: `colors` ausente o nulo y un `mobile` numerico tiraban TypeError, y eso se llevaba
  // puesto el chrome entero.
  const codigo = fs.readFileSync(path.join(PUBLIC, 'js', 'brand.js'), 'utf8');
  assert.ok(!/brand\.colors\.[a-z]/i.test(codigo),
    'se accede a brand.colors.* sin el default: un `colors` nulo tumba el pintado');
  assert.match(codigo, /String\(brand\.whatsapp\)\.replace/,
    'un `mobile` numerico rompe el .replace');
});

test('🔴 la home declara un hueco por cada call-to-action que manda la API, y el renderer no los recorta', () => {
  // Medido en produccion el 2026-11-11: el sitio PHP del MISMO website (basic.mapaprop.com, website
  // 891) mostraba TRES call-to-action y el kit dos. La API manda tres en `design.callToActions`,
  // los tres con `enabled: true`, y el kit los perdia por DOS topes simultaneos: `blocks.slice(0, 2)`
  // en home.js y solo dos `cta-N` en el HTML. Arreglar uno solo no cambia nada visible, por eso el
  // test mira los dos: es la unica forma de que falle si alguien revierte cualquiera de los dos.
  const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  const huecos = [...html.matchAll(/id="cta-(\d+)"/g)].map((m) => Number(m[1])).sort();
  assert.deepEqual(huecos, [1, 2, 3], 'la home tiene que declarar cta-1, cta-2 y cta-3');
  for (const n of huecos) {
    assert.ok(html.includes(`id="cta-${n}-wrap"`), `cta-${n} no tiene su wrap: wrap.hidden revienta`);
  }

  const home = fs.readFileSync(path.join(PUBLIC, 'js', 'home.js'), 'utf8');
  const cuerpo = home.slice(home.indexOf('function callToActions('), home.indexOf('async function fillSearcher'));
  assert.doesNotMatch(cuerpo, /\.slice\(/,
    'el renderer no puede recortar: cuantos entran lo decide el HTML, que es donde se ve');
});

test('🔴 siteUrl nunca devuelve un esquema peligroso, venga como venga el buttonLink', () => {
  // Es lo que le da derecho a estar en HREF_PERMITIDOS: el dato de la API no puede elegir el
  // protocolo. Mismos vectores que safeUrl, porque el sink es el mismo <a href>.
  for (const peligroso of [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', '  javascript:alert(1)', '\njavascript:alert(1)',
    'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'file:///etc/passwd',
  ]) {
    assert.equal(siteUrl(peligroso), '', `siteUrl dejo pasar ${JSON.stringify(peligroso)}`);
  }
  for (const vacio of ['', '   ', null, undefined]) {
    assert.equal(siteUrl(vacio), '', 'siteUrl invento un destino');
  }
});

test('siteUrl traduce las rutas del sitio Mapaprop a las paginas del kit', () => {
  // El vocabulario sale del template express-basic-1, que es con el que renderizan estas cuentas.
  assert.equal(siteUrl('/contacto'), 'contacto.html');
  assert.equal(siteUrl('/contacto/'), 'contacto.html', 'la barra final es la misma ruta');
  assert.equal(siteUrl('/destacados'), 'index.html');
  assert.equal(siteUrl('/desarrollos-inmobiliarios'), 'emprendimientos.html');
  assert.equal(siteUrl('/buscar/ventas/'), 'propiedades.html?operation=1');
  // Externa: viaja tal cual, validada.
  assert.equal(siteUrl('https://wa.me/5491155550101'), 'https://wa.me/5491155550101');
  // 🔴 Sin contraparte en el kit: vacio, NUNCA un link a una pagina que no existe. Medido en
  // produccion el 2026-11-11: `/pagina/creditos.` y `/contacto` daban 404 en el demo porque el
  // buttonLink viajaba crudo al href.
  assert.equal(siteUrl('/pagina/creditos.'), '');
  assert.equal(siteUrl('/blog'), '');
});
