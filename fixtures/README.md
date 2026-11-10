# Fixtures

Respuestas **reales** de Mapaprop Express API, anonimizadas, para que el kit se pueda correr sin
token y sin backend:

```bash
npm run dev:mock      # http://localhost:3000
```

Un token de Mapaprop pertenece a una cuenta que paga. Sin estas fixtures, el que clona el repo puede
leer el código y nada más: no puede levantarlo, no puede ver su propio cambio y no puede saber si
rompió algo.

## De dónde salieron

| | |
|---|---|
| Capturadas el | **2026-11-10** |
| Entorno | **dev** (`http://localhost:8080/api/action/express-v1`) |
| Credencial | cliente OAuth `express-test`, scope `express-base` y nada más |
| Cuenta | la cuenta de pruebas de Mapaprop, sitio 329 |
| Cómo | una llamada HTTP por acción, guardando el cuerpo entero |

No están escritas a mano. Una fixture inventada tiene el aspecto de una medición y no lo es: el día
que la API cambie, la escrita a mano sigue diciendo lo que creíamos y la capturada no.

## Qué hay

| Archivo | Acción | Qué trae |
|---|---|---|
| `properties.json` | `GET properties` | 20 propiedades, la página completa |
| `property-detail.json` | `GET properties/{hash}` | el detalle: `branch`, `customer*`, planos |
| `developments.json` | `GET developments` | 5 emprendimientos con sus `developmentProperties` |
| `development-detail.json` | `GET properties/{hash}` | el detalle de un emprendimiento |
| `development-properties.json` | `GET development/properties` | las 6 unidades de uno |
| `types.json` · `operations.json` · `zones.json` · `branches.json` · `features.json` | catálogos | sólo lo que **esa cuenta** usa, no el catálogo del país |
| `settings-v2.json` · `design.json` | identidad y diseño | lo que pinta la marca |

## Qué se cambió, y qué no

**Se reemplazó** por datos de fantasía: nombre y razón social de la inmobiliaria, emails, teléfonos,
direcciones de sucursal, dirección de calle de cada propiedad, CUIT, redes sociales y las imágenes.
Las imágenes apuntan a `public/img/`, que vive en el repo —el modo mock no necesita internet—: las
fotos de las propiedades son `placeholder-1..4.svg`, el carrusel del inicio usa `hero-1..3.svg` (van
aparte porque la banda del hero no es 4:3 y recortar una foto de ficha ahí la amplía hasta que no se
entiende) y el logo es `logo-sample.svg`. **Ninguna lleva texto adentro**, a propósito: una imagen no
se traduce, y una que dijera "foto de ejemplo" quedaría en castellano con el sitio en inglés.
🔴 **Y los enlaces externos, que el primer barrido no miró porque sólo revisaba las descripciones**
(encontrado al auditar antes de publicar): `urlWebExternal` traía el **dominio de una inmobiliaria
real** y un artículo suelto; `videos[].source` traía el tour Matterport y el video de YouTube de esa
cuenta. Los cuatro se reemplazaron **conservando la forma**, que es lo que el kit tiene que
sobrevivir: `videoEmbed()` recibe cuatro formas distintas —watch de YouTube, shorts, un `<iframe>`
entero que la inmobiliaria pegó, y un tour Matterport— y la fixture las documenta. El video es
ahora Big Buck Bunny (Blender, CC-BY: embebible y libre de compartir, así que el demo muestra un
video que **anda**); el tour conserva el `<iframe>` con un id inventado y **no carga**, a propósito.

Las coordenadas se redondearon a 2 decimales —el tipo y la forma quedan, la casa exacta no—, y a las
descripciones se les sacaron los teléfonos, emails y URLs que la inmobiliaria había tipeado adentro.

🔴 **Y dos claves de integración**, que son lo más importante de esta lista: el response de
`settings-v2` incluye el **token de Mapbox** y la **site key de reCAPTCHA** de la cuenta. Son claves
publicables (el sitio las necesita en el navegador), pero son de una cuenta real y acá están
reemplazadas por un texto que dice dónde va la tuya.

**No se cambió** nada que sea la forma del contrato: las claves, los tipos, los nulls, los `0` que
significan "no informado", los floats del detalle, el árbol de zonas con sus `count`, los flags
comerciales (`sold`, `reserved`), `attributes[]` con su `label`, los hashes y los códigos.

## Lo que el mock NO emula (y por qué se dice acá)

Es un servidor de **formas**, no una segunda implementación de la API:

| | |
|---|---|
| `term` | matchea por substring. La relevancia, los acentos y el stemming son del backend |
| `cityId` | **se ignora**. Medido: la fila del listado trae `stateId` y `countyId` pero **no** `cityId`, así que no hay contra qué comparar. Ignorarlo es mejor que devolver una lista vacía, que se leería como un filtro roto |
| `propertyIds` | se sirve el juego capturado. Medido: las filas de `development/properties` **no traen `propertyId`** —los ids sólo existen en el `developmentProperties` del padre—, así que no se pueden correlacionar |
| `total` | se recalcula sobre la fixture en vez de repetir el 818 capturado: un paginador que ofrece 41 páginas con datos en una sola es peor que una lista corta y honesta |
| los POST | no salen de tu máquina. **No llegan a ningún CRM** |
| el carrusel del inicio | 🔴 **es el único lugar donde el mock es MÁS capaz que la API**, y está explicado abajo |

Lo que **sí** respeta es la allowlist: el mock importa el `findRoute` del proxy real, así que una
acción que el proxy no habilita tampoco la sirve el mock. Hay un solo borde, no dos.

### 🔴 El carrusel: la única licencia que se tomó el mock, y por qué

`design` devuelve las slides y el logo como **rutas relativas** (`/styles/…`), relativas al sitio
Mapaprop de esa cuenta. Y **ninguna acción de Express devuelve ese dominio** —`settings-v2` incluido—,
así que no hay contra qué resolverlas: desde el sitio del cliente esas rutas apuntan al sitio del
cliente y dan 404. Por eso `brand.js` sólo acepta URLs absolutas (`usableImage`), que es lo correcto:
mejor sin hero que con una imagen rota.

⇒ **Con datos reales el carrusel del inicio hoy no se puede usar**, y eso es una limitación medida de
la API, no del kit.

El mock reescribe esas rutas contra **su propio host** antes de responder, así que el demo muestra el
hero que el kit pintaría el día que la API devuelva una URL utilizable desde afuera. Es la única
diferencia deliberada entre el mock y la API, y está acá para que no se descubra tarde.

## Volver a capturar

Cuando la API cambie de forma, se recaptura — no se edita a mano:

```bash
# con un token de la cuenta en el entorno, nunca en un archivo que se commitee
for a in properties types operations zones branches features settings-v2 design developments; do
  curl -s -H "Authorization: Bearer $MAPAPROP_API_TOKEN" \
    "$MAPAPROP_API_BASE/$a" > raw/$a.json
done
```

Después se anonimiza con los criterios de arriba, **se verifica que cada archivo parsee** y se
revisan las claves antes de commitear: es un archivo en git, para siempre.

Las fixtures son además el insumo del test de contrato: comparar la forma de la respuesta viva
contra la fixture es lo que avisa que el contrato cambió.
