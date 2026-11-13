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

// Cada seccion es un DIRECTORIO con su index.html (reforma del 2026-11-13), asi que el barrido de
// paginas no es un readdir plano. Vive aca y no dentro de un test porque lo usan varios: con una
// copia por test, el que no se actualiza mira una sola pagina y pasa por no mirar.
const paginasHtml = () => fs.readdirSync(PUBLIC, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory()
    ? (fs.existsSync(path.join(PUBLIC, e.name, 'index.html')) ? [`${e.name}/index.html`] : [])
    : (e.name.endsWith('.html') ? [e.name] : [])));

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
  assert.equal(isActive('/propiedades?operation=1', '/propiedades', search('operation=1')), true);
  assert.equal(isActive('/propiedades?operation=2', '/propiedades', search('operation=1')), false);
  assert.equal(isActive('/propiedades?operation=3', '/propiedades', search('operation=1')), false);
  // The plain listing is not any of the three operations.
  assert.equal(isActive('/propiedades?operation=1', '/propiedades', search('')), false);
  assert.equal(isActive('/', '/', search('')), true);
  assert.equal(isActive('/', '/contacto', search('')), false);

  // 🔴 Las TRES formas de la misma ruta prenden el mismo item. El `current` sale del pathname del
  // browser, y una pagina abierta como `/propiedades/` o `/propiedades/index.html` es la misma que
  // `/propiedades`: con la derivacion vieja (`pathname.split('/').pop()`) la primera daba cadena
  // vacia y caia en la home, asi que el menu marcaba Inicio estando en el listado.
  for (const forma of ['/propiedades', '/propiedades/', '/propiedades/index.html']) {
    assert.equal(isActive('/propiedades?operation=1', forma, search('operation=1')), true, forma);
  }
  assert.equal(isActive('/', '/index.html', search('')), true, 'la home por su index.html');
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
  // Rutas literales del propio kit: el dato entra por QUERY, no elige el destino. Desde la reforma
  // del 2026-11-13 las paginas son directorios, asi que la ruta arranca con `/`. La clase de
  // caracteres no admite `$` ni `{`, asi que un `/${algo}` NO entra por aca.
  /^`?\/[a-z0-9/._-]*(\?|`|$)/i,
  // Y el `.html` plano sigue aceptado: una pagina suelta al lado de index.html tambien es nuestra.
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

test('🔴 la home muestra el blog, y ARRIBA de emprendimientos', () => {
  // La posicion es la del template: express-basic-1 `home-page.php` incluye slider, searcher,
  // call-to-action-1, posts y DESPUES developments-home. El orden no es decorativo -- es el que el
  // dueno del sitio ya vio en basic.mapaprop.com -- y una seccion que existe pero cae al final de
  // la pagina se lee como "falta el blog", que es exactamente como se reporto.
  const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  const posts = html.indexOf('id="posts-section"');
  const developments = html.indexOf('id="developments-section"');
  const cta1 = html.indexOf('id="cta-1-wrap"');

  assert.ok(posts > 0, 'la home no declara la seccion del blog');
  assert.ok(html.includes('id="posts-home"'), 'la seccion existe pero no tiene donde renderizar');
  assert.ok(posts > cta1, 'el blog va DESPUES del primer call-to-action');
  assert.ok(posts < developments, 'el blog va ARRIBA de emprendimientos');
  assert.match(html.slice(posts, developments), /href="\/blog"/,
    'el encabezado tiene que linkear al blog completo: la home muestra 3 y el resto vive ahi');

  const home = fs.readFileSync(path.join(PUBLIC, 'js', 'home.js'), 'utf8');
  assert.match(home, /loadPosts\(\);/, 'nadie llama a loadPosts(): la seccion queda hidden para siempre');
});

