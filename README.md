# Sitio inmobiliario con Mapaprop Express API

Un sitio web completo —inicio, buscador, fichas, emprendimientos, blog, contacto y captación de
propietarios— que lee tu cartera directamente de tu cuenta de Mapaprop. Es HTML y JavaScript, sin
framework y sin paso de compilación: lo abrís, lo editás y se ve el cambio.

No mantenés dos inventarios. Cargás la propiedad una vez en Mapaprop y el sitio la toma de ahí: las
fotos, el precio, los metros, las características y el estado. Si la vendés, el sitio lo refleja.

---

## Verlo andando en un minuto, sin cuenta y sin token

```bash
git clone https://github.com/Mapaprop/mapaprop-express-starter
cd mapaprop-express-starter
npm run dev:mock                  # http://localhost:3000
```

No hace falta nada más: no hay dependencias que instalar, no hay backend que levantar y no hace
falta un token. El sitio corre contra las **fixtures** de `fixtures/`, que son respuestas reales de
la API anonimizadas. Es la forma de mirarlo, de trabajar sobre el diseño y de mandar un cambio sin
ser cliente de Mapaprop.

Los formularios en modo mock **no envían nada a ningún lado**. El detalle de qué emula y qué no está
en [`fixtures/README.md`](fixtures/README.md).

---

## Qué necesitás antes de empezar

1. **Una cuenta de Mapaprop con plan Pro+, Business o Business Manager.** Son los planes que
   incluyen la API.
2. **El API Token activado.** Entrá a **Configuración → Token de API**, activalo y copialo con el
   botón de copiar. Es una sola vez.
3. **Un lugar donde publicarlo.** Mirá la sección de abajo: hay varias opciones y conviene elegir
   con la información completa.

No necesitás activar el scope `cors`: el sitio le habla a la API desde el servidor, no desde el
navegador.

---

## Dónde publicarlo

**Las dos formas de tomarlo.** Con el botón de Vercel, que copia el proyecto a tu cuenta y lo
deploya; o clonándolo y publicándolo donde quieras. En las dos, lo que queda es **tu copia**: no
está conectada a este repositorio y no recibe cambios nuestros. Cuando quieras traerte una mejora,
mirá [Cómo traer una mejora](#cómo-traer-una-mejora).

El sitio son archivos estáticos **más una función de servidor** —la que guarda el token y nunca se lo
muestra al navegador—. Así que no alcanza un hosting de archivos sueltos: hace falta un lugar que
ejecute esa función.

### Vercel — el camino más corto

Funciona tal cual, sin tocar nada.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMapaprop%2Fmapaprop-express-starter&env=MAPAPROP_API_TOKEN&envDescription=El%20API%20Token%20de%20tu%20cuenta%20de%20Mapaprop%20(Configuraci%C3%B3n%20%3E%20Token%20de%20API))

Vercel te pide el token durante el proceso y lo guarda como variable de entorno. Desde la terminal:

```bash
git clone https://github.com/Mapaprop/mapaprop-express-starter.git
cd mapaprop-express-starter
npx vercel
npx vercel env add MAPAPROP_API_TOKEN      # pegá el token cuando lo pida
npx vercel --prod
```

Si ya está publicado y querés cargar o cambiar el token: **Vercel → tu proyecto → Settings →
Environment Variables**, nombre `MAPAPROP_API_TOKEN`, valor el token. Después, un redeploy para que
lo tome.

