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

🔴 **`posts.json` y `post-detail.json` se capturaron el 2026-11-11 del sitio 891**, por el proxy
del demo público, en cuanto la ruta quedó habilitada: antes de eso no había forma de pedirlos. El
texto de las cuatro notas es de fantasía —lo escribe la inmobiliaria, igual que su nombre— pero la
**forma del cuerpo se conserva entera**, y es lo que importa: el HTML viene con `style=` inline en
cada párrafo, pegado desde un editor, así que el post no hereda la tipografía del sitio. Un cuerpo
de muestra escrito "limpio" habría escondido justo eso.

🔴 **`design.json` se recapturó el 2026-11-11, y del sitio 891, no del 329.** El 329 no tiene
configurado nada de la marca —los tres `callToActions` vienen `enabled: false` y sin texto, y
`typography`, `footer` y la mitad de `social` llegan vacíos—, así que el mock retrataba fielmente
**una cuenta recién creada**. Y eso choca con para qué existe: el que clona el repo tiene que ver el
sitio COMPLETO, y lo que no se dibuja en el mock no se puede estilar ni se descubre roto. El 891 es
la misma cuenta con la marca cargada, que es el sitio modelo de `express-basic-1`. La regla de acá
abajo no cambia: la forma sigue siendo capturada, lo que se reemplaza es el contenido.

No están escritas a mano. Una fixture inventada tiene el aspecto de una medición y no lo es: el día
que la API cambie, la escrita a mano sigue diciendo lo que creíamos y la capturada no.

## Qué hay

| Archivo | Acción | Qué trae |
|---|---|---|
| `properties.json` | `GET properties` | 20 propiedades, la página completa |
| `property-detail.json` | `GET properties/{hash}` | el detalle: `branch`, `customer*`, planos |
| `featureds.json` | `GET featureds` | 7 destacadas, en el orden de la agencia (a propósito distinto al de `properties.json`) |
| `developments.json` | `GET developments` | 5 emprendimientos con sus `developmentProperties` |
| `development-detail.json` | `GET properties/{hash}` | el detalle de un emprendimiento |
| `development-properties.json` | `GET development/properties` | las 6 unidades de uno |
| `posts.json` | `GET posts` | 4 notas del blog, **sin el cuerpo**: la API lo saca antes de responder |
| `post-detail.json` | `GET posts/{url}` | una nota con su `html` |
| `types.json` · `operations.json` · `zones.json` · `branches.json` · `features.json` | catálogos | sólo lo que **esa cuenta** usa, no el catálogo del país |
| `settings-v2.json` · `design.json` | identidad y diseño | lo que pinta la marca |

## Qué se cambió, y qué no

**Se reemplazó** por datos de fantasía: nombre y razón social de la inmobiliaria, emails, teléfonos,
direcciones de sucursal, dirección de calle de cada propiedad, CUIT, redes sociales y las imágenes.
Del `design` recapturado: el **texto de los tres call-to-action** (es copy que tipea la inmobiliaria,
igual que su nombre), el **número de WhatsApp** del tercero, la **matrícula del martillero** del pie
y las cuatro redes. Los `buttonLink` conservan el **vocabulario real** del sitio Mapaprop
(`/contacto`, `/destacados`) y NO se tradujeron a los `.html` del kit: traducirlos acá escondería que
la API manda rutas de otro sitio, que es justo lo que `siteUrl()` existe para resolver.
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
| el cuerpo de un post | hay **una** sola nota con `html`, y se sirve para cualquier slug. La metadata —título, portada, fecha, autor— **sí** es la del post pedido, así que la página se lee bien y lo único que se repite es la prosa. Misma convención que `property-detail` |
| `propertyIds` | se sirve el juego capturado. Medido: las filas de `development/properties` **no traen `propertyId`** —los ids sólo existen en el `developmentProperties` del padre—, así que no se pueden correlacionar |
| `total` | se recalcula sobre la fixture en vez de repetir el 818 capturado: un paginador que ofrece 41 páginas con datos en una sola es peor que una lista corta y honesta |
| los POST | no salen de tu máquina. **No llegan a ningún CRM** |
| el carrusel del inicio | 🔴 **es el único lugar donde el mock es MÁS capaz que la API**, y está explicado abajo |

Lo que **sí** respeta es el borde entero del proxy, no sólo una parte: el mock importa su
`findRoute`, así que una acción que el proxy no habilita tampoco la sirve el mock — y aplica también
la **proyección** de la ruta, así que `settings-v2` sale recortado igual que en producción. Si la
fixture se sirviera entera, el modo que más corre un colaborador escondería justamente la filtración
que la proyección cierra. Un solo borde, no dos.

### 🔴 El carrusel: la única licencia que se tomó el mock, y por qué

Las imágenes del mock apuntan a `public/img/`, que vive en el repo, y el mock las reescribe contra su
propio host antes de responder. Es deliberado y por una razón sola: **el modo mock no necesita
internet**. La fixture guarda rutas locales, no las absolutas que devolvió la cuenta capturada.

⚠️ **Y acá había una afirmación equivocada, corregida el 2026-11-11.** Este README decía que `design`
devuelve las imágenes como rutas relativas y que por eso *"con datos reales el carrusel hoy no se
puede usar"*. **Es verdad sólo a veces, y depende de la cuenta** —medido en `website_config` de
producción—:

| | sitio 329 | sitio 891 |
|---|---|---|
| `slide1.image` | `/styles/customers/1/slide1.jpg` | **la misma ruta relativa** |
| `slide1.s3.ext` | no existe | `.webp` |
| lo que devuelve `design` | la ruta cruda, inservible desde afuera | `https://images.mapaprop.app/website-images/1/891/slide1.webp` |

Los marcadores `*.s3.ext` son los que hacen que la API arme la URL absoluta. ⇒ en una cuenta con las
imágenes migradas a S3 **el carrusel anda con datos reales**, y se puede ver: el demo público corre
con el token del 891 y muestra el hero y el logo. En una cuenta sin migrar, no hay dominio contra el
cual resolver la ruta y `usableImage()` la descarta — que sigue siendo lo correcto: mejor sin hero
que con una imagen rota.

La lección de método, que es por lo que esto queda escrito: la limitación se dio por universal
habiendo medido **una sola cuenta**.

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