test('🔴 la card de una nota se escribe UNA vez y las dos paginas la importan', () => {
  // El blog y la home tienen que mostrar la misma card. Con dos copias del markup, arreglar una
  // (el escapeHtml del titulo, el safeUrl de la tapa, la fecha) deja la otra como estaba, y la
  // diferencia no se ve hasta que alguien compara las dos paginas.
  for (const archivo of ['blog.js', 'home.js']) {
    const codigo = fs.readFileSync(path.join(PUBLIC, 'js', archivo), 'utf8');
    assert.match(codigo, /from '\.\/post-card\.js'/, `${archivo} no importa la card compartida`);
    assert.doesNotMatch(codigo, /post\.html\?url=/,
      `${archivo} arma el markup de la nota por su cuenta: va en post-card.js`);
  }
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
  assert.equal(siteUrl('/contacto'), '/contacto');
  assert.equal(siteUrl('/contacto/'), '/contacto', 'la barra final es la misma ruta');
  // Hasta el 2026-11-12 esto apuntaba a `index.html`: un placeholder puesto a proposito mientras la
  // pagina no existia, para no linkear a un 404. Ya existe, asi que el boton que la agencia
  // configuro en Mapaprop tiene que llegar a la vidriera y no a la home.
  assert.equal(siteUrl('/destacados'), '/destacados');
  // 🔴 El vocabulario NO es el mismo de los dos lados, y por eso la tabla sigue existiendo aunque
  // ahora las dos puntas usen rutas: alla es `/desarrollos-inmobiliarios`, aca `/emprendimientos`.
  assert.equal(siteUrl('/desarrollos-inmobiliarios'), '/emprendimientos');
  assert.equal(siteUrl('/buscar/ventas/'), '/propiedades?operation=1');
  // Externa: viaja tal cual, validada.
  assert.equal(siteUrl('https://wa.me/5491155550101'), 'https://wa.me/5491155550101');
  // 🔴 Sin contraparte en el kit: vacio, NUNCA un link a una pagina que no existe. Medido en
  // produccion el 2026-11-11: `/pagina/creditos.` y `/contacto` daban 404 en el demo porque el
  // buttonLink viajaba crudo al href.
  assert.equal(siteUrl('/pagina/creditos.'), '');
  // `/blog` SI tiene contraparte desde que el kit trae su pagina de blog.
  assert.equal(siteUrl('/blog'), '/blog');
});

test('🔴 todas las paginas declaran el favicon, y el archivo existe', () => {
  // Medido el 2026-11-11: no se veia ninguno. Son TRES huecos distintos y hacen falta los tres --
  // la API no manda `images.favicon` para la cuenta del demo, ninguna pagina declaraba
  // `<link rel="icon">`, y el repo no traia el archivo, asi que el browser pedia `/favicon.ico` y
  // recibia un 404. `brand.js` ya pisa el link cuando la cuenta SI subio uno: esto es la capa de
  // abajo, la que cierra el 404 -- la misma que websites-v3 llama "Layer 3: Mapaprop default".
  const paginas = paginasHtml();
  assert.ok(paginas.length >= 6, `el barrido encontro ${paginas.length} paginas`);
  const sinIcono = paginas.filter((f) => !/<link[^>]+rel="icon"/.test(
    fs.readFileSync(path.join(PUBLIC, f), 'utf8')));
  assert.deepEqual(sinIcono, [], 'estas paginas no declaran favicon');
  assert.ok(fs.existsSync(path.join(PUBLIC, 'favicon.svg')),
    'el link apunta a favicon.svg y el archivo no esta en el repo');
});