> ⚠️ **El plan gratuito de Vercel (Hobby) es sólo para uso personal no comercial.** Vercel define
> como uso comercial, entre otros casos, *"publicitar la venta de un producto o servicio"* — y el
> sitio de una inmobiliaria entra ahí, así que corresponde el plan **Pro**. Lo dice en sus
> [pautas de uso](https://vercel.com/docs/limits/fair-use-guidelines), y la consecuencia que declara
> para quien lo incumple es pausar el deploy. Lo aclaramos acá para que no te enteres con el sitio
> caído.

### Tu propio servidor

También funciona tal cual. Es un servidor Node sin dependencias: lo levantás detrás de nginx o
Apache como cualquier otra aplicación.

```bash
MAPAPROP_API_TOKEN=tu-token PORT=3000 node dev-local.mjs
```

**Necesita Node 18 o más nuevo** — es el primero que trae `fetch`, que es con lo que el proxy le
habla a Mapaprop. El servidor lo chequea al arrancar y te lo dice; si el Node del sistema es viejo,
`nvm install 20 && nvm use 20` suele ser la salida más corta.

🔴 **Si va detrás de un reverse proxy, mandale `X-Real-IP`.** El kit usa la IP del visitante para
dos cosas: la manda a Mapaprop en la consulta (su antispam la puntúa) y limita cuántos envíos acepta
por minuto. Sin esa cabecera tiene que deducirla del `X-Forwarded-For`, **que el visitante también
puede mandar** — nginx agrega la real al final en vez de reemplazar, así que el kit lee el último
salto. Funciona, pero `X-Real-IP` es explícito y no depende de cómo esté armada la cadena:

```nginx
location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    client_max_body_size 8m;   # el formulario de captación manda adjuntos
}
```

Con ese bloque puesto, arrancá el kit con **`TRUST_X_REAL_IP=1`**. Es opt-in a propósito: el código
no puede saber si esa cabecera la escribió tu proxy o el visitante, así que **por defecto la
ignora** y usa el último salto del `X-Forwarded-For`, que lo agrega siempre tu propio borde. Si la
prefiriera sin preguntar, alcanzaría con que alguien mandara un `X-Real-IP` inventado en cada
pedido para volver al problema que esto resuelve.

**El tamaño del cuerpo tiene un techo**, porque sin él un solo envío puede ocupar toda la memoria
del proceso: 6 MB por defecto, configurable con `MAX_BODY_BYTES`. Si lo subís, subí también el
`client_max_body_size` de nginx — y al revés: el más chico de los dos es el que manda.

### Otras plataformas

**Netlify**, **Cloudflare Pages**, **AWS** y las demás también sirven, pero cada una tiene su propia
forma de declarar una función, así que hay que adaptar el envoltorio de `api/mp/[...path].js` a la
firma que pide la plataforma. La lógica no cambia: son unas veinte líneas alrededor.

Y antes de elegir, **revisá los términos del plan**: cada plataforma define distinto qué considera
uso comercial.

---

## Probarlo en tu máquina

```bash
npm run dev:mock                  # con fixtures: sin token y sin backend
cp .env.example .env.local        # y pegá tu token adentro
npm run dev                       # contra la API de verdad, http://localhost:3000
npm test                          # la suite, sin dependencias
```

> No alcanza con abrir `public/index.html` haciendo doble clic: el sitio necesita la función que
> agrega el token, y esa la levanta `npm run dev` (o `npm run dev:mock`).

---

## 🔴 Por qué el token no está en el JavaScript

Es la decisión de arquitectura más importante del proyecto y vale entenderla antes de cambiarla.

Tu cuenta tiene **un solo API Token**, y ese token lleva **todos los permisos que te da tu plan**. Si
tenés contratado el adicional **Property API**, el mismo token también puede **crear propiedades y
publicarlas en los portales**. Y **no vence nunca**.

Si lo pusiéramos en el JavaScript del sitio, cualquier visitante podría leerlo desde las
herramientas de desarrollo del navegador y quedarse con una credencial permanente de tu cuenta.

Por eso el token vive en una variable de entorno del servidor, y el navegador le habla a
`api/mp/[...path].js`, una función que corre del lado del servidor y es la única que lo conoce. Esa
función además:

- **sólo deja pasar las acciones que el sitio usa** (hay una lista explícita adentro). Esto no es
  prolijidad: sin esa lista, una ruta armada a mano podría llegar a otra API con tu token;
- **filtra el cuerpo de los dos formularios** contra la lista de campos que cada endpoint
  documenta. Lo que el visitante manda viaja a Mapaprop **con el token de tu cuenta**, así que vale
  el mismo argumento que la lista de rutas: una clave que no esté en la lista no sale;
- **recorta `settings-v2` a lo que el sitio usa.** Ese endpoint trae, además de tu nombre y tus
  datos de contacto, **tus datos fiscales** (el CUIT, la razón social, el domicilio fiscal) y las
  claves de Mapbox y reCAPTCHA de tu cuenta. Todo lo que la función devuelve lo puede leer
  cualquiera —se abre con `curl`, sin token— así que lo que el sitio no usa no sale;
- **completa la IP, el navegador y el referer** de cada consulta, tres datos que el endpoint de
  consultas necesita y que el navegador no puede saber de sí mismo;
- **cachea los catálogos** para no gastar llamadas de más.

Si vas a sumar un endpoint nuevo, agregá su fila en la lista `ROUTES` de esa función. Y si necesitás
un campo de `settings-v2` que hoy no sale, agregalo a `CUSTOMER_FIELDS`, a propósito: **pensá si ese
campo puede quedar publicado**, porque es exactamente lo que va a pasar.


### Las cabeceras de seguridad

`vercel.json` declara una **Content-Security-Policy** y tres cabeceras más, y el servidor Node las
lee **de ese mismo archivo** para servir las mismas: si vivieran sólo en `vercel.json`, la defensa
dependería de en qué plataforma desplegaste.

La CSP permite scripts **sólo del propio sitio** y enmarcar **sólo** YouTube, Vimeo, Matterport y
OpenStreetMap, que es lo que las fichas usan. Si sumás un proveedor de video o un mapa con clave,
agregalo a `frame-src`. Está verificada contra las 6 páginas: cero violaciones en consola.

---

## 🔴 Las consultas vuelven a tu CRM (y por qué importa)

El formulario de cada **ficha de propiedad** postea a `POST express-v1/messages`. Eso significa que
la consulta **entra a tu Inbox de Mapaprop como un lead**, igual que si hubiera llegado por tu sitio:
la asignás a un asesor, le hacés seguimiento, queda en tus reportes y dispara tus automatizaciones.

Si cambiás ese formulario por uno que te mande un email y nada más, el círculo se corta: seguís
cargando las propiedades en Mapaprop, pero atendés a los clientes afuera y la consulta no existe
para tu CRM. Es la mitad del sistema que ya estás pagando.

### La limitación honesta: la consulta genérica no tiene endpoint

`POST messages` **exige** el identificador de una propiedad publicada, así que una consulta que no
es sobre ninguna propiedad **no puede entrar al CRM por la API**. Por eso la página de contacto de
este sitio:

- muestra tus sucursales con teléfono, email y WhatsApp,
- empuja al visitante hacia las fichas, donde la consulta sí entra al CRM,
- y su formulario abre el programa de correo del visitante con el mensaje armado.

Lo que **sí** entra al CRM sin una propiedad de por medio es el formulario de **"Quiero vender o
alquilar"** (`seller-submissions`): crea un contacto en tu CRM y te manda un email con los adjuntos.

---

## Personalizarlo

### Los colores y el logo salen de tu cuenta

El sitio pide `GET express-v1/design` y toma de ahí **los colores, la tipografía, el logo, el
favicon, las imágenes del carrusel, los bloques de llamado a la acción, el responsable del pie y
tus redes sociales** — lo que ya configuraste en **Sitio Web → Diseño**. No hay que copiar nada.

**Los tres bloques de llamado a la acción** se reparten a lo largo del inicio: están como `cta-1`,
`cta-2` y `cta-3` en `public/index.html`, y si configuraste menos, los que sobran no se dibujan.
El botón de cada uno apunta a donde lo mandaste desde Mapaprop (`/contacto`, `/destacados`, …);
y el vocabulario no es el mismo de los dos lados —`/desarrollos-inmobiliarios` acá es
`/emprendimientos`, y `/buscar/ventas` es un filtro del listado—, así que `siteUrl()` en
`public/js/ui.js` traduce esas rutas. Una
ruta sin equivalente en el kit —`/pagina/…`, que es una página estática que el kit no tiene— manda
al formulario de contacto: querés un botón que lleve a algún lado, no uno que dé 404.

### El sitio aparece una sola vez, ya con tu diseño

Mientras `design` y `settings-v2` viajan, el documento lleva la clase `is-booting` y el cuerpo
queda retenido con un spinner (`public/js/boot.js` y el bloque *Arranque* de `css/style.css`).
Sin eso la página se dibuja con los colores de respaldo de `config.js` y repinta un instante
después con los tuyos, que es un parpadeo feo. Si algo falla o tarda, a los 2,5 segundos la página
aparece igual: preferimos un repintado a un sitio en blanco. Y en la segunda navegación no se ve
spinner, porque tu diseño ya está en caché.

### El blog sale del mismo lugar que el resto

Las notas son las que cargás en **Sitio Web → Blog** de Mapaprop: el sitio pide `GET
express-v1/posts` y `posts/{url}`. No hay un segundo lugar donde escribir.

El inicio muestra las **tres últimas** arriba de emprendimientos, con un enlace a `/blog`, que
lista todas. Si tu cuenta no tiene notas, esa sección no se dibuja: no queda un hueco vacío.

El listado llega **sin el cuerpo** —la API lo saca a propósito— así que la tarjeta muestra la
portada, el título y la fecha; el texto completo viaja sólo al abrir la nota. Y ese texto se inserta
**tal cual viene**: es HTML que escribiste vos en el editor, igual que lo imprime tu sitio de
Mapaprop. ⚠️ Si lo pegaste desde Word o desde otra página, suele traer sus propias fuentes y colores
en el `style=` de cada párrafo, así que esa nota no va a heredar la tipografía del sitio. Pasa lo
mismo en tu sitio de Mapaprop; se deja igual para no reescribir lo que publicaste.

**Si tu cuenta no tiene un sitio web activo de Mapaprop**, ese endpoint responde con un error y el
sitio usa lo que haya en `public/js/config.js`. Editá ese archivo con tu nombre, tus colores y tu
logo. Todo lo demás —propiedades, catálogos, sucursales, consultas— funciona igual, porque el
inventario no depende de tener un sitio.

| Qué querés cambiar | Dónde |
| --- | --- |
| Nombre, colores, logo y textos de respaldo | `public/js/config.js` |
| Estilos (tipografías, espaciados, tarjetas) | `public/css/style.css` |
| Los links del menú y el pie | `public/js/layout.js` |
| Cómo se ve una tarjeta de propiedad | la función `card()` en `public/js/ui.js` |
| Qué muestra la ficha | `public/js/ficha.js` |
| Los filtros del buscador | `public/propiedades/index.html` y `public/js/listado.js` |

### Una carpeta por sección, y por qué

Cada sección es una **carpeta con su `index.html`**: `public/propiedades/index.html` se sirve en
`tudominio.com/propiedades`. No hace falta configurar nada — Vercel, nginx, S3 y GitHub Pages
sirven el `index.html` de un directorio por sí solos, y cada uno escribe su regla de reescritura
distinto. Así la URL sale limpia en todos.

Importa si estás **migrando** desde tu sitio de Mapaprop: ahí tus páginas ya viven en
`/destacados`, `/contacto` y `/vender`, esas URLs están indexadas en Google y con esta estructura
siguen funcionando igual. Las tres formas llegan a la misma página (`/destacados`,
`/destacados/` y `/destacados/index.html`).

⚠️ Por eso los `href` de las páginas apuntan a la **raíz** (`/css/style.css`, `/js/home.js`): desde
`/propiedades/` un `css/style.css` relativo buscaría `/propiedades/css/style.css`.

### Agregar una página

Creá `public/<tu-seccion>/index.html` copiando cualquier otra, cambiale el contenido y agregá el
link en `LINKS`, dentro de `public/js/layout.js`.

---

## Los idiomas

Los textos del kit están en `public/js/i18n.js`, en **español, inglés y portugués**. No hay paso de
compilación: es un objeto y una función `t()`.

### El selector del header

El kit trae un selector **ES · EN · PT** arriba a la derecha. Lo que ofrece sale de `config.js`:

```js
languages: ['es', 'en', 'pt'],   // dejá uno solo (o ninguno) y el selector desaparece
```

La elección del visitante queda en su navegador (`localStorage`) y el link `?lang=en` abre la página
directo en ese idioma — sirve para compartir y es lo que hace que el selector funcione igual en una
ventana privada. Un código que no esté en `languages` se ignora, así que un link ajeno no puede
poner tu sitio en un idioma que no ofrecés.

⚠️ **Decidilo mirando tu catálogo.** El selector traduce lo que escribe el kit: menú, botones,
etiquetas, filtros. Lo que manda la API —el tipo, la operación, las características, las zonas y la
descripción— **viene en el idioma en que vos cargaste la cuenta y no se traduce**. Una página en
inglés sobre un catálogo cargado en castellano muestra `VENTA · DEPARTAMENTO`: es correcto y se ve
mezclado. A una inmobiliaria que le vende a extranjeros le conviene igual; a una que no, dejale un
solo idioma.

### Sin selector

Con un solo idioma configurado, sale del contexto en este orden:

1. `lang` en `public/js/config.js`, si lo pusiste.
2. El atributo `lang` del `<html>` de cada página.
3. Español.

```html
<html lang="en">     <!-- esta página sale en inglés -->
```

En los dos casos el kit deja el `<html lang>` sincronizado con el idioma que realmente escribió: si
quedara en `es`, le mentiría al lector de pantalla, al traductor del navegador y al buscador.

Una clave que falte en inglés o portugués **cae a español**. Es una degradación que se ve y no
rompe nada, así que podés sumar un idioma de a poco.

🔴 **Lo que el kit NO traduce, a propósito**: el tipo de propiedad, la operación, las características
y los nombres de zona **vienen de la API ya en el idioma de tu cuenta**. Traducirlos acá sería
sobrescribir tu propio vocabulario.

Y la moneda **nunca** sale del idioma: sale de cada propiedad (`currency`). Lo único que sigue al
idioma es cómo se agrupan los miles, y lo podés forzar con `numberLocale` en `config.js` —un sitio
en español de España agrupa distinto que uno de Argentina—.

Si traducís a un idioma nuevo: agregá su mapa en `i18n.js` con **las mismas claves** y corré
`npm test`. La suite falla si a un idioma le falta una clave, si una traducción perdió una variable
`{...}`, o si el texto de una página dejó de coincidir con el diccionario.

---

## Cómo está armado

```
.
├── api/mp/[...path].js    la función que agrega el token y filtra las acciones permitidas
├── dev-local.mjs          servidor Node que despacha a esa misma función
├── fixtures/              respuestas reales anonimizadas + el servidor del modo mock
├── public/
│   ├── index.html         inicio: carrusel, buscador, últimas novedades del blog,
│   │                      emprendimientos, destacadas, zonas, sucursales y los tres
│   │                      llamados a la acción
│   ├── destacados/index.html       la vidriera que armaste en Mapaprop, en SU orden
│   ├── propiedades/index.html      listado con filtros y paginado
│   ├── propiedad/index.html        ficha: galería, planos, videos, mapa y consulta
│   ├── emprendimientos/index.html
│   ├── blog/index.html             las notas de tu blog de Mapaprop
│   ├── post/index.html             una nota
│   ├── contacto/index.html
│   ├── vender/index.html           captación de propietarios, con adjuntos
│   ├── css/style.css
│   ├── img/               fotos e ilustraciones de ejemplo (sin texto: una imagen no se traduce)
│   └── js/
│       ├── config.js      tus datos de respaldo (lo primero que vas a editar)
│       ├── i18n.js        los textos en es / en / pt, y el selector de idioma
│       ├── api.js         el cliente que le habla a la función
│       ├── ui.js          helpers de render: precios, fotos, características, paginado
│       ├── brand.js       aplica el diseño de tu cuenta
│       ├── layout.js      menú y pie compartidos
│       └── …              un archivo por página
├── tests/                 131 tests, sin dependencias
├── LICENSE
├── SECURITY.md
├── vercel.json
└── package.json
```

---

## Cosas que conviene saber

| | |
| --- | --- |
| **20 propiedades por pedido** | Es el tope de la API. El listado pagina solo; no lo subas a 21, devuelve un error de validación. |
| **El 0 significa "no lo cargué"** | En varios campos opcionales (toilettes, pisos, expensas, impuestos) la API devuelve `0` cuando la inmobiliaria no informó el dato. El sitio los oculta en vez de mostrar "0 baños". |
| **Un precio en 0 o en 1 es "Consultar precio"** | No es un error de carga: es la forma de pedir que te contacten. El sitio lo muestra así. |
| **Los borradores no se publican** | La API devuelve sólo propiedades publicadas. |
| **Las vendidas y alquiladas sí vienen** | Con su estado, y el sitio las muestra con su etiqueta. Si no las querés mostrar, filtralas en `listado.js`. |
| **El token no vence** | Pero si lo regenerás, el anterior deja de funcionar al instante: actualizá la variable de entorno y volvé a desplegar. |
| **Si das de baja el plan** | El token se desactiva y el sitio deja de traer propiedades. |
| **Adjuntos de "Vender"** | 2 MB por archivo y 10 MB de bandwidth por hora, de la API. ⚠️ **El límite que de verdad corta es el del total**: los adjuntos viajan en base64, que infla ~33%, así que dos archivos de 2 MB son ~5,3 MB de cuerpo. El kit los rechaza antes de enviarlos si juntos superan el techo del runtime más chico (`MAX_PAYLOAD_CHARS` en `vender.js`), con un mensaje que dice que el problema es el total. Y por el mismo motivo, **los 10 envíos por hora son inalcanzables si llevan adjuntos**: el cuello es el bandwidth, no la cantidad. |
| **"Vender" necesita un sitio atado al token** | Si te da un aviso, atalo en **Configuración → Token de API**, tarjeta **Función Sitio Web**. |

---

## Cómo traer una mejora

Tu copia no se actualiza sola, y es a propósito: lo que publicaste no cambia porque nosotros hayamos
cambiado algo acá. El repositorio es el único lugar donde mirar qué se movió desde que lo bajaste —
[los commits](https://github.com/Mapaprop/mapaprop-express-starter/commits/main) dicen qué cambió y
cuándo, y si querés que te avise, **Watch → Custom** en GitHub.

**Si lo clonaste con `git clone`**, este repositorio ya es tu `origin`:

```bash
git fetch origin
git log --oneline HEAD..origin/main      # qué hay de nuevo
git diff HEAD..origin/main               # qué cambia exactamente
git merge origin/main                    # traerlo
```

Si editaste los mismos archivos que tocamos nosotros, el merge te va a pedir resolver el conflicto.
Es lo único que cuesta trabajo acá, y se evita mirando el `git diff` antes de mergear.

**Si lo trajiste con el botón de Vercel**, tu repositorio es una copia independiente. Agregá este
como un remoto más:

```bash
git remote add mapaprop https://github.com/Mapaprop/mapaprop-express-starter.git
git fetch mapaprop
git diff HEAD..mapaprop/main
```

Si Git no reconoce las dos historias como la misma, el `merge` no te va a servir: copiá el archivo
que te interesa y commiteálo. Para uno o dos archivos es más corto que pelearse con las historias.

Y si no querés traer nada, no traigas nada: tu sitio sigue funcionando igual.

---

## Documentación

- [El manual de este sitio](https://help.mapaprop.com/es/api/express-api/cliente-de-referencia) — de cero a desplegado, el mapa del código y por qué el token va del lado del servidor
- [Primeros pasos con la API](https://help.mapaprop.com/es/api/getting-started)
- [Express API: las 21 acciones](https://help.mapaprop.com/es/api/express-api)
- [Constantes (tipos, operaciones, estados)](https://help.mapaprop.com/es/api/getting-started/constants)

¿Dudas o algo que no funciona? Escribinos a [info@mapaprop.com](mailto:info@mapaprop.com).

---

## Licencia

MIT. Usalo, cambialo y publicalo como quieras.