test('🔴 los destacados estan completos de punta a punta, no a medias', () => {
  // Las MISMAS cinco piezas que el blog, y por la misma razon: el 2026-11-12 el proxy ya tenia su
  // ruta y no habia ni pagina ni accion en el cliente, asi que `/destacados` daba 404 en el demo
  // mientras el sitio de la cuenta lo mostraba. Una pieza que falte deja la vidriera muda sin error.
  const proxy = fs.readFileSync(path.join(PUBLIC, '..', 'api', 'mp', '[...path].js'), 'utf8');
  assert.match(proxy, /match: \/\^featureds\$\//, 'el proxy no habilita los destacados');

  const api = fs.readFileSync(path.join(PUBLIC, 'js', 'api.js'), 'utf8');
  assert.match(api, /featureds: \(params\) => call\('featureds'/, 'el cliente no expone la accion');

  assert.ok(fs.existsSync(path.join(PUBLIC, 'destacados', 'index.html')),
    'falta destacados/index.html');

  const layout = fs.readFileSync(path.join(PUBLIC, 'js', 'layout.js'), 'utf8');
  assert.match(layout, /href: '\/destacados'/, 'no esta en el menu: nadie lo encuentra');

  // 🔴 Y la pieza propia de este caso: la home titula "Propiedades destacadas" y hasta hoy llenaba
  // ese bloque con `properties`, o sea las primeras de la cartera. Se ve identico en pantalla.
  const home = fs.readFileSync(path.join(PUBLIC, 'js', 'home.js'), 'utf8');
  assert.match(home, /api\.featureds\(/, 'la home dice "destacadas" y pide la cartera');
  assert.doesNotMatch(home, /loadFeatured[\s\S]*?api\.properties\(/, 'el bloque de destacadas sigue leyendo la cartera');
});

test('🔴 ninguna pagina referencia un asset con ruta relativa', () => {
  // Es EL modo de falla de la reforma a directorios (2026-11-13): desde `/propiedades/` un
  // `css/style.css` relativo busca `/propiedades/css/style.css`, da 404 y la pagina sale sin
  // estilos y sin JavaScript. Se ve roto de una, pero solo en las secciones -- la home, que quedo
  // en la raiz, sigue andando perfecto. O sea que mirar la home no alcanza para darse cuenta.
  for (const pagina of paginasHtml()) {
    const html = fs.readFileSync(path.join(PUBLIC, pagina), 'utf8');
    const relativos = [...html.matchAll(/(?:href|src)="(?!\/|https?:|mailto:|tel:|#)([^"]+)"/g)]
      .map((m) => m[1]);
    assert.deepEqual(relativos, [], `${pagina} referencia ${relativos.join(', ')}`);
  }
});

test('🔴 el arranque no muestra el diseno de respaldo, y nunca deja la pagina en blanco', () => {
  // Reportado por el owner el 2026-11-13: "muestra un diseno primero y luego lo cambia y queda
  // feo". La pagina nacia con la paleta y el nombre de config.js y repintaba cuando contestaban
  // `design` y `settings-v2`.
  const boot = fs.readFileSync(path.join(PUBLIC, 'js', 'boot.js'), 'utf8');
  assert.match(boot, /classList\.add\('is-booting'\)/, 'nadie marca el arranque');

  // 🔴 La red de seguridad, y no es opcional: quien saca la clase es un modulo que puede fallar al
  // cargar, y la API puede colgarse. Sin el timeout, un request lento deja el sitio EN BLANCO.
  assert.match(boot, /setTimeout\([\s\S]{0,160}remove\('is-booting'\)/,
    'falta el timeout que destapa la pagina si algo falla');

  // Tiene que ser un ARCHIVO y no un bloque inline: la CSP del kit no acepta inline, y lo bloquea
  // en silencio. Si algun dia la CSP aflojara, este test sobra -- por eso lo afirma.
  const csp = JSON.parse(fs.readFileSync(path.join(PUBLIC, '..', 'vercel.json'), 'utf8'))
    .headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
  assert.ok(!/script-src[^;]*unsafe-inline/.test(csp), 'la CSP acepta inline: revisar este test');

  // Y en el <head> de TODAS: un modulo (o un script al final del body) corre despues de que el
  // cuerpo se pinto, asi que el parpadeo sobreviviria al arreglo.
  for (const pagina of paginasHtml()) {
    const html = fs.readFileSync(path.join(PUBLIC, pagina), 'utf8');
    assert.match(html.split('</head>')[0], /<script src="\/js\/boot\.js"><\/script>/,
      `${pagina} no carga boot.js en el head`);
  }

  const css = fs.readFileSync(path.join(PUBLIC, 'css', 'style.css'), 'utf8');
  assert.match(css, /html\.is-booting body\s*\{[^}]*visibility:\s*hidden/,
    'el CSS no retiene el pintado');

  const layout = fs.readFileSync(path.join(PUBLIC, 'js', 'layout.js'), 'utf8');
  assert.match(layout, /classList\.remove\('is-booting'\)/,
    'nadie saca la clase cuando la marca ya esta aplicada');
});

test('🔴 el favicon tiene sus TRES capas, y la del medio es el LOGO de la cuenta', () => {
  // brand.js no se puede importar aca (lee `window.SITE_CONFIG` al cargar), asi que las capas se
  // verifican sobre el fuente. Son assertions de cableado, como las del blog.
  const brand = fs.readFileSync(path.join(PUBLIC, 'js', 'brand.js'), 'utf8');

  // Capa 1: el favicon que la cuenta subio.
  assert.match(brand, /brand\.favicon = usableImage\(d\.images\?\.favicon\)/,
    'nadie lee el favicon de la cuenta');

  // Capa 2: su LOGO cuando no subio favicon (decision del owner, 2026-11-12). Medido ese dia: la
  // cuenta del demo tiene `logo` y `logo.s3.ext` en website_config y NINGUNA fila de favicon, asi
  // que la capa 1 no alcanzaba nunca y se veia el icono neutro del kit.
  assert.match(brand, /if \(!brand\.favicon\) brand\.favicon = brand\.logo;/,
    'no cae al logo');

  // 🔴 Y el ORDEN importa: si el fallback corriera antes de resolver el logo de la API, tomaria el
  // de config.js y la cuenta veria el logo de respaldo en vez del suyo.
  assert.ok(brand.indexOf('brand.logo = usableImage(d.images?.logo)')
    < brand.indexOf('if (!brand.favicon) brand.favicon = brand.logo;'),
    'el fallback corre antes de resolver el logo de la cuenta');

  // El `type` del HTML declara el SVG del kit y el logo suele ser .png: no puede sobrevivir al swap.
  assert.match(brand, /icon\.removeAttribute\('type'\)/, 'el type del link queda mintiendo');
});

test('🔴 el blog esta completo de punta a punta, no a medias', () => {
  // Son CINCO piezas y una sola que falte deja el blog mudo sin error: la ruta en el proxy (sin
  // ella la API contesta NOT_ALLOWED), la accion en el cliente, las dos paginas, el link del menu
  // y el mapeo de `/blog`, que es a donde apunta el sitio Mapaprop de la cuenta. El bug original
  // fue exactamente esto: habia datos y no habia por donde leerlos.
  const proxy = fs.readFileSync(path.join(PUBLIC, '..', 'api', 'mp', '[...path].js'), 'utf8');
  assert.match(proxy, /match: \/\^posts\$\//, 'el proxy no habilita el listado del blog');
  assert.match(proxy, /match: \/\^posts\\\/\[/, 'el proxy no habilita el detalle de un post');

  const api = fs.readFileSync(path.join(PUBLIC, 'js', 'api.js'), 'utf8');
  assert.match(api, /posts: \(\) => call\('posts'\)/, 'el cliente no expone el listado');
  assert.match(api, /post: \(url\) =>/, 'el cliente no expone el detalle');

  for (const page of ['blog', 'post']) {
    assert.ok(fs.existsSync(path.join(PUBLIC, page, 'index.html')), `falta ${page}/index.html`);
  }

  const layout = fs.readFileSync(path.join(PUBLIC, 'js', 'layout.js'), 'utf8');
  assert.match(layout, /href: '\/blog'/, 'el blog no esta en el menu: nadie lo encuentra');
});

test('🔴 el cuerpo del post se inyecta crudo A PROPOSITO, y dice por que', () => {
  // `post.html` ES html: lo escribe la inmobiliaria en el editor de su panel, y el sitio de
  // Mapaprop lo imprime igual de crudo (`echo $posts->html` en customer-posts.php). Escaparlo
  // mostraria las etiquetas en pantalla en vez del texto -- o sea que el "arreglo" obvio rompe la
  // pagina sin que ningun test lo note.
  //
  // ⚠️ Lo que este test NO hace: barrer el kit buscando OTRAS inyecciones crudas. Se intento y el
  // heuristico no distingue esto de `innerHTML = brand.logo`, donde la variable ya trae html
  // armado con escapeHtml. Marcarlas a todas daba cuatro falsos positivos, asi que el test cubre
  // la decision deliberada y no promete una garantia que no puede dar.
  const codigo = fs.readFileSync(path.join(PUBLIC, 'js', 'post.js'), 'utf8');
  assert.match(codigo, /innerHTML = post\.html \|\| ''/,
    'el cuerpo del post dejo de inyectarse crudo: escapado se ven las etiquetas');
  const antes = codigo.slice(0, codigo.indexOf('innerHTML = post.html'));
  assert.ok(/🔴[^]{0,900}$/.test(antes),
    'la inyeccion cruda perdio el comentario que explica por que es deliberada');
});
